/**
 * Export — Export logs dialog
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

        // Get the active tab's channelId and port name
        const channelId = App._getActiveChannelId();
        const activeTab = App._getActiveTab();
        const portName = (activeTab && activeTab.port) ? activeTab.port.replace(/[^a-zA-Z0-9]/g, '') : 'unknown';

        try {
            const res = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format, filter: filter || undefined, channelId })
            });

            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
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
