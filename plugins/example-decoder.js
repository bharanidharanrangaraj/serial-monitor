/**
 * Example Protocol Decoder — Template for custom decoders
 * 
 * To create your own decoder:
 * 1. Copy this file and rename it (e.g., my-protocol-decoder.js)
 * 2. Update the `name` and `description` fields
 * 3. Implement the `decode(data)` function
 * 4. Place the file in the /plugins directory
 * 5. Restart the server (or trigger hot-reload)
 * 
 * The decode function receives a Buffer and should return:
 *   { protocol, fields: {...}, display: "human-readable string" }
 * Or return null if the data doesn't match this protocol.
 */
module.exports = {
    name: 'Example Decoder',
    description: 'Template protocol decoder — customize this for your own protocol',

    /**
     * @param {Buffer} data - Raw serial data
     * @returns {Object|null} Decoded result or null
     */
    decode(data) {
        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data);
        }

        // Example: detect a custom header byte 0xAA
        if (data.length < 3 || data[0] !== 0xAA) return null;

        const length = data[1];
        const payload = data.slice(2, 2 + length);

        return {
            protocol: 'Custom',
            fields: {
                header: '0xAA',
                length: length,
                payload: payload.toString('hex')
            },
            display: `[Custom] Len:${length} Data:${payload.toString('hex')}`
        };
    }
};
