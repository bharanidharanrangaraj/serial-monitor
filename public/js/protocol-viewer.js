/**
 * Protocol Viewer — Displays decoded protocol frames
 */
const ProtocolViewer = {
    container: null,
    maxFrames: 100,
    frames: [],

    init() {
        this.container = document.getElementById('protocol-viewer');
    },

    /**
     * Add decoded frames from protocol decoders
     * @param {Array} decoded - Array of { plugin, protocol, fields, display }
     */
    addDecoded(decoded) {
        if (!decoded || decoded.length === 0) return;

        for (const frame of decoded) {
            this.frames.push(frame);
            if (this.frames.length > this.maxFrames) {
                this.frames.shift();
            }
        }

        this._render();
    },

    _render() {
        if (this.frames.length === 0) {
            this.container.innerHTML = '<p class="muted">No decoded frames</p>';
            return;
        }

        // Show most recent frames first
        const recentFrames = this.frames.slice(-20).reverse();

        this.container.innerHTML = recentFrames.map(f => {
            const fieldsHtml = Object.entries(f.fields || {}).map(([key, val]) =>
                `<div class="protocol-field"><span>${key}:</span> <span class="protocol-field-value">${this._escapeHtml(String(val))}</span></div>`
            ).join('');

            return `<div class="protocol-frame">
                <div class="protocol-label">${this._escapeHtml(f.display || f.protocol || 'Unknown')}</div>
                ${fieldsHtml}
            </div>`;
        }).join('');
    },

    clear() {
        this.frames = [];
        this.container.innerHTML = '<p class="muted">No decoder active</p>';
    },

    _escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
};
