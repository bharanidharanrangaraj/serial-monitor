/**
 * Export Engine — Generates .txt, .csv, .json log exports
 */

const exportEngine = {
    /**
     * Export buffer entries to specified format
     * @param {Array} buffer - Array of log entries
     * @param {string} format - 'txt' | 'csv' | 'json'
     * @param {Object} options - { startTime, endTime, filter }
     * @returns {string} Formatted output
     */
    export(buffer, format = 'txt', options = {}) {
        let entries = [...buffer];

        // Time range filter
        if (options.startTime) {
            entries = entries.filter(e => e.timestamp >= options.startTime);
        }
        if (options.endTime) {
            entries = entries.filter(e => e.timestamp <= options.endTime);
        }

        // Text filter
        if (options.filter) {
            try {
                const regex = new RegExp(options.filter, 'i');
                entries = entries.filter(e => regex.test(e.data));
            } catch {
                entries = entries.filter(e => e.data.includes(options.filter));
            }
        }

        switch (format) {
            case 'csv':
                return this._toCsv(entries);
            case 'json':
                return this._toJson(entries);
            case 'txt':
            default:
                return this._toTxt(entries);
        }
    },

    _toTxt(entries) {
        const lines = entries.map(e => {
            const ts = new Date(e.timestamp).toISOString();
            const dir = e.direction === 'tx' ? 'TX >' : 'RX <';
            return `[${ts}] ${dir} ${e.data}`;
        });
        return lines.join('\n');
    },

    _toCsv(entries) {
        const header = 'Timestamp,ISO_Time,Direction,Data,Mode';
        const rows = entries.map(e => {
            const iso = new Date(e.timestamp).toISOString();
            const escaped = `"${(e.data || '').replace(/"/g, '""')}"`;
            return `${e.timestamp},${iso},${e.direction},${escaped},${e.mode || 'ascii'}`;
        });
        return [header, ...rows].join('\n');
    },

    _toJson(entries) {
        const output = entries.map(e => ({
            timestamp: e.timestamp,
            isoTime: new Date(e.timestamp).toISOString(),
            direction: e.direction,
            data: e.data,
            mode: e.mode || 'ascii',
            index: e.index
        }));
        return JSON.stringify(output, null, 2);
    }
};

module.exports = exportEngine;
