/**
 * Terminal — Virtual-scrolling terminal renderer for high-performance log display
 * Handles 10M+ lines via DOM recycling (only renders visible rows)
 */
const Terminal = {
    lines: [],
    visibleLines: [],
    container: null,
    autoScroll: true,
    showTimestamps: true,
    ROW_HEIGHT: 22,
    BUFFER_ROWS: 20,
    scrollTop: 0,
    containerHeight: 0,
    _renderPending: false,

    init() {
        this.container = document.getElementById('terminal');
        this.containerHeight = this.container.clientHeight;

        // Auto-scroll toggle
        document.getElementById('terminal-autoscroll').addEventListener('change', (e) => {
            this.autoScroll = e.target.checked;
            if (this.autoScroll) this._scrollToBottom();
        });

        // Timestamps toggle
        document.getElementById('terminal-timestamps').addEventListener('change', (e) => {
            this.showTimestamps = e.target.checked;
            this._render();
        });

        // Clear terminal
        document.getElementById('btn-clear-terminal').addEventListener('click', () => {
            this.clear();
            if (window.App && window.App.ws) {
                window.App.ws.send(JSON.stringify({ type: 'serial:clear' }));
            }
        });

        // Scroll handler
        this.container.addEventListener('scroll', () => {
            this.scrollTop = this.container.scrollTop;
            // If user scrolls up, disable auto-scroll
            const isAtBottom = this.container.scrollHeight - this.container.scrollTop - this.container.clientHeight < 50;
            if (!isAtBottom && this.autoScroll) {
                this.autoScroll = false;
                document.getElementById('terminal-autoscroll').checked = false;
            }
            this._scheduleRender();
        });

        // Observe container resize
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(() => {
                this.containerHeight = this.container.clientHeight;
                this._scheduleRender();
            }).observe(this.container);
        }

        // Create spacer and viewport
        this._spacerTop = document.createElement('div');
        this._spacerBottom = document.createElement('div');
        this._viewport = document.createElement('div');
        this._viewport.className = 'terminal-viewport';
        this.container.appendChild(this._spacerTop);
        this.container.appendChild(this._viewport);
        this.container.appendChild(this._spacerBottom);
    },

    /**
     * Add a line to the terminal
     * @param {Object} entry - { timestamp, direction, data, index }
     */
    addLine(entry) {
        this.lines.push(entry);

        // Cap at 10M lines in display (ring buffer on client)
        if (this.lines.length > 10_000_000) {
            this.lines = this.lines.slice(-5_000_000);
        }

        // Update line count
        document.getElementById('terminal-line-count').textContent = `${this.lines.length.toLocaleString()} lines`;

        this._scheduleRender();

        if (this.autoScroll) {
            requestAnimationFrame(() => this._scrollToBottom());
        }
    },

    /**
     * Schedule a render (debounced via rAF)
     */
    _scheduleRender() {
        if (this._renderPending) return;
        this._renderPending = true;
        requestAnimationFrame(() => {
            this._render();
            this._renderPending = false;
        });
    },

    /**
     * Render visible lines (virtual scrolling)
     */
    _render() {
        const totalHeight = this.lines.length * this.ROW_HEIGHT;
        const scrollTop = this.container.scrollTop;
        const viewportHeight = this.containerHeight || this.container.clientHeight;

        const firstVisible = Math.max(0, Math.floor(scrollTop / this.ROW_HEIGHT) - this.BUFFER_ROWS);
        const lastVisible = Math.min(this.lines.length - 1, Math.ceil((scrollTop + viewportHeight) / this.ROW_HEIGHT) + this.BUFFER_ROWS);

        this._spacerTop.style.height = (firstVisible * this.ROW_HEIGHT) + 'px';
        this._spacerBottom.style.height = Math.max(0, (this.lines.length - lastVisible - 1) * this.ROW_HEIGHT) + 'px';

        // Build HTML for visible range
        let html = '';
        for (let i = firstVisible; i <= lastVisible; i++) {
            const line = this.lines[i];
            if (!line) continue;
            html += this._renderLine(line, i);
        }
        this._viewport.innerHTML = html;
    },

    /**
     * Render a single terminal line
     */
    _renderLine(entry, index) {
        const dir = entry.direction === 'tx' ? 'tx' : 'rx';
        const dirLabel = entry.direction === 'tx' ? '▶' : '◀';
        const ts = this.showTimestamps ? `<span class="terminal-timestamp">${this._formatTime(entry.timestamp)}</span>` : '';
        const data = this._escapeHtml(entry.data);
        const matchClass = entry._searchMatch ? (entry._searchActive ? 'search-active' : 'search-match') : '';

        return `<div class="terminal-line ${dir} ${matchClass}" data-index="${index}" style="height:${this.ROW_HEIGHT}px;line-height:${this.ROW_HEIGHT}px;">${ts}<span class="terminal-direction">${dirLabel}</span><span class="terminal-data">${entry._highlightedData || data}</span></div>`;
    },

    _formatTime(ts) {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
    },

    _escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    _scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    },

    clear() {
        this.lines = [];
        this._viewport.innerHTML = '';
        document.getElementById('terminal-line-count').textContent = '0 lines';
        this._render();
    },

    /**
     * Get all lines for search
     */
    getLines() {
        return this.lines;
    },

    /**
     * Scroll to specific line index
     */
    scrollToLine(index) {
        this.container.scrollTop = index * this.ROW_HEIGHT;
        this._scheduleRender();
    }
};
