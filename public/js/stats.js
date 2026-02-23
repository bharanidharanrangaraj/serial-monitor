/**
 * Stats — Real-time statistics display
 */
const Stats = {
    bytesRx: 0,
    bytesTx: 0,
    linesRx: 0,
    linesTx: 0,
    errors: 0,
    connectedAt: null,
    lastBytesRx: 0,
    lastBytesTx: 0,
    _interval: null,

    init() {
        // Update every second
        this._interval = setInterval(() => this._update(), 1000);
    },

    /**
     * Update stats from incoming data
     */
    setStats(stats) {
        this.bytesRx = stats.bytesRx || 0;
        this.bytesTx = stats.bytesTx || 0;
        this.linesRx = stats.linesRx || 0;
        this.linesTx = stats.linesTx || 0;
        this.errors = stats.errors || 0;
        this.connectedAt = stats.connectedAt || null;
    },

    incrementRx(bytes, line) {
        this.bytesRx += bytes;
        if (line) this.linesRx++;
    },

    incrementTx(bytes) {
        this.bytesTx += bytes;
        this.linesTx++;
    },

    incrementErrors() {
        this.errors++;
    },

    setConnectedAt(ts) {
        this.connectedAt = ts;
    },

    reset() {
        this.bytesRx = 0;
        this.bytesTx = 0;
        this.linesRx = 0;
        this.linesTx = 0;
        this.errors = 0;
        this.connectedAt = null;
        this.lastBytesRx = 0;
        this.lastBytesTx = 0;
        this._update();
    },

    _update() {
        document.getElementById('stat-bytes-rx').textContent = this._formatBytes(this.bytesRx);
        document.getElementById('stat-bytes-tx').textContent = this._formatBytes(this.bytesTx);
        document.getElementById('stat-lines-rx').textContent = this.linesRx.toLocaleString();
        document.getElementById('stat-lines-tx').textContent = this.linesTx.toLocaleString();
        document.getElementById('stat-errors').textContent = this.errors.toLocaleString();

        // Uptime
        if (this.connectedAt) {
            const elapsed = Date.now() - this.connectedAt;
            document.getElementById('stat-uptime').textContent = this._formatDuration(elapsed);
        } else {
            document.getElementById('stat-uptime').textContent = '—';
        }

        // Throughput
        const rxRate = this.bytesRx - this.lastBytesRx;
        const txRate = this.bytesTx - this.lastBytesTx;
        this.lastBytesRx = this.bytesRx;
        this.lastBytesTx = this.bytesTx;

        document.getElementById('throughput-rx').textContent = this._formatBytes(rxRate) + '/s';
        document.getElementById('throughput-tx').textContent = this._formatBytes(txRate) + '/s';
    },

    _formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    },

    _formatDuration(ms) {
        const s = Math.floor(ms / 1000) % 60;
        const m = Math.floor(ms / 60000) % 60;
        const h = Math.floor(ms / 3600000);
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }
};
