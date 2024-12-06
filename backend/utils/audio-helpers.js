 import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

 
 export async function saveBase64PCM16ToWav(base64Audio, filePath) {
    // Decode the Base64 string to a Buffer
    const pcmBuffer = Buffer.from(base64Audio, 'base64');
  
    // WAV file specifications
    const sampleRate = 36000; // 24kHz
    const numChannels = 1;    // Mono
    const bitsPerSample = 16; // 16-bit PCM
  
    // Calculate necessary values
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = pcmBuffer.length;
  
    // Create WAV header
    const wavHeader = Buffer.alloc(44);
  
    // "RIFF" chunk descriptor
    wavHeader.write('RIFF', 0); // ChunkID
    wavHeader.writeUInt32LE(36 + dataSize, 4); // ChunkSize
    wavHeader.write('WAVE', 8); // Format
  
    // "fmt " sub-chunk
    wavHeader.write('fmt ', 12); // Subchunk1ID
    wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    wavHeader.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
    wavHeader.writeUInt16LE(numChannels, 22); // NumChannels
    wavHeader.writeUInt32LE(sampleRate, 24); // SampleRate
    wavHeader.writeUInt32LE(byteRate, 28); // ByteRate
    wavHeader.writeUInt16LE(blockAlign, 32); // BlockAlign
    wavHeader.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
  
    // "data" sub-chunk
    wavHeader.write('data', 36); // Subchunk2ID
    wavHeader.writeUInt32LE(dataSize, 40); // Subchunk2Size
  
    // Combine header and PCM data
    const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
  
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
  
    // Write the WAV file
    await fs.promises.writeFile(filePath, wavBuffer);
    console.log(`WAV file saved successfully at ${filePath}`);
  }

  export function base64ToPCM(base64String) {
    // Step 1: Decode Base64 to raw binary data
    const binaryString = atob(base64String); // Decode Base64 string to binary string
    const len = binaryString.length;
    
    // Step 2: Create an Uint8Array from the binary string
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
  
    // Step 3: Create a DataView from Uint8Array
    const buffer = bytes.buffer; // ArrayBuffer from Uint8Array
    const dataView = new DataView(buffer);
  
    // Step 4: Convert data to 16-bit PCM array
    const pcmArray = new Int16Array(len / 2); // 2 bytes per 16-bit PCM sample
    for (let i = 0; i < pcmArray.length; i++) {
      // Little-endian format assumed; adjust if your data is big-endian
      pcmArray[i] = dataView.getInt16(i * 2, true);
    }
  
    return pcmArray;
  }

 export function convertAudioMessageDeltasToAudio(audioMessageDeltas) {
    // Convert Base64 encoded string into a Blob
    const audioMessage = audioMessageDeltas.join("");
    const byteCharacters = atob(audioMessage);
    // Convert the string to an ArrayBuffer
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const pcm16ArrayBuffer = byteNumbers.buffer;

    // Create WAV header
    /**
     *
     * @param {*} sampleRate
     * @param {*} numChannels
     * @param {*} bytesPerSample
     * @param {*} numFrames
     * @returns
     */
    const createWavHeader = (
      sampleRate,
      numChannels,
      bytesPerSample,
      numFrames
    ) => {
      const buffer = new ArrayBuffer(44);
      const view = new DataView(buffer);

      /* RIFF identifier */
      view.setUint32(0, 1380533830, false);
      /* file length minus RIFF identifier length and file description length */
      view.setUint32(4, 36 + numFrames * numChannels * bytesPerSample, true);
      /* RIFF type */
      view.setUint32(8, 1463899717, false);
      /* format chunk identifier */
      view.setUint32(12, 1718449184, false);
      /* format chunk length */
      view.setUint32(16, 16, true);
      /* sample format (raw) */
      view.setUint16(20, 1, true);
      /* channel count */
      view.setUint16(22, numChannels, true);
      /* sample rate */
      view.setUint32(24, sampleRate, true);
      /* byte rate (sample rate * block align) */
      view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
      /* block align (channel count * bytes per sample) */
      view.setUint16(32, numChannels * bytesPerSample, true);
      /* bits per sample */
      view.setUint16(34, bytesPerSample * 8, true);
      /* data chunk identifier */
      view.setUint32(36, 1684108385, false);
      /* data chunk length */
      view.setUint32(40, numFrames * numChannels * bytesPerSample, true);

      return buffer;
    };

    const sampleRate = 24000;
    const numChannels = 1;
    const bytesPerSample = 2;
    const numFrames = pcm16ArrayBuffer.byteLength / bytesPerSample;

    const wavHeader = createWavHeader(
      sampleRate,
      numChannels,
      bytesPerSample,
      numFrames
    );

    // Concat wavHeader ArrayBuffer + PCM16 ArrayBuffer
    const audioBuffer = new Uint8Array(
      wavHeader.byteLength + pcm16ArrayBuffer.byteLength
    );
    audioBuffer.set(new Uint8Array(wavHeader), 0);
    audioBuffer.set(new Uint8Array(pcm16ArrayBuffer), wavHeader.byteLength);

    return audioBuffer;

    // play audio

    // Send the array buffer via WebSocke
  }