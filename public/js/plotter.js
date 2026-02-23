/**
 * Plotter — Real-time multi-channel Canvas 2D line chart
 * Parses CSV numeric data from serial, renders at 60fps
 */
const Plotter = {
    canvas: null,
    ctx: null,
    channels: [],        // Array of { data: [], color, label, visible }
    maxPoints: 1000,
    autoScale: true,
    paused: false,
    yMin: 0,
    yMax: 100,
    CHANNEL_COLORS: [],
    cursorEl: null,
    legendEl: null,
    _animFrame: null,

    init() {
        this.canvas = document.getElementById('plotter-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.cursorEl = document.getElementById('plotter-cursor');
        this.legendEl = document.getElementById('plotter-legend');

        // Read channel colors from CSS custom properties
        const style = getComputedStyle(document.documentElement);
        this.CHANNEL_COLORS = [
            style.getPropertyValue('--ch1').trim() || '#3b82f6',
            style.getPropertyValue('--ch2').trim() || '#10b981',
            style.getPropertyValue('--ch3').trim() || '#f59e0b',
            style.getPropertyValue('--ch4').trim() || '#ef4444',
            style.getPropertyValue('--ch5').trim() || '#8b5cf6',
            style.getPropertyValue('--ch6').trim() || '#ec4899',
            style.getPropertyValue('--ch7').trim() || '#06b6d4',
            style.getPropertyValue('--ch8').trim() || '#f97316',
        ];

        // Resize canvas
        this._resize();
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(() => this._resize()).observe(this.canvas.parentElement);
        }

        // Auto-scale toggle
        document.getElementById('plotter-autoscale').addEventListener('change', (e) => {
            this.autoScale = e.target.checked;
        });

        // Pause toggle
        document.getElementById('btn-plotter-pause').addEventListener('click', () => {
            this.paused = !this.paused;
        });

        // Clear
        document.getElementById('btn-plotter-clear').addEventListener('click', () => {
            this.clear();
        });

        // Cursor
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.cursorEl.style.display = 'none';
        });

        // Start render loop
        this._startRenderLoop();
    },

    /**
     * Feed a serial line to the plotter — parses CSV numbers
     * @param {string} line - e.g. "12.5,67.3,45.0"
     */
    feed(line) {
        if (this.paused) return;

        // Try to parse as CSV numbers
        const parts = line.split(',').map(s => parseFloat(s.trim()));
        if (parts.some(isNaN)) return; // Not numeric data

        // Ensure we have enough channels
        while (this.channels.length < parts.length && this.channels.length < 8) {
            const idx = this.channels.length;
            this.channels.push({
                data: [],
                color: this.CHANNEL_COLORS[idx],
                label: `CH${idx + 1}`,
                visible: true
            });
            this._updateLegend();
        }

        // Push data points
        for (let i = 0; i < parts.length && i < this.channels.length; i++) {
            this.channels[i].data.push(parts[i]);
            if (this.channels[i].data.length > this.maxPoints) {
                this.channels[i].data.shift();
            }
        }

        // Auto-scale Y
        if (this.autoScale) {
            let min = Infinity, max = -Infinity;
            for (const ch of this.channels) {
                if (!ch.visible) continue;
                for (const v of ch.data) {
                    if (v < min) min = v;
                    if (v > max) max = v;
                }
            }
            if (min !== Infinity) {
                const range = max - min || 1;
                this.yMin = min - range * 0.1;
                this.yMax = max + range * 0.1;
            }
        }
    },

    /**
     * Render one frame
     */
    _draw() {
        const { canvas, ctx, channels, yMin, yMax } = this;
        const w = canvas.width;
        const h = canvas.height;
        const dpr = window.devicePixelRatio || 1;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Background
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();
        ctx.fillStyle = bgColor || '#0a0e17';
        ctx.fillRect(0, 0, w, h);

        if (channels.length === 0) {
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#64748b';
            ctx.font = `${13 * dpr}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('Waiting for numeric data (CSV format)...', w / 2, h / 2);
            return;
        }

        const padding = { top: 10 * dpr, right: 10 * dpr, bottom: 25 * dpr, left: 50 * dpr };
        const plotW = w - padding.left - padding.right;
        const plotH = h - padding.top - padding.bottom;

        // Grid lines
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim() || 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (plotH / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();

            // Y labels
            const val = yMax - ((yMax - yMin) / gridLines) * i;
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#64748b';
            ctx.font = `${10 * dpr}px JetBrains Mono, monospace`;
            ctx.textAlign = 'right';
            ctx.fillText(val.toFixed(1), padding.left - 6 * dpr, y + 3 * dpr);
        }

        // Plot each channel
        for (const ch of channels) {
            if (!ch.visible || ch.data.length < 2) continue;

            const points = ch.data;
            const step = plotW / (this.maxPoints - 1);

            ctx.beginPath();
            ctx.strokeStyle = ch.color;
            ctx.lineWidth = 2 * dpr;
            ctx.lineJoin = 'round';

            const startIdx = Math.max(0, points.length - this.maxPoints);
            for (let i = startIdx; i < points.length; i++) {
                const x = padding.left + (i - startIdx) * step;
                const y = padding.top + plotH - ((points[i] - yMin) / (yMax - yMin)) * plotH;

                if (i === startIdx) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();

            // Glow effect
            ctx.globalAlpha = 0.1;
            ctx.lineWidth = 6 * dpr;
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.lineWidth = 2 * dpr;
        }
    },

    _startRenderLoop() {
        const loop = () => {
            this._draw();
            this._animFrame = requestAnimationFrame(loop);
        };
        loop();
    },

    _resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const toolbarH = this.canvas.parentElement.querySelector('.plotter-toolbar')?.offsetHeight || 0;
        const legendH = this.legendEl?.offsetHeight || 0;
        const w = rect.width;
        const h = rect.height - toolbarH - legendH;

        this.canvas.width = w * dpr;
        this.canvas.height = Math.max(50, h) * dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = Math.max(50, h) + 'px';
    },

    _updateLegend() {
        let html = '';
        for (let i = 0; i < this.channels.length; i++) {
            const ch = this.channels[i];
            html += `<span class="plotter-legend-item" data-ch="${i}">
                <span class="plotter-legend-dot" style="background:${ch.color}"></span>
                ${ch.label}
            </span>`;
        }
        this.legendEl.innerHTML = html;

        // Click to toggle visibility
        this.legendEl.querySelectorAll('.plotter-legend-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.ch);
                this.channels[idx].visible = !this.channels[idx].visible;
                el.style.opacity = this.channels[idx].visible ? 1 : 0.3;
            });
        });
    },

    _onMouseMove(e) {
        if (this.channels.length === 0) {
            this.cursorEl.style.display = 'none';
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const dpr = window.devicePixelRatio || 1;
        const padding = { left: 50 };
        const plotW = rect.width - padding.left - 10;

        const pointIdx = Math.round(((x - padding.left) / plotW) * (this.maxPoints - 1));
        if (pointIdx < 0 || pointIdx >= this.maxPoints) {
            this.cursorEl.style.display = 'none';
            return;
        }

        let text = '';
        for (const ch of this.channels) {
            if (!ch.visible) continue;
            const val = ch.data[pointIdx];
            if (val !== undefined) {
                text += `<span style="color:${ch.color}">${ch.label}: ${val.toFixed(2)}</span><br>`;
            }
        }

        if (text) {
            this.cursorEl.innerHTML = text;
            this.cursorEl.style.display = 'block';
            this.cursorEl.style.left = (e.clientX - rect.left + 12) + 'px';
            this.cursorEl.style.top = (e.clientY - rect.top - 10) + 'px';
        }
    },

    clear() {
        for (const ch of this.channels) {
            ch.data = [];
        }
        this.channels = [];
        this.legendEl.innerHTML = '';
    }
};
