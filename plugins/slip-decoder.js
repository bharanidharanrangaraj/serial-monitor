/**
 * SLIP Decoder Plugin (RFC 1055)
 * Decodes SLIP-encoded frames from serial data
 */
const SLIP = {
    END: 0xC0,
    ESC: 0xDB,
    ESC_END: 0xDC,
    ESC_ESC: 0xDD
};

module.exports = {
    name: 'SLIP',
    description: 'Decodes SLIP (Serial Line Internet Protocol, RFC 1055) frames',

    /**
     * Decode SLIP frame
     * @param {Buffer} data - Raw data
     * @returns {Object|null}
     */
    decode(data) {
        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data);
        }

        // Look for SLIP END markers
        const startIdx = data.indexOf(SLIP.END);
        if (startIdx === -1) return null;

        // Find second END marker (or use end of buffer)
        let endIdx = data.indexOf(SLIP.END, startIdx + 1);
        if (endIdx === -1) endIdx = data.length;

        const encoded = data.slice(startIdx + 1, endIdx);
        if (encoded.length === 0) return null;

        // Decode SLIP escapes
        const decoded = [];
        let i = 0;
        while (i < encoded.length) {
            if (encoded[i] === SLIP.ESC) {
                i++;
                if (i >= encoded.length) break;
                if (encoded[i] === SLIP.ESC_END) {
                    decoded.push(SLIP.END);
                } else if (encoded[i] === SLIP.ESC_ESC) {
                    decoded.push(SLIP.ESC);
                } else {
                    decoded.push(encoded[i]);
                }
            } else {
                decoded.push(encoded[i]);
            }
            i++;
        }

        const decodedBuf = Buffer.from(decoded);

        return {
            protocol: 'SLIP',
            fields: {
                encodedLength: encoded.length,
                decodedLength: decodedBuf.length,
                decodedHex: decodedBuf.toString('hex'),
                decodedAscii: decodedBuf.toString('ascii').replace(/[^\x20-\x7E]/g, '.'),
                escapedBytes: encoded.length - decoded.length
            },
            display: `[SLIP] ${decodedBuf.length} bytes decoded (${encoded.length} encoded)`
        };
    }
};
