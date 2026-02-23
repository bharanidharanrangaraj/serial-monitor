/**
 * REST API Routes
 * Updated for multi-connection architecture (channelId-based)
 */
const express = require('express');
const router = express.Router();
const serialManager = require('./serial-manager');
const exportEngine = require('./export-engine');
const macroEngine = require('./macro-engine');
const profileManager = require('./profile-manager');
const pluginLoader = require('./plugin-loader');

// --- Serial Ports ---
router.get('/ports', async (req, res) => {
    try {
        const ports = await serialManager.listPorts();
        res.json({ success: true, ports });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/connect', async (req, res) => {
    try {
        const { channelId, ...config } = req.body;
        const result = await serialManager.connect(channelId || 'default', config);
        res.json({ success: true, config: result });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.post('/disconnect', async (req, res) => {
    try {
        const channelId = req.body.channelId || 'default';
        await serialManager.disconnect(channelId);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/status', (req, res) => {
    const channelId = req.query.channelId;
    const status = serialManager.getStatus(channelId);
    res.json({ success: true, ...status, serialportAvailable: true });
});

router.post('/clear', (req, res) => {
    const channelId = req.body.channelId || 'default';
    serialManager.clearBuffer(channelId);
    res.json({ success: true });
});

// --- Export ---
router.post('/export', (req, res) => {
    try {
        const { format, startTime, endTime, filter, channelId } = req.body;
        const buffer = serialManager.getBuffer(channelId || 'default');
        const result = exportEngine.export(buffer, format || 'txt', { startTime, endTime, filter });

        const mimeTypes = { txt: 'text/plain', csv: 'text/csv', json: 'application/json' };
        const ext = format || 'txt';

        res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="serial-log-${Date.now()}.${ext}"`);
        res.send(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- Macros ---
router.get('/macros', (req, res) => {
    res.json({ success: true, macros: macroEngine.list() });
});

router.post('/macros', (req, res) => {
    try {
        const macro = macroEngine.create(req.body);
        res.json({ success: true, macro });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.put('/macros/:id', (req, res) => {
    try {
        const macro = macroEngine.update(req.params.id, req.body);
        res.json({ success: true, macro });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.delete('/macros/:id', (req, res) => {
    try {
        macroEngine.remove(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.post('/macros/:id/run', async (req, res) => {
    try {
        // Pass channelId so macros run on the correct connection
        const channelId = req.body.channelId || 'default';
        await macroEngine.run(req.params.id, serialManager, req.body.params, channelId);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// --- Profiles ---
router.get('/profiles', (req, res) => {
    res.json({ success: true, profiles: profileManager.list() });
});

router.post('/profiles', (req, res) => {
    try {
        const profile = profileManager.create(req.body);
        res.json({ success: true, profile });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.put('/profiles/:id', (req, res) => {
    try {
        const profile = profileManager.update(req.params.id, req.body);
        res.json({ success: true, profile });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.delete('/profiles/:id', (req, res) => {
    try {
        profileManager.remove(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// --- Plugins ---
router.get('/plugins', (req, res) => {
    const plugins = pluginLoader.getAll().map(p => ({
        name: p.name,
        description: p.description || ''
    }));
    res.json({ success: true, plugins });
});

module.exports = router;
