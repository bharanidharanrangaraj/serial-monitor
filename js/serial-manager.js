/**
 * SerialManager - Frontend Web Serial API wrapper
 * Handles multiple simultaneous port connections (multi-channel).
 */

class SerialManager {
    constructor() {
        this.ports = new Map(); // channelId -> active connection data
        this.channelCounter = 0;

        // Event callbacks meant to be overridden by App.js
        this.onData = (channelId, entry, decoded) => { };
        this.onStatus = (channelId, statusObj) => { };
        this.onError = (channelId, error) => { };
        this.onPortsUpdated = (portsList) => { };

        // Listen for hardware plug/unplug events
        if (navigator.serial) {
            navigator.serial.addEventListener('connect', (e) => this._refreshAuthorizedPorts());
            navigator.serial.addEventListener('disconnect', (e) => {
                const port = e.target;
                const channelId = this._findChannelForPort(port);
                if (channelId) {
                    this.disconnect(channelId);
                }
                this._refreshAuthorizedPorts();
            });
        }
    }

    isSupported() {
        return 'serial' in navigator;
    }

    async init() {
        if (!this.isSupported()) {
            console.error('Web Serial API is not supported in this browser.');
            return;
        }
        await this._refreshAuthorizedPorts();
    }

    // ═══════════ Port Discovery ═══════════
    async _refreshAuthorizedPorts() {
        try {
            const ports = await navigator.serial.getPorts();
            const portList = ports.map((p, i) => {
                const info = p.getInfo();
                return {
                    id: `port-${i}`,
                    vid: info.usbVendorId,
                    pid: info.usbProductId,
                    portRef: p // Store the actual port reference privately within the manager
                };
            });

            // Notify app about previously authorized ports so the UI can populate
            this.onPortsUpdated(portList);
        } catch (e) {
            console.error('Failed to list authorized ports:', e);
        }
    }

    // Prompts user to select a new port
    async requestNewPort() {
        try {
            await navigator.serial.requestPort();
            // User selected a port, it's now authorized. Refresh the list.
            await this._refreshAuthorizedPorts();
            return true;
        } catch (e) {
            console.warn('User canceled port selection or error:', e);
            return false;
        }
    }

    // ═══════════ Connection Management ═══════════
    async connect(channelId, portConfig) {
        if (this.ports.has(channelId)) {
            await this.disconnect(channelId);
        }

        try {
            const ports = await navigator.serial.getPorts();
            // Match based on id from our list, or just grab the first available if not strict
            const port = portConfig.portRef || ports.find(p => {
                const info = p.getInfo();
                return `port-${ports.indexOf(p)}` === portConfig.path;
            });

            if (!port) {
                throw new Error("Port not found or not authorized. Please click 'Connect New Port'.");
            }

            // Optional parameters
            const baudRate = portConfig.baudRate || 115200;
            const dataBits = parseInt(portConfig.dataBits) || 8;
            const stopBits = parseInt(portConfig.stopBits) || 1;
            const parity = portConfig.parity === 'none' ? 'none' : (portConfig.parity || 'none');
            const flowControl = portConfig.flowControl === 'hardware' ? 'hardware' : 'none';

            await port.open({
                baudRate,
                dataBits,
                stopBits,
                parity,
                flowControl
            });

            const connData = {
                port,
                reader: null,
                writer: null,
                keepReading: true,
                decoderInfo: portConfig.decoderSelect,
                channelId,
                lineBuffer: ''
            };

            this.ports.set(channelId, connData);

            this.onStatus(channelId, { status: 'connected', config: portConfig });

            // Start the read loop
            this._startReadLoop(channelId);

            return true;
        } catch (e) {
            this.onError(channelId, e.message);
            this.onStatus(channelId, { status: 'disconnected' });
            return false;
        }
    }

    async disconnect(channelId) {
        const connData = this.ports.get(channelId);
        if (!connData) return;

        connData.keepReading = false;

        try {
            if (connData.reader) {
                await connData.reader.cancel();
            }
            if (connData.writer) {
                connData.writer.releaseLock();
            }
            await connData.port.close();
        } catch (e) {
            console.error('Error closing port:', e);
        }

        this.ports.delete(channelId);
        this.onStatus(channelId, { status: 'disconnected' });
    }

    _findChannelForPort(port) {
        for (const [channelId, connData] of this.ports.entries()) {
            if (connData.port === port) return channelId;
        }
        return null;
    }

    // ═══════════ Reading ═══════════
    async _startReadLoop(channelId) {
        const connData = this.ports.get(channelId);
        if (!connData) return;

        while (connData.port.readable && connData.keepReading) {
            connData.reader = connData.port.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await connData.reader.read();
                    if (done) break;

                    if (value && value.length > 0) {
                        this._processIncomingData(channelId, value);
                    }
                }
            } catch (error) {
                this.onError(channelId, error.message);
            } finally {
                connData.reader.releaseLock();
            }
        }
    }

    _processIncomingData(channelId, buffer) {
        const connData = this.ports.get(channelId);
        if (!connData) return;

        // Decoders process raw binary fragments
        let decodedChunks = [];
        if (connData.decoderInfo && window.Plugins) {
            const plugin = window.Plugins[connData.decoderInfo];
            if (plugin && plugin.processRx) {
                try {
                    decodedChunks = plugin.processRx(buffer);
                } catch (e) {
                    console.error('Decoder error:', e);
                }
            }
        }

        // Convert fragment to text
        const textDecoder = new TextDecoder('utf-8', { fatal: false });
        const textValue = textDecoder.decode(buffer);
        connData.lineBuffer += textValue;

        // Extract complete lines separated by \n
        let newlineIdx;
        while ((newlineIdx = connData.lineBuffer.indexOf('\n')) !== -1) {
            let line = connData.lineBuffer.substring(0, newlineIdx);
            if (line.endsWith('\r')) {
                line = line.substring(0, line.length - 1);
            }
            connData.lineBuffer = connData.lineBuffer.substring(newlineIdx + 1);

            const entry = {
                timestamp: Date.now(),
                direction: 'rx',
                data: line,
                raw: [] // Line-based raw mapping omitted for pure ASCII terminal
            };

            this.onData(channelId, entry, decodedChunks);
            decodedChunks = []; // pass decodes only on the first line of the chunk
        }

        // Force flush if buffer gets too large (e.g., missing newlines)
        if (connData.lineBuffer.length > 5000) {
            const entry = {
                timestamp: Date.now(),
                direction: 'rx',
                data: connData.lineBuffer,
                raw: []
            };
            this.onData(channelId, entry, decodedChunks);
            connData.lineBuffer = '';
        }
    }

    // ═══════════ Writing ═══════════
    async send(channelId, payload, mode) {
        const connData = this.ports.get(channelId);
        if (!connData || !connData.port.writable) {
            this.onError(channelId, 'Port is not writable or not connected.');
            return false;
        }

        let uint8Array;

        switch (mode) {
            case 'hex':
                const cleanHex = payload.replace(/\s+/g, '');
                if (cleanHex.length % 2 !== 0) {
                    this.onError(channelId, 'Invalid HEX string (odd number of characters).');
                    return false;
                }
                uint8Array = new Uint8Array(cleanHex.length / 2);
                for (let i = 0; i < cleanHex.length; i += 2) {
                    uint8Array[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
                }
                break;
            case 'bin':
                const cleanBin = payload.replace(/\s+/g, '');
                uint8Array = new Uint8Array(Math.ceil(cleanBin.length / 8));
                for (let i = 0; i < cleanBin.length; i += 8) {
                    const byteStr = cleanBin.substring(i, Math.min(i + 8, cleanBin.length));
                    uint8Array[i / 8] = parseInt(byteStr.padEnd(8, '0'), 2);
                }
                break;
            case 'ascii':
            default:
                const textEncoder = new TextEncoder();
                // Replace escaped newlines if needed, or just append standard CRLF
                let formatted = payload;
                if (!formatted.endsWith('\r\n') && !formatted.endsWith('\n')) {
                    formatted += '\r\n'; // default to CRLF for standard serial
                }
                uint8Array = textEncoder.encode(formatted);
                break;
        }

        connData.writer = connData.port.writable.getWriter();
        try {
            await connData.writer.write(uint8Array);

            // Echo back to UI
            const entry = {
                timestamp: Date.now(),
                direction: 'tx',
                data: mode === 'ascii' ? payload : `[${mode.toUpperCase()}] ${payload}`,
                raw: Array.from(uint8Array)
            };
            this.onData(channelId, entry, []);

            return true;
        } catch (e) {
            this.onError(channelId, 'Failed to write: ' + e.message);
            return false;
        } finally {
            connData.writer.releaseLock();
        }
    }
}

window.SerialManager = new SerialManager();
