/**
 * WebSocket Handler — Multi-channel bridge between browser tabs and serial ports
 * Each front-end tab has a channelId; messages are routed to the correct serial connection.
 */
const pluginLoader = require('./plugin-loader');

let wss = null;
let serialManager = null;

/**
 * Initialize WebSocket server
 */
function init(wsServer, serial) {
    wss = wsServer;
    serialManager = serial;

    // ── Serial events (scoped per channel) ──

    serialManager.on('line', (channelId, entry) => {
        const decoded = pluginLoader.decodeAll(Buffer.from(entry.data));
        const msg = {
            type: 'serial:data',
            channelId,
            payload: entry,
            decoded: decoded.length > 0 ? decoded : undefined
        };
        broadcast(msg);
    });

    serialManager.on('raw-data', (channelId, rawBuffer) => {
        broadcast({
            type: 'serial:raw',
            channelId,
            hex: rawBuffer.toString('hex'),
            timestamp: Date.now()
        });
    });

    serialManager.on('connected', (channelId, config) => {
        broadcast({ type: 'serial:status', channelId, status: 'connected', config });
    });

    serialManager.on('disconnected', (channelId) => {
        broadcast({ type: 'serial:status', channelId, status: 'disconnected' });
    });

    serialManager.on('error', (channelId, errMsg) => {
        broadcast({ type: 'serial:error', channelId, error: errMsg });
    });

    // ── Port auto-detection ──

    serialManager.on('ports-changed', (ports) => {
        broadcast({ type: 'ports:updated', ports });
    });

    // Start polling for new ports every 2 seconds
    serialManager.startPortPolling(2000);

    // ── WebSocket connections ──

    wss.on('connection', (ws) => {
        console.log('🌐 WebSocket client connected');

        // Send loaded plugins list
        ws.send(JSON.stringify({
            type: 'plugins:list',
            plugins: pluginLoader.getAll().map(p => ({ name: p.name, description: p.description }))
        }));

        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                handleMessage(ws, msg);
            } catch (e) {
                ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
            }
        });

        ws.on('close', () => {
            console.log('🌐 WebSocket client disconnected');
        });

        // Heartbeat
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });
    });

    // Heartbeat interval
    setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);
}

/**
 * Handle incoming WS messages — each message includes channelId to scope the action
 */
async function handleMessage(ws, msg) {
    const channelId = msg.channelId || 'default';

    switch (msg.type) {
        case 'serial:connect':
            try {
                const config = await serialManager.connect(channelId, msg.config);
                ws.send(JSON.stringify({ type: 'serial:status', channelId, status: 'connected', config }));
            } catch (e) {
                ws.send(JSON.stringify({ type: 'serial:error', channelId, error: e.message }));
            }
            break;

        case 'serial:disconnect':
            await serialManager.disconnect(channelId);
            break;

        case 'serial:send':
            try {
                serialManager.send(channelId, msg.data, msg.mode || 'ascii');
            } catch (e) {
                ws.send(JSON.stringify({ type: 'serial:error', channelId, error: e.message }));
            }
            break;

        case 'serial:clear':
            serialManager.clearBuffer(channelId);
            broadcast({ type: 'serial:cleared', channelId });
            break;

        case 'serial:getStatus':
            ws.send(JSON.stringify({
                type: 'serial:status',
                channelId,
                ...serialManager.getStatus(channelId)
            }));
            break;

        case 'channel:remove':
            await serialManager.removeChannel(channelId);
            break;

        default:
            ws.send(JSON.stringify({ type: 'error', error: `Unknown message type: ${msg.type}` }));
    }
}

/**
 * Broadcast message to all connected WS clients
 */
function broadcast(data) {
    if (!wss) return;
    const json = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(json);
        }
    });
}

module.exports = { init, broadcast };
