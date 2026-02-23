/**
 * Modbus RTU Decoder Plugin
 * Decodes Modbus RTU frames from raw serial data
 */
module.exports = {
    name: 'Modbus RTU',
    description: 'Decodes Modbus RTU protocol frames (function codes, addresses, CRC)',

    /**
     * Attempt to decode a Modbus RTU frame
     * @param {Buffer} data - Raw data buffer
     * @returns {Object|null} Decoded frame or null
     */
    decode(data) {
        // Minimum Modbus RTU frame: address(1) + function(1) + data(n) + crc(2)
        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data);
        }
        if (data.length < 4) return null;

        const slaveAddr = data[0];
        const funcCode = data[1];
        const crcReceived = data.readUInt16LE(data.length - 2);
        const crcCalculated = this._crc16(data.slice(0, data.length - 2));
        const crcValid = crcReceived === crcCalculated;

        const functionNames = {
            0x01: 'Read Coils',
            0x02: 'Read Discrete Inputs',
            0x03: 'Read Holding Registers',
            0x04: 'Read Input Registers',
            0x05: 'Write Single Coil',
            0x06: 'Write Single Register',
            0x0F: 'Write Multiple Coils',
            0x10: 'Write Multiple Registers',
            0x17: 'Read/Write Multiple Registers'
        };

        // Check if function code is recognized or is an exception
        const isException = (funcCode & 0x80) !== 0;
        const baseFuncCode = isException ? (funcCode & 0x7F) : funcCode;

        if (!functionNames[baseFuncCode] && !isException) return null;

        const payload = data.slice(2, data.length - 2);

        return {
            protocol: 'Modbus RTU',
            fields: {
                slaveAddress: slaveAddr,
                functionCode: `0x${funcCode.toString(16).padStart(2, '0')}`,
                functionName: isException ? `Exception (${functionNames[baseFuncCode] || 'Unknown'})` : (functionNames[funcCode] || 'Unknown'),
                isException,
                payload: payload.toString('hex'),
                payloadLength: payload.length,
                crcReceived: `0x${crcReceived.toString(16).padStart(4, '0')}`,
                crcValid
            },
            display: `[Modbus] Slave:${slaveAddr} Func:${functionNames[baseFuncCode] || '0x' + baseFuncCode.toString(16)} ${isException ? 'EXCEPTION' : ''} CRC:${crcValid ? 'OK' : 'FAIL'}`
        };
    },

    /**
     * CRC-16/Modbus
     */
    _crc16(buffer) {
        let crc = 0xFFFF;
        for (let i = 0; i < buffer.length; i++) {
            crc ^= buffer[i];
            for (let j = 0; j < 8; j++) {
                if (crc & 1) {
                    crc = (crc >> 1) ^ 0xA001;
                } else {
                    crc >>= 1;
                }
            }
        }
        return crc;
    }
};
