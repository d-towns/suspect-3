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

  /**
   * only record for 15 seconds
   * stream the data back to the server 
   */

  const float32ToPCM16 = (audioBuffer : AudioBuffer) => {
    const rawPCMData = audioBuffer.getChannelData(0); // Get audio data from the first channel
    const pcm16 = new Int16Array(rawPCMData.length);
  
    for (let i = 0; i < rawPCMData.length; i++) {
      pcm16[i] = Math.max(-1, Math.min(1, rawPCMData[i])) * 0x7fff; // Scale to Int16
    }
  
    return pcm16.buffer; // Return as ArrayBuffer
  };

  const arrayBufferToBase64 = (buffer: ArrayBufferLike) => {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return btoa(binary); // Convert to Base64 string
  };

  export { convertAudioData, float32ToPCM16, arrayBufferToBase64 };