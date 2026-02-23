/**
 * Plugin Loader — Loads protocol decoder plugins from /plugins directory
 */
const fs = require('fs');
const path = require('path');

const PLUGIN_DIR = path.join(__dirname, '..', 'plugins');

class PluginLoader {
    constructor() {
        this.plugins = [];
    }

    /**
     * Load all plugins from the plugins directory
     */
    loadAll() {
        this.plugins = [];
        if (!fs.existsSync(PLUGIN_DIR)) {
            fs.mkdirSync(PLUGIN_DIR, { recursive: true });
            return;
        }

        const files = fs.readdirSync(PLUGIN_DIR).filter(f => f.endsWith('.js'));
        for (const file of files) {
            try {
                const pluginPath = path.join(PLUGIN_DIR, file);
                // Clear require cache for hot reload
                delete require.cache[require.resolve(pluginPath)];
                const plugin = require(pluginPath);
                if (plugin.name && typeof plugin.decode === 'function') {
                    this.plugins.push(plugin);
                    console.log(`  ✓ Loaded decoder: ${plugin.name}`);
                } else {
                    console.warn(`  ✗ Skipped ${file}: missing name or decode function`);
                }
            } catch (e) {
                console.error(`  ✗ Error loading ${file}: ${e.message}`);
            }
        }
    }

    /**
     * Reload all plugins (for hot-reload)
     */
    reload() {
        this.loadAll();
    }

    /**
     * Get all loaded plugins
     */
    getAll() {
        return this.plugins;
    }

    /**
     * Run all decoders on a buffer
     * @param {Buffer} data - Raw data buffer
     * @returns {Array} Decoded results from all plugins
     */
    decodeAll(data) {
        const results = [];
        for (const plugin of this.plugins) {
            try {
                const result = plugin.decode(data);
                if (result) {
                    results.push({ plugin: plugin.name, ...result });
                }
            } catch (e) {
                // Silently skip decode errors
            }
        }
        return results;
    }
}

module.exports = new PluginLoader();
