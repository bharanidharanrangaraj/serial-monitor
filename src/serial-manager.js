/**
 * Serial Manager — Multi-connection serial port manager
 * Supports multiple simultaneous serial connections, keyed by channelId
 */
let SerialPort, ReadlineParser;
let serialportAvailable = true;

try {
    const sp = require('serialport');
    SerialPort = sp.SerialPort;
    ReadlineParser = require('@serialport/parser-readline').ReadlineParser;
} catch (e) {
    serialportAvailable = false;
    console.warn('⚠️  serialport package not available — running in UI-only mode');
}

const EventEmitter = require('events');

class SerialConnection {
    constructor(channelId) {
        this.channelId = channelId;
        this.port = null;
        this.parser = null;
        this.config = null;
        this.connected = false;
        this.stats = {
            bytesRx: 0,
            bytesTx: 0,
            linesRx: 0,
            linesTx: 0,
            errors: 0,
            connectedAt: null
        };
        this.MAX_BUFFER_LINES = 10_000_000;
        this.buffer = [];
        this.bufferIndex = 0;
    }

    getStatus() {
        return {
            channelId: this.channelId,
            connected: this.connected,
            config: this.config,
            stats: { ...this.stats },
            bufferSize: this.buffer.length
        };
    }

    _addToBuffer(entry) {
        if (this.buffer.length >= this.MAX_BUFFER_LINES) {
            this.buffer.shift();
        }
        this.buffer.push(entry);
    }
}

class SerialManager extends EventEmitter {
    constructor() {
        super();
        /** @type {Map<string, SerialConnection>} */
        this.connections = new Map();

        // Port auto-detection
        this._lastPortPaths = [];
        this._portPollInterval = null;
    }

    /**
     * List available serial ports
     */
    async listPorts() {
        if (!serialportAvailable) return [];
        try {
            const ports = await SerialPort.list();
            return ports.map(p => ({
                path: p.path,
                manufacturer: p.manufacturer || '',
                serialNumber: p.serialNumber || '',
                vendorId: p.vendorId || '',
                productId: p.productId || '',
                friendlyName: p.friendlyName || p.path
            }));
        } catch (err) {
            console.error('Error listing ports:', err.message);
            return [];
        }
    }

    /**
     * Start auto-detecting port changes
     * Polls every 2 seconds and emits 'ports-changed' when the list changes
     */
    startPortPolling(intervalMs = 2000) {
        if (this._portPollInterval) return;
        this._portPollInterval = setInterval(async () => {
            try {
                const ports = await this.listPorts();
                const currentPaths = ports.map(p => p.path).sort().join(',');
                const prevPaths = this._lastPortPaths.sort().join(',');

                if (currentPaths !== prevPaths) {
                    this._lastPortPaths = ports.map(p => p.path);
                    this.emit('ports-changed', ports);
                }
            } catch (e) {
                // Ignore poll errors
            }
        }, intervalMs);
    }

    stopPortPolling() {
        if (this._portPollInterval) {
            clearInterval(this._portPollInterval);
            this._portPollInterval = null;
        }
    }

    /**
     * Get or create a connection for a channelId
     */
    getConnection(channelId) {
        if (!this.connections.has(channelId)) {
            this.connections.set(channelId, new SerialConnection(channelId));
        }
        return this.connections.get(channelId);
    }

    /**
     * Connect a channel to a serial port
     * @param {string} channelId
     * @param {Object} config - { path, baudRate, dataBits, stopBits, parity, flowControl }
     */
    async connect(channelId, config) {
        if (!serialportAvailable) {
            throw new Error('serialport package not installed. Run: npm install serialport');
        }

        const conn = this.getConnection(channelId);

        // Disconnect if already connected
        if (conn.connected) {
            await this.disconnect(channelId);
        }

        const portConfig = {
            path: config.path,
            baudRate: parseInt(config.baudRate) || 115200,
            dataBits: parseInt(config.dataBits) || 8,
            stopBits: parseFloat(config.stopBits) || 1,
            parity: config.parity || 'none',
            rtscts: config.flowControl === 'rtscts',
            xon: config.flowControl === 'xon/xoff',
            xoff: config.flowControl === 'xon/xoff',
            autoOpen: false
        };

        return new Promise((resolve, reject) => {
            conn.port = new SerialPort(portConfig);

            conn.port.on('error', (err) => {
                conn.stats.errors++;
                this.emit('error', channelId, err.message);
            });

            conn.port.open((err) => {
                if (err) {
                    conn.connected = false;
                    return reject(new Error(`Failed to open port: ${err.message}`));
                }

                conn.config = portConfig;
                conn.connected = true;
                conn.stats.connectedAt = Date.now();
                conn.stats.bytesRx = 0;
                conn.stats.bytesTx = 0;
                conn.stats.linesRx = 0;
                conn.stats.linesTx = 0;
                conn.stats.errors = 0;

                // Raw data listener
                conn.port.on('data', (data) => {
                    conn.stats.bytesRx += data.length;
                    this.emit('raw-data', channelId, data);
                });

                // Line parser
                conn.parser = conn.port.pipe(new ReadlineParser({
                    delimiter: '\n',
                    includeDelimiter: false
                }));
                conn.parser.on('data', (line) => {
                    conn.stats.linesRx++;
                    const entry = {
                        timestamp: Date.now(),
                        direction: 'rx',
                        data: line,
                        index: conn.bufferIndex++,
                        channelId
                    };
                    conn._addToBuffer(entry);
                    this.emit('line', channelId, entry);
                });

                this.emit('connected', channelId, portConfig);
                resolve(portConfig);
            });
        });
    }

    /**
     * Disconnect a channel from its serial port
     */
    async disconnect(channelId) {
        const conn = this.connections.get(channelId);
        if (!conn) return;

        return new Promise((resolve) => {
            if (!conn.port || !conn.connected) {
                conn.connected = false;
                resolve();
                return;
            }
            conn.port.close((err) => {
                if (err) console.error(`Disconnect error [${channelId}]:`, err.message);
                conn.connected = false;
                conn.port = null;
                conn.parser = null;
                conn.config = null;
                this.emit('disconnected', channelId);
                resolve();
            });
        });
    }

    /**
     * Send data through a channel
     */
    send(channelId, data, mode = 'ascii') {
        const conn = this.connections.get(channelId);
        if (!conn || !conn.port || !conn.connected) {
            throw new Error('Not connected to any serial port on this channel');
        }

        let buffer;
        switch (mode) {
            case 'hex':
                const hexStr = data.replace(/\s+/g, '');
                buffer = Buffer.from(hexStr, 'hex');
                break;
            case 'binary':
                const bits = data.replace(/\s+/g, '');
                const bytes = [];
                for (let i = 0; i < bits.length; i += 8) {
                    bytes.push(parseInt(bits.substring(i, i + 8), 2));
                }
                buffer = Buffer.from(bytes);
                break;
            case 'ascii':
            default:
                buffer = Buffer.from(data + '\n', 'utf-8');
                break;
        }

        conn.port.write(buffer, (err) => {
            if (err) {
                conn.stats.errors++;
                this.emit('error', channelId, `Send error: ${err.message}`);
                return;
            }
            conn.stats.bytesTx += buffer.length;
            conn.stats.linesTx++;
            const entry = {
                timestamp: Date.now(),
                direction: 'tx',
                data: data,
                mode: mode,
                index: conn.bufferIndex++,
                channelId
            };
            conn._addToBuffer(entry);
            this.emit('line', channelId, entry);
        });
    }

    /**
     * Get buffer for a channel
     */
    getBuffer(channelId, start = 0, count) {
        const conn = this.connections.get(channelId);
        if (!conn) return [];
        if (count === undefined) return conn.buffer.slice(start);
        return conn.buffer.slice(start, start + count);
    }

    /**
     * Clear buffer for a channel
     */
    clearBuffer(channelId) {
        const conn = this.connections.get(channelId);
        if (conn) {
            conn.buffer = [];
            conn.bufferIndex = 0;
        }
    }

    /**
     * Get status for a channel
     */
    getStatus(channelId) {
        if (channelId) {
            const conn = this.connections.get(channelId);
            return conn ? conn.getStatus() : {
                channelId,
                connected: false,
                config: null,
                stats: { bytesRx: 0, bytesTx: 0, linesRx: 0, linesTx: 0, errors: 0, connectedAt: null },
                bufferSize: 0
            };
        }
        // Return summary of all connections
        const channels = {};
        for (const [id, conn] of this.connections) {
            channels[id] = conn.getStatus();
        }
        return { channels, serialportAvailable };
    }

    /**
     * Remove a channel entirely
     */
    async removeChannel(channelId) {
        await this.disconnect(channelId);
        this.connections.delete(channelId);
    }
}

module.exports = new SerialManager();
