/**
 * Export - Export logs dialog
 */
const Export = {
    init() {
        document.getElementById('btn-export').addEventListener('click', () => {
            document.getElementById('modal-export').style.display = 'flex';
        });

        document.getElementById('btn-do-export').addEventListener('click', () => this.doExport());

        // Close modal
        document.querySelectorAll('[data-modal="modal-export"]').forEach(el => {
            el.addEventListener('click', () => {
                document.getElementById('modal-export').style.display = 'none';
            });
        });
    },

    async doExport() {
        const format = document.querySelector('input[name="export-format"]:checked')?.value || 'txt';
        const filter = document.getElementById('export-filter').value.trim();

        const activeTab = window.App ? window.App._getActiveTab() : null;
        const portName = (activeTab && activeTab.port) ? activeTab.port.replace(/[^a-zA-Z0-9]/g, '') : 'unknown';

        try {
            // Get lines from terminal directly
            let lines = window.Terminal ? window.Terminal.getLines() : [];

            // Apply filter
            if (filter) {
                const isRegex = filter.startsWith('#');
                if (isRegex) {
                    try {
                        const r = new RegExp(filter.substring(1), 'i');
                        lines = lines.filter(l => r.test(l.data));
                    } catch (e) {
                        return alert('Invalid regex filter');
                    }
                } else {
                    const term = filter.toLowerCase();
                    lines = lines.filter(l => (l.data || '').toLowerCase().includes(term));
                }
            }

            let output = '';
            let mimeType = 'text/plain';

            if (format === 'json') {
                output = JSON.stringify(lines, null, 2);
                mimeType = 'application/json';
            } else if (format === 'csv') {
                output = 'Timestamp,Direction,Data\n';
                output += lines.map(l => {
                    const d = `"${(l.data || '').replace(/"/g, '""')}"`;
                    return `${l.timestamp},${l.direction},${d}`;
                }).join('\n');
                mimeType = 'text/csv';
            } else {
                // txt format
                output = lines.map(l => {
                    const date = new Date(l.timestamp).toISOString();
                    const dir = l.direction === 'tx' ? '▶' : '◀';
                    return `[${date}] ${dir} ${l.data}`;
                }).join('\n');
                mimeType = 'text/plain';
            }

            // Create Blob and download
            const blob = new Blob([output], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `serial-log-${portName}-${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            document.getElementById('modal-export').style.display = 'none';
        } catch (e) {
            console.error('Export error:', e);
            alert('Export failed: ' + e.message);
        }
    }
};
