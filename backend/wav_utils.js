/**
 * Guardian AI — WAV File Utilities
 * สร้าง WAV header และรวม PCM chunks เป็นไฟล์ .wav
 */

const fs   = require('fs');
const path = require('path');

/**
 * สร้าง WAV header 44 bytes
 * @param {number} pcmDataLength  - ขนาด PCM data (bytes)
 * @param {number} sampleRate     - Sample rate (default: 16000)
 * @param {number} numChannels    - Channels (default: 1 = mono)
 * @param {number} bitsPerSample  - Bits (default: 16)
 */
function buildWavHeader(pcmDataLength, sampleRate = 16000, numChannels = 1, bitsPerSample = 16) {
    const byteRate    = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign  = numChannels * (bitsPerSample / 8);
    const totalLength = 36 + pcmDataLength;

    const header = Buffer.alloc(44);
    let offset = 0;

    // RIFF chunk
    header.write('RIFF', offset);           offset += 4;
    header.writeUInt32LE(totalLength, offset); offset += 4;
    header.write('WAVE', offset);           offset += 4;

    // fmt chunk
    header.write('fmt ', offset);           offset += 4;
    header.writeUInt32LE(16, offset);       offset += 4;  // chunk size
    header.writeUInt16LE(1, offset);        offset += 2;  // PCM format
    header.writeUInt16LE(numChannels, offset); offset += 2;
    header.writeUInt32LE(sampleRate, offset);  offset += 4;
    header.writeUInt32LE(byteRate, offset);    offset += 4;
    header.writeUInt16LE(blockAlign, offset);  offset += 2;
    header.writeUInt16LE(bitsPerSample, offset); offset += 2;

    // data chunk
    header.write('data', offset);           offset += 4;
    header.writeUInt32LE(pcmDataLength, offset);

    return header;
}

/**
 * รวม PCM buffers และเขียนเป็นไฟล์ .wav
 * @param {Buffer[]} chunks        - Array ของ PCM data buffers
 * @param {string}   outputPath   - Path ของไฟล์ .wav ที่จะสร้าง
 * @param {number}   sampleRate
 * @returns {string} path ของไฟล์ที่สร้าง
 */
function saveWavFile(chunks, outputPath, sampleRate = 16000) {
    const pcmData  = Buffer.concat(chunks);
    const wavHeader = buildWavHeader(pcmData.length, sampleRate);
    const wavData   = Buffer.concat([wavHeader, pcmData]);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, wavData);

    return outputPath;
}

/**
 * คำนวณขนาด buffer ที่ต้องการสำหรับ N วินาที
 * @param {number} seconds
 * @param {number} sampleRate
 * @returns {number} bytes
 */
function audioBytesForSeconds(seconds, sampleRate = 16000) {
    // 16-bit PCM mono = sampleRate * 2 bytes/sample * seconds
    return sampleRate * 2 * seconds;
}

module.exports = { buildWavHeader, saveWavFile, audioBytesForSeconds };
