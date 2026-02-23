/**
 * Macros — Command macro manager UI
 */
const Macros = {
    macros: [],

    init() {
        document.getElementById('btn-macros').addEventListener('click', () => {
            this.loadMacros();
            document.getElementById('modal-macros').style.display = 'flex';
        });

        document.getElementById('btn-save-macro').addEventListener('click', () => this.saveMacro());

        // Close modal
        document.querySelectorAll('[data-modal="modal-macros"]').forEach(el => {
            el.addEventListener('click', () => {
                document.getElementById('modal-macros').style.display = 'none';
            });
        });
    },

    async loadMacros() {
        try {
            const res = await fetch('/api/macros');
            const data = await res.json();
            this.macros = data.macros || [];
            this._renderList();
        } catch (e) {
            console.error('Failed to load macros:', e);
        }
    },

    async saveMacro() {
        const name = document.getElementById('macro-name').value.trim();
        const commandsText = document.getElementById('macro-commands').value.trim();
        const repeatCount = parseInt(document.getElementById('macro-repeat').value) || 1;

        if (!name || !commandsText) return;

        const commands = commandsText.split('\n').map(line => {
            const parts = line.split('|');
            return {
                data: parts[0] || '',
                mode: parts[1] || 'ascii',
                delayMs: parseInt(parts[2]) || 100
            };
        });

        try {
            await fetch('/api/macros', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, commands, repeatCount })
            });

            document.getElementById('macro-name').value = '';
            document.getElementById('macro-commands').value = '';
            document.getElementById('macro-repeat').value = '1';
            this.loadMacros();
        } catch (e) {
            console.error('Failed to save macro:', e);
        }
    },

    async runMacro(id) {
        try {
            await fetch(`/api/macros/${id}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ params: {} })
            });
        } catch (e) {
            console.error('Failed to run macro:', e);
        }
    },

    async deleteMacro(id) {
        try {
            await fetch(`/api/macros/${id}`, { method: 'DELETE' });
            this.loadMacros();
        } catch (e) {
            console.error('Failed to delete macro:', e);
        }
    },

    _renderList() {
        const container = document.getElementById('macro-list');
        if (this.macros.length === 0) {
            container.innerHTML = '<p class="muted">No macros saved yet.</p>';
            return;
        }

        container.innerHTML = this.macros.map(m => `
            <div class="macro-item">
                <span class="macro-item-name">${this._escapeHtml(m.name)}</span>
                <div class="macro-item-actions">
                    <button class="icon-btn-sm" onclick="Macros.runMacro('${m.id}')" title="Run">▶</button>
                    <button class="icon-btn-sm" onclick="Macros.deleteMacro('${m.id}')" title="Delete">✕</button>
                </div>
            </div>
        `).join('');
    },

    _escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
};
