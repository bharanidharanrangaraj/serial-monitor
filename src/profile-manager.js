/**
 * Profile Manager — Save/load user configuration presets
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '..', 'data', 'profiles.json');

class ProfileManager {
    constructor() {
        this.profiles = [];
        this._load();
    }

    _load() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                this.profiles = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            }
        } catch (e) {
            console.error('Failed to load profiles:', e.message);
            this.profiles = [];
        }
    }

    _save() {
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(this.profiles, null, 2));
    }

    list() {
        return this.profiles;
    }

    create(data) {
        const profile = {
            id: uuidv4(),
            name: data.name || 'Untitled Profile',
            connection: data.connection || {},
            macros: data.macros || [],
            theme: data.theme || 'dark',
            plotConfig: data.plotConfig || {},
            decoder: data.decoder || null,
            uiLayout: data.uiLayout || {},
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.profiles.push(profile);
        this._save();
        return profile;
    }

    update(id, data) {
        const idx = this.profiles.findIndex(p => p.id === id);
        if (idx === -1) throw new Error('Profile not found');
        this.profiles[idx] = { ...this.profiles[idx], ...data, updatedAt: Date.now() };
        this._save();
        return this.profiles[idx];
    }

    remove(id) {
        const idx = this.profiles.findIndex(p => p.id === id);
        if (idx === -1) throw new Error('Profile not found');
        this.profiles.splice(idx, 1);
        this._save();
    }

    get(id) {
        return this.profiles.find(p => p.id === id) || null;
    }
}

module.exports = new ProfileManager();
