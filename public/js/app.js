/**
 * App — Main application controller
 * Multi-tab architecture: each tab has a unique channelId.
 * All WebSocket messages include channelId so the backend routes to the correct serial connection.
 */
const App = {
    ws: null,
    connected: false,
    repeatInterval: null,
    repeatPaused: false,

    // ═══════════ Multi-tab state ═══════════
    tabs: [],
    activeTabId: null,
    tabCounter: 0,


    init() {
        // Initialize all modules
        Terminal.init();
        Plotter.init();
        Search.init();
        Stats.init();
        Macros.init();
        Export.init();
        Profiles.init();
        ProtocolViewer.init();

        // Connect WebSocket
        this._connectWS();

        // Setup UI event handlers
        this._setupConnectionUI();
        this._setupSendBar();
        this._setupBaudRateCustom();
        this._setupKeyboardShortcuts();
        this._setupCollapsibles();
        this._setupTabs();

        // Load port list
        this._refreshPorts();

        // Expose globally for inline event handlers
        window.App = this;
    },

    // ═══════════ Active channel helper ═══════════
    _getActiveChannelId() {
        const tab = this._getActiveTab();
        return tab ? tab.channelId : 'default';
    },

    // ═══════════ WebSocket ═══════════
    _connectWS() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${location.host}/ws`;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected — reconnecting in 2s...');
            setTimeout(() => this._connectWS(), 2000);
        };

        this.ws.onerror = (err) => {
            console.error('WebSocket error:', err);
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this._handleWSMessage(msg);
            } catch (e) {
                console.error('Failed to parse WS message:', e);
            }
        };
    },

    _handleWSMessage(msg) {
        switch (msg.type) {
            case 'serial:data':
                this._onSerialData(msg.channelId, msg.payload, msg.decoded);
                break;

            case 'serial:status':
                this._updateConnectionStatus(msg.channelId, msg);
                break;

            case 'serial:error':
                this._onSerialError(msg.channelId, msg.error);
                break;

            case 'serial:cleared':
                this._onSerialCleared(msg.channelId);
                break;

            case 'plugins:list':
                this._populateDecoders(msg.plugins);
                break;

            case 'ports:updated':
                this._onPortsUpdated(msg.ports);
                break;
        }
    },

    // ═══════════ Serial Data (per channel) ═══════════
    _onSerialData(channelId, entry, decoded) {
        // Find the tab that owns this channel
        const tab = this.tabs.find(t => t.channelId === channelId);
        if (!tab) return; // Ignore data from unknown channels

        // Store in tab's own history
        tab.lines.push(entry);
        if (tab.lines.length > 100000) {
            tab.lines = tab.lines.slice(-80000);
        }

        // Update tab-level stats
        tab.stats.bytesRx += (entry.data || '').length;
        tab.stats.linesRx++;

        // Only render to terminal/plotter if this is the active tab
        if (channelId === this._getActiveChannelId()) {
            Terminal.addLine(entry);
            Plotter.feed(entry.data);
            Stats.incrementRx((entry.data || '').length, true);

            if (decoded && decoded.length > 0) {
                ProtocolViewer.addDecoded(decoded);
            }
        }
    },

    _onSerialError(channelId, error) {
        const tab = this.tabs.find(t => t.channelId === channelId);
        if (tab) {
            tab.stats.errors++;
        }

        // Only show in UI if it's the active tab
        if (channelId === this._getActiveChannelId()) {
            console.error('Serial Error:', error);
            Terminal.addLine({
                timestamp: Date.now(),
                direction: 'rx',
                data: `[ERROR] ${error}`
            });
            Stats.incrementErrors();
        }
    },

    _onSerialCleared(channelId) {
        const tab = this.tabs.find(t => t.channelId === channelId);
        if (tab) {
            tab.lines = [];
        }

        if (channelId === this._getActiveChannelId()) {
            Terminal.clear();
            Plotter.clear();
            ProtocolViewer.clear();
            Stats.reset();
        }
    },

    // ═══════════ Port Auto-Refresh ═══════════
    _onPortsUpdated(ports) {
        const select = document.getElementById('port-select');
        const currentVal = select.value;

        select.innerHTML = '<option value="">— Select Port —</option>';
        (ports || []).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.path;
            opt.textContent = `${p.path} ${p.friendlyName !== p.path ? '(' + p.friendlyName + ')' : ''}`;
            select.appendChild(opt);
        });

        // Preserve current selection if still available
        if (currentVal) {
            const exists = Array.from(select.options).some(o => o.value === currentVal);
            if (exists) select.value = currentVal;
        }

        if (ports && ports.length === 0) {
            const opt = document.createElement('option');
            opt.textContent = 'No ports found';
            opt.disabled = true;
            select.appendChild(opt);
        }

        // Re-apply the active tab's sidebar config (port, baud, etc.)
        const activeTab = this._getActiveTab();
        if (activeTab) {
            this._restoreSidebarConfig(activeTab);
        }
    },

    // ═══════════ Multi-Tab System ═══════════
    _setupTabs() {
        document.getElementById('btn-new-tab').addEventListener('click', () => this._createTab());

        // Create the first default tab
        this._createTab();
    },

    _createTab() {
        this.tabCounter++;
        const channelId = `ch-${Date.now()}-${this.tabCounter}`;
        const tabId = `tab-${this.tabCounter}`;
        const tab = {
            id: tabId,
            channelId: channelId,
            name: `Monitor ${this.tabCounter}`,
            port: null,
            connected: false,
            lines: [],
            stats: { bytesRx: 0, bytesTx: 0, linesRx: 0, linesTx: 0, errors: 0 },
            // Each tab has its own sidebar config
            sidebarConfig: {
                portSelect: '',
                baudRate: '115200',
                baudCustom: '',
                dataBits: '8',
                parity: 'none',
                stopBits: '1',
                flowControl: 'none',
                decoderSelect: ''
            }
        };

        this.tabs.push(tab);
        this._renderTabs();
        this._switchTab(tabId);
    },

    _closeTab(tabId) {
        if (this.tabs.length <= 1) return;

        const idx = this.tabs.findIndex(t => t.id === tabId);
        if (idx === -1) return;

        const tab = this.tabs[idx];

        // Tell backend to disconnect and remove the channel
        if (tab.connected && this.ws && this.ws.readyState === 1) {
            this.ws.send(JSON.stringify({ type: 'serial:disconnect', channelId: tab.channelId }));
        }
        if (this.ws && this.ws.readyState === 1) {
            this.ws.send(JSON.stringify({ type: 'channel:remove', channelId: tab.channelId }));
        }

        this.tabs.splice(idx, 1);

        if (this.activeTabId === tabId) {
            const newIdx = Math.min(idx, this.tabs.length - 1);
            this._switchTab(this.tabs[newIdx].id);
        }

        this._renderTabs();
    },

    _switchTab(tabId) {
        // Save the outgoing tab's sidebar config first
        const outgoingTab = this._getActiveTab();
        if (outgoingTab) {
            this._saveSidebarConfig(outgoingTab);
        }

        this.activeTabId = tabId;
        const tab = this._getActiveTab();

        if (tab) {
            // Restore terminal with this tab's lines
            Terminal.clear();
            if (tab.lines.length > 0) {
                tab.lines.forEach(line => Terminal.addLine(line));
            }

            // Restore this tab's sidebar config (port, baud, etc.)
            this._restoreSidebarConfig(tab);

            // Update connection badge for this tab
            if (tab.connected) {
                this._setBadge('connected', `Connected: ${tab.port}`);
                document.getElementById('btn-connect').style.display = 'none';
                document.getElementById('btn-disconnect').style.display = 'flex';
            } else {
                this._setBadge('disconnected', 'Disconnected');
                document.getElementById('btn-connect').style.display = 'flex';
                document.getElementById('btn-disconnect').style.display = 'none';
            }

            // Update stats for this tab
            Stats.setStats(tab.stats);

            // Reset plotter with this tab's data
            Plotter.clear();
        }

        this._renderTabs();
    },

    // Save current sidebar form values into a tab object
    _saveSidebarConfig(tab) {
        tab.sidebarConfig = {
            portSelect: document.getElementById('port-select').value,
            baudRate: document.getElementById('baud-rate').value,
            baudCustom: document.getElementById('baud-custom').value,
            dataBits: document.getElementById('data-bits').value,
            parity: document.getElementById('parity').value,
            stopBits: document.getElementById('stop-bits').value,
            flowControl: document.getElementById('flow-control').value,
            decoderSelect: document.getElementById('decoder-select').value
        };
    },

    // Restore sidebar form values from a tab object
    _restoreSidebarConfig(tab) {
        const cfg = tab.sidebarConfig;
        if (!cfg) return;

        document.getElementById('port-select').value = cfg.portSelect;
        document.getElementById('baud-rate').value = cfg.baudRate;
        document.getElementById('baud-custom').value = cfg.baudCustom;
        document.getElementById('baud-custom').style.display = cfg.baudRate === 'custom' ? 'block' : 'none';
        document.getElementById('data-bits').value = cfg.dataBits;
        document.getElementById('parity').value = cfg.parity;
        document.getElementById('stop-bits').value = cfg.stopBits;
        document.getElementById('flow-control').value = cfg.flowControl;
        document.getElementById('decoder-select').value = cfg.decoderSelect;
    },

    _getActiveTab() {
        return this.tabs.find(t => t.id === this.activeTabId) || null;
    },

    _renderTabs() {
        const tabList = document.getElementById('tab-list');
        tabList.innerHTML = this.tabs.map(tab => {
            const isActive = tab.id === this.activeTabId;
            const portBadge = tab.port
                ? `<span class="tab-port-badge">${this._escapeHtml(tab.port)}</span>`
                : '';
            const connDot = tab.connected ? '<span class="tab-conn-dot"></span>' : '';
            return `<button class="tab-item ${isActive ? 'active' : ''}" data-tab-id="${tab.id}" onclick="App._switchTab('${tab.id}')">
                ${connDot}
                ${this._escapeHtml(tab.name)}
                ${portBadge}
                <span class="tab-close" onclick="event.stopPropagation(); App._closeTab('${tab.id}')" title="Close tab">✕</span>
            </button>`;
        }).join('');
    },

    // ═══════════ Collapsibles ═══════════
    _setupCollapsibles() {
        const plotHeader = document.getElementById('plotter-collapse-header');
        const plotContainer = document.getElementById('plotter-container');

        plotHeader.addEventListener('click', (e) => {
            if (e.target.closest('.plotter-actions')) return;
            const isCollapsed = plotHeader.classList.contains('collapsed');
            plotHeader.classList.toggle('collapsed');
            plotContainer.classList.toggle('collapsed');
            if (isCollapsed) {
                setTimeout(() => Plotter.resize && Plotter.resize(), 300);
            }
        });

        const statsHeader = document.getElementById('stats-collapse-header');
        const rightSidebar = document.getElementById('right-sidebar');

        statsHeader.addEventListener('click', () => {
            rightSidebar.classList.toggle('collapsed');
        });
    },

    // ═══════════ Connection UI (with channelId) ═══════════
    _setupConnectionUI() {
        document.getElementById('btn-connect').addEventListener('click', () => this._connect());
        document.getElementById('btn-disconnect').addEventListener('click', () => this._disconnect());
        document.getElementById('btn-refresh-ports').addEventListener('click', () => this._refreshPorts());
    },

    async _refreshPorts() {
        try {
            const res = await fetch('/api/ports');
            const data = await res.json();
            this._onPortsUpdated(data.ports || []);
        } catch (e) {
            console.error('Failed to refresh ports:', e);
        }
    },

    _connect() {
        const channelId = this._getActiveChannelId();
        const config = {
            path: document.getElementById('port-select').value,
            baudRate: this._getSelectedBaudRate(),
            dataBits: document.getElementById('data-bits').value,
            stopBits: document.getElementById('stop-bits').value,
            parity: document.getElementById('parity').value,
            flowControl: document.getElementById('flow-control').value
        };

        if (!config.path) {
            alert('Please select a serial port');
            return;
        }

        // Send connect with this tab's channelId
        this.ws.send(JSON.stringify({ type: 'serial:connect', channelId, config }));

        // Update tab info
        const tab = this._getActiveTab();
        if (tab) {
            tab.port = config.path;
            tab.name = config.path.replace(/.*[/\\]/, '');
            this._renderTabs();
        }
    },

    _disconnect() {
        const channelId = this._getActiveChannelId();
        this.ws.send(JSON.stringify({ type: 'serial:disconnect', channelId }));

        const tab = this._getActiveTab();
        if (tab) {
            tab.connected = false;
            this._renderTabs();
        }
    },

    _updateConnectionStatus(channelId, msg) {
        // Find the tab that matches this channelId
        const tab = this.tabs.find(t => t.channelId === channelId);
        if (!tab) return;

        if (msg.status === 'connected') {
            tab.connected = true;
            if (msg.config) {
                tab.stats.connectedAt = Date.now();
            }
        } else if (msg.status === 'disconnected') {
            tab.connected = false;
        }

        // Update UI only if this is the active tab
        if (channelId === this._getActiveChannelId()) {
            if (msg.status === 'connected') {
                this.connected = true;
                this._setBadge('connected', `Connected: ${tab.port || ''}`);
                document.getElementById('btn-connect').style.display = 'none';
                document.getElementById('btn-disconnect').style.display = 'flex';
                Stats.setConnectedAt(tab.stats.connectedAt);
            } else if (msg.status === 'disconnected') {
                this.connected = false;
                this._setBadge('disconnected', 'Disconnected');
                document.getElementById('btn-connect').style.display = 'flex';
                document.getElementById('btn-disconnect').style.display = 'none';
            }
        }

        this._renderTabs();
    },

    _setBadge(type, label) {
        const badge = document.getElementById('connection-badge');
        badge.className = `badge badge-${type}`;
        document.getElementById('connection-label').textContent = label;
    },

    // ═══════════ Send Bar (with channelId) ═══════════
    _setupSendBar() {
        const sendInput = document.getElementById('send-input');
        const sendBtn = document.getElementById('btn-send');
        const repeatCheck = document.getElementById('send-repeat');
        const repeatIntervalInput = document.getElementById('send-repeat-interval');
        const pauseBtn = document.getElementById('btn-send-pause');

        sendBtn.addEventListener('click', () => this._sendData());

        sendInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this._sendData();
            }
        });

        repeatCheck.addEventListener('change', (e) => {
            const show = e.target.checked;
            repeatIntervalInput.style.display = show ? 'block' : 'none';
            pauseBtn.style.display = show ? 'flex' : 'none';

            if (!show && this.repeatInterval) {
                clearInterval(this.repeatInterval);
                this.repeatInterval = null;
            }
        });

        pauseBtn.addEventListener('click', () => {
            if (this.repeatInterval) {
                clearInterval(this.repeatInterval);
                this.repeatInterval = null;
                this.repeatPaused = true;
                pauseBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
            } else {
                this.repeatPaused = false;
                this._startRepeat();
                pauseBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
            }
        });
    },

    _sendData() {
        const input = document.getElementById('send-input');
        const data = input.value;
        if (!data) return;

        const channelId = this._getActiveChannelId();
        const mode = document.querySelector('input[name="send-mode"]:checked')?.value || 'ascii';

        // Send with channelId so it goes to the correct serial port
        this.ws.send(JSON.stringify({ type: 'serial:send', channelId, data, mode }));

        // Repeat mode
        const repeatCheck = document.getElementById('send-repeat');
        if (repeatCheck.checked && !this.repeatInterval) {
            this._startRepeat();
        }

        if (!repeatCheck.checked) {
            input.value = '';
            input.focus();
        }
    },

    _startRepeat() {
        const interval = parseInt(document.getElementById('send-repeat-interval').value) || 1000;
        this.repeatInterval = setInterval(() => this._sendData(), interval);
    },

    // ═══════════ Baud Rate Custom ═══════════
    _setupBaudRateCustom() {
        const baudSelect = document.getElementById('baud-rate');
        const baudCustom = document.getElementById('baud-custom');

        baudSelect.addEventListener('change', () => {
            baudCustom.style.display = baudSelect.value === 'custom' ? 'block' : 'none';
        });
    },

    _getSelectedBaudRate() {
        const baudSelect = document.getElementById('baud-rate');
        if (baudSelect.value === 'custom') {
            return parseInt(document.getElementById('baud-custom').value) || 115200;
        }
        return parseInt(baudSelect.value) || 115200;
    },

    // ═══════════ Keyboard Shortcuts ═══════════
    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+C = Clear active tab
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                const channelId = this._getActiveChannelId();
                this.ws.send(JSON.stringify({ type: 'serial:clear', channelId }));
            }
            // Ctrl+T = New tab
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                this._createTab();
            }
            // Ctrl+W = Close current tab
            if (e.ctrlKey && e.key === 'w') {
                e.preventDefault();
                if (this.activeTabId && this.tabs.length > 1) {
                    this._closeTab(this.activeTabId);
                }
            }
        });
    },

    // ═══════════ Protocol Decoders ═══════════
    _populateDecoders(plugins) {
        const select = document.getElementById('decoder-select');
        select.innerHTML = '<option value="">None</option>';
        (plugins || []).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            select.appendChild(opt);
        });
    },

    // ═══════════ Helpers ═══════════
    _escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
