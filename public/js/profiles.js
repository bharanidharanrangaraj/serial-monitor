/**
 * Profiles — Save/load configuration presets
 */
const Profiles = {
    profiles: [],

    init() {
        document.getElementById('btn-profiles').addEventListener('click', () => {
            this.loadProfiles();
            document.getElementById('modal-profiles').style.display = 'flex';
        });

        document.getElementById('btn-save-profile').addEventListener('click', () => this.saveProfile());

        // Close modal
        document.querySelectorAll('[data-modal="modal-profiles"]').forEach(el => {
            el.addEventListener('click', () => {
                document.getElementById('modal-profiles').style.display = 'none';
            });
        });
    },

    async loadProfiles() {
        try {
            const res = await fetch('/api/profiles');
            const data = await res.json();
            this.profiles = data.profiles || [];
            this._renderList();
        } catch (e) {
            console.error('Failed to load profiles:', e);
        }
    },

    async saveProfile() {
        const name = document.getElementById('profile-name').value.trim();
        if (!name) return;

        const connection = {
            baudRate: document.getElementById('baud-rate').value,
            dataBits: document.getElementById('data-bits').value,
            parity: document.getElementById('parity').value,
            stopBits: document.getElementById('stop-bits').value,
            flowControl: document.getElementById('flow-control').value
        };

        try {
            await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    connection,
                    theme: document.documentElement.getAttribute('data-theme')
                })
            });

            document.getElementById('profile-name').value = '';
            this.loadProfiles();
        } catch (e) {
            console.error('Failed to save profile:', e);
        }
    },

    applyProfile(profile) {
        if (profile.connection) {
            if (profile.connection.baudRate) document.getElementById('baud-rate').value = profile.connection.baudRate;
            if (profile.connection.dataBits) document.getElementById('data-bits').value = profile.connection.dataBits;
            if (profile.connection.parity) document.getElementById('parity').value = profile.connection.parity;
            if (profile.connection.stopBits) document.getElementById('stop-bits').value = profile.connection.stopBits;
            if (profile.connection.flowControl) document.getElementById('flow-control').value = profile.connection.flowControl;
        }
        if (profile.theme) {
            ThemeManager.set(profile.theme);
        }
        document.getElementById('modal-profiles').style.display = 'none';
    },

    async deleteProfile(id) {
        try {
            await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
            this.loadProfiles();
        } catch (e) {
            console.error('Failed to delete profile:', e);
        }
    },

    _renderList() {
        const container = document.getElementById('profile-list');
        if (this.profiles.length === 0) {
            container.innerHTML = '<p class="muted">No profiles saved yet.</p>';
            return;
        }

        container.innerHTML = this.profiles.map(p => `
            <div class="macro-item">
                <span class="macro-item-name">${this._escapeHtml(p.name)}</span>
                <div class="macro-item-actions">
                    <button class="icon-btn-sm" onclick="Profiles.applyProfile(Profiles.profiles.find(x=>x.id==='${p.id}'))" title="Load">📥</button>
                    <button class="icon-btn-sm" onclick="Profiles.deleteProfile('${p.id}')" title="Delete">✕</button>
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
