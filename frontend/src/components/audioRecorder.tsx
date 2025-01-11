import React, { useState, useRef, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { WavRecorder } from 'wavtools'
import { FaMicrophone } from 'react-icons/fa6';
import { Flex, IconButton, Button, Spinner } from '@radix-ui/themes';

interface AudioRecorderParams {
  socket: Socket;
  emitEvent: (event: string, data: any) => void;
  onAudioRecorded: (buffer: ArrayBuffer) => void;
  loadingSessionEnd: boolean;
  handleEndInterrogation: () => void;
};

const AudioRecorder: React.FC<AudioRecorderParams> = ({ socket, emitEvent, onAudioRecorded, loadingSessionEnd, handleEndInterrogation }: AudioRecorderParams) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  // const [recordingTime, setRecordingTime] = useState<number>(0);
  const recorderRef = useRef<WavRecorder | null>(null);

  useEffect(() => {
    if (socket) {
      socket.on('round-end', () => {
        if (isRecording) {
          stopRecording(true);
        }
      });

      return () => {
        socket.off('round-end');
      };
    }
  }, [socket, isRecording]);

  const startRecording = async () => {
    try {
      recorderRef.current = new WavRecorder({ sampleRate: 24000 });
      await recorderRef.current.begin();
      await recorderRef.current.record(async (data: {
        mono: Int16Array;
        raw: Int16Array;
      }) => {
        const { mono } = data;
        console.log('Recording started', mono);

        // Convert Int16Array to Uint8Array
        const uint8Array = new Uint8Array(mono);

        // Convert Uint8Array to a binary string
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }

        // Encode binary string to Base64
        const base64String = btoa(binary);
        emitEvent('realtime:audio:delta:user', { audioBuffer: base64String });

      }, 32000);

      setIsRecording(true);
      // timerRef.current = setInterval(() => {
      //   setRecordingTime(prev => prev + 1);
      //   if (recordingTime >= 20) {
      //     stopRecording();
      //   }
      // }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = async (rejectCallback: boolean = false) => {
    try {
      if (recorderRef.current) {
        await recorderRef.current.pause();
        const finalAudio = await recorderRef.current.end();

        const arrayBuffer = await finalAudio.blob.arrayBuffer();
        if (socket) {
          emitEvent('realtime-audio-response-end', {});
        } else {
          console.log('Socket not connected');
        }


        if (!rejectCallback) onAudioRecorded(arrayBuffer);

        setIsRecording(false);
        // if (timerRef.current) {
        //   clearInterval(timerRef.current);
        // }
        // setRecordingTime(0);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  return (
    <Flex direction="row" align="center" justify='center' gap="4" mt={'5'}>
      <IconButton
        style={{ width: '108px', height: '48px' }}
        variant={isRecording ? 'solid' : 'surface'}
        onClick={isRecording ? () => stopRecording() : startRecording}
        className="transition-transform duration-200 hover:scale-110"
        aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
        aria-disabled={loadingSessionEnd}
        disabled={loadingSessionEnd}
      >
        <FaMicrophone size={24} />

      </IconButton>
      <Button
        size="4"
        variant='outline'
        radius='small'
        className='py-6'
        disabled={loadingSessionEnd}
        onClick={() => {
          stopRecording();
          handleEndInterrogation()
        }}
      >
        {loadingSessionEnd ? <Spinner /> : 'End Interrogation'}
      </Button>
    </Flex>
  );
};

export default AudioRecorder;
