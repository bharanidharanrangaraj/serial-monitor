/**
 * Serial Monitor — Main Server
 * Entry point: Express + WebSocket + Static files
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const express = require('express');
const { WebSocketServer } = require('ws');

const serialManager = require('./src/serial-manager');
const wsHandler = require('./src/ws-handler');
const apiRoutes = require('./src/api-routes');
const authMiddleware = require('./src/auth-middleware');
const pluginLoader = require('./src/plugin-loader');

const app = express();
const PORT = process.env.PORT || 3000;


// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional authentication
if (process.env.AUTH_ENABLED === 'true') {
    app.use(authMiddleware);
    console.log('Authentication enabled');
}

// Shutdown endpoint (must be before static middleware)
app.post('/api/shutdown', async (req, res) => {
    console.log('\n⏹  Shutdown requested from UI...');
    res.json({ success: true, message: 'Server shutting down...' });
    setTimeout(async () => {
        await gracefulShutdown('UI_SHUTDOWN');
    }, 500);
});

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// REST API
app.use('/api', apiRoutes);

// --- Create HTTP(S) server ---
let server;
if (process.env.TLS_ENABLED === 'true' && process.env.TLS_CERT && process.env.TLS_KEY) {
    const certPath = path.resolve(process.env.TLS_CERT);
    const keyPath = path.resolve(process.env.TLS_KEY);
    server = https.createServer({
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
    }, app);
    console.log('🔐 TLS enabled');
} else {
    server = http.createServer(app);
}

// --- WebSocket server ---
const wss = new WebSocketServer({ server, path: '/ws' });
wsHandler.init(wss, serialManager);

// --- Load plugins ---
pluginLoader.loadAll();
console.log(`🔌 Loaded ${pluginLoader.getAll().length} protocol decoder(s)`);

// --- Ensure data directory exists ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}



// --- Start ---
server.listen(PORT, () => {
    const proto = process.env.TLS_ENABLED === 'true' ? 'https' : 'http';
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║        ⚡ Serial Monitor v1.0.0 ⚡           ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  URL:  ${proto}://localhost:${PORT}`.padEnd(47) + '║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
});

// --- Graceful shutdown: release all serial ports ---
async function gracefulShutdown(signal) {
    console.log(`\n  ${signal} received — closing all serial ports...`);
    serialManager.stopPortPolling();
    for (const [channelId] of serialManager.connections) {
        try {
            await serialManager.disconnect(channelId);
            console.log(`  ✓ Closed channel: ${channelId}`);
        } catch (e) {
            console.error(`  ✗ Error closing ${channelId}:`, e.message);
        }
    }
    console.log('✓ All ports released. Exiting.');
    process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('exit', () => {
    serialManager.stopPortPolling();
});
