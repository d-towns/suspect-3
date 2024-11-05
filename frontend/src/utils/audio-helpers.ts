const convertAudioData = async (event : BlobEvent) => {
    if (event.data.size > 0) {
      console.log('Received audio chunk:', event.data);
      const audioCxt = new AudioContext();
      const arrayBuffer = await event.data.arrayBuffer();
      const audioBuffer = await audioCxt.decodeAudioData(arrayBuffer);
      const pcm16ArrayBuffer = float32ToPCM16(audioBuffer);
      const base64String = arrayBufferToBase64(pcm16ArrayBuffer);
      return base64String;
    }
  }

  const float32ToPCM16 = (audioBuffer : AudioBuffer) => {
    const rawPCMData = audioBuffer.getChannelData(0); // Get audio data from the first channel
    const pcm16 = new Int16Array(rawPCMData.length);
  
    for (let i = 0; i < rawPCMData.length; i++) {
      pcm16[i] = Math.max(-1, Math.min(1, rawPCMData[i])) * 0x7fff; // Scale to Int16
    }
  
    return pcm16.buffer; // Return as ArrayBuffer
  };

  function floatTo16BitPCM(float32Array: any) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  async function wavBlobToBase64PCM16(wavBlob: Blob) {
    console.log('Converting WAV blob to Base64 PCM16');
    const arrayBuffer = await wavBlob.arrayBuffer(); // Convert Blob to ArrayBuffer
    const dataView = new DataView(arrayBuffer);
  
    // Create a PCM16 Int16Array from the WAV data (skipping the 44-byte header)
    const pcm16Array = new Int16Array((arrayBuffer.byteLength - 44) / 2);
    for (let i = 44, j = 0; i < dataView.byteLength; i += 2, j++) {
      pcm16Array[j] = dataView.getInt16(i, true); // Read as little-endian PCM16
    }
  
    // Convert the PCM16 Int16Array to a Base64 string
    const pcm16Buffer = new Uint8Array(pcm16Array.buffer);
    const binaryString = String.fromCharCode(...pcm16Buffer);
    return btoa(binaryString); // Encode as Base64
  }

  const base64EncodeAudio = (float32Array: any) => {
    const arrayBuffer = floatTo16BitPCM(float32Array);
    let binary = '';
    let bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000; // 32KB chunk size
    for (let i = 0; i < bytes.length; i += chunkSize) {
      let chunk = bytes.subarray(i, i + chunkSize);
      // turn the chunk into a number array
      binary += String.fromCharCode.apply(null, [...chunk]);
    }
    return btoa(binary);
  }

  const PCMtoBase64 = (pcmData: Int16Array) => {
    let binary = '';
    let bytes = new Uint8Array(pcmData);
    const chunkSize = 0x8000; // 32KB chunk size
    for (let i = 0; i < bytes.length; i += chunkSize) {
      let chunk = bytes.subarray(i, i + chunkSize);
      // turn the chunk into a number array
      binary += String.fromCharCode.apply(null, [...chunk]);
    }
    return btoa(binary);
  }

  const arrayBufferToBase64 = (buffer: ArrayBufferLike) => {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return btoa(binary); // Convert to Base64 string
  };

  export { convertAudioData, float32ToPCM16, arrayBufferToBase64,PCMtoBase64, base64EncodeAudio,wavBlobToBase64PCM16 };