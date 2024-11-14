import React, { useState, useRef} from 'react';
import { Socket } from 'socket.io-client';
import { WavRecorder } from 'wavtools';
import { FaMicrophone } from 'react-icons/fa6';
import decodeAudio from 'audio-decode';
import { base64EncodeAudio } from '../utils/audio-helpers';

interface AudioRecorderParams {
    socket: Socket;
    emitEvent: (event: string, data: any) => void;
    onAudioRecorded: (buffer: ArrayBuffer) => void;
};

const AudioRecorder: React.FC<AudioRecorderParams> = ({ socket, emitEvent, onAudioRecorded }: AudioRecorderParams) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<WavRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      recorderRef.current = new WavRecorder({sampleRate:24000});
      await recorderRef.current.begin();
      await recorderRef.current.record(async (data) => {
        const { mono } = data;


        // Convert Int16Array to Uint8Array
        const uint8Array = new Uint8Array(mono);
      
        // Convert Uint8Array to a binary string
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
      
        // Encode binary string to Base64
        const base64String = btoa(binary);
        emitEvent('realtime-audio-response', { audioBuffer: base64String });
      
      }, 32000 );

      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        if (recordingTime >= 20) {
          stopRecording();
        }
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      if (recorderRef.current) {
        await recorderRef.current.pause();
        const finalAudio = await recorderRef.current.end();
        
        const arrayBuffer = await finalAudio.blob.arrayBuffer();
        const audioBuffer = await decodeAudio(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const base64Data = base64EncodeAudio(channelData);
        if (socket) {
          emitEvent('realtime-audio-response-end', {});
        } else {
          console.log('Socket not connected');
        }
        
        const audioBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        onAudioRecorded(arrayBuffer);

        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setRecordingTime(0);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  return (
    <div>
      <h2>Audio Recorder</h2>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`
          flex
          flex-row
          gap-2
          items-center
          ${isRecording ? 'bg-red-700 text-white' : 'bg-gray-700 text-white'}
          p-2
          rounded-lg
          hover:bg-gray-600
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
          focus:ring-offset-2
          focus:ring-offset-gray-900
        `}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
        <FaMicrophone />
        <div>
          {recordingTime}s
        </div>
      </button>
      {audioUrl && (
        <div>
          <h3>Playback</h3>
          <audio controls src={audioUrl}></audio>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
