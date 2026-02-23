/**
 * Macro Engine — Saveable, repeatable command sequences
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '..', 'data', 'macros.json');

class MacroEngine {
    constructor() {
        this.macros = [];
        this._load();
    }

    _load() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                this.macros = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            }
        } catch (e) {
            console.error('Failed to load macros:', e.message);
            this.macros = [];
        }
    }

    _save() {
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(this.macros, null, 2));
    }

    /**
     * List all macros
     */
    list() {
        return this.macros;
    }

    /**
     * Create a new macro
     * @param {Object} data - { name, commands: [{ data, mode, delayMs }], repeatCount, params }
     */
    create(data) {
        const macro = {
            id: uuidv4(),
            name: data.name || 'Untitled Macro',
            commands: data.commands || [],
            repeatCount: data.repeatCount || 1,
            params: data.params || [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.macros.push(macro);
        this._save();
        return macro;
    }

    /**
     * Update an existing macro
     */
    update(id, data) {
        const idx = this.macros.findIndex(m => m.id === id);
        if (idx === -1) throw new Error('Macro not found');
        this.macros[idx] = { ...this.macros[idx], ...data, updatedAt: Date.now() };
        this._save();
        return this.macros[idx];
    }

    /**
     * Delete a macro
     */
    remove(id) {
        const idx = this.macros.findIndex(m => m.id === id);
        if (idx === -1) throw new Error('Macro not found');
        this.macros.splice(idx, 1);
        this._save();
    }

    /**
     * Run a macro — sends commands sequentially through serialManager
     * @param {string} id - Macro ID
     * @param {Object} serialManager - Serial manager instance
     * @param {Object} params - Parameter values for injection { param1: "value1" }
     * @param {string} channelId - Channel ID for multi-connection routing
     */
    async run(id, serialManager, params = {}, channelId = 'default') {
        const macro = this.macros.find(m => m.id === id);
        if (!macro) throw new Error('Macro not found');

        const repeatCount = macro.repeatCount || 1;

        for (let r = 0; r < repeatCount; r++) {
            for (const cmd of macro.commands) {
                let data = cmd.data || '';

                // Parameter injection: replace {{paramName}}
                for (const [key, value] of Object.entries(params)) {
                    data = data.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
                }

                serialManager.send(channelId, data, cmd.mode || 'ascii');

                // Delay between commands
                if (cmd.delayMs && cmd.delayMs > 0) {
                    await new Promise(resolve => setTimeout(resolve, cmd.delayMs));
                }
            }
        }
    }
}

module.exports = new MacroEngine();
