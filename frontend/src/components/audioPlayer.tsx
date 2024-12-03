import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa6';
import { Box, IconButton, Progress, Text, Button} from '@radix-ui/themes';
interface AudioPlayerProps {
    audioData: ArrayBuffer | null;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioData }) => {
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [audioDuration, setAudioDuration] = useState<number>(0);
    const animationFrameId = useRef<number | null>(null);

    useEffect(() => {
        const context = new AudioContext();
        setAudioContext(context);
        console.log('Audio data:', audioData);
        if (!audioData) return;
        context.decodeAudioData(audioData, (buffer) => {
            setAudioBuffer(buffer);
        });

        return () => {
            context.close();
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [audioData]);

    const handlePlayPause = () => {
        if (isPlaying) {
            sourceNode?.stop();
            setIsPlaying(false);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        } else {
            if (audioContext && audioBuffer) {
                console.log('Playing audio');
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start();
                setSourceNode(source);
                setIsPlaying(true);

                const updateProgress = () => {
                    if (audioContext && source.buffer) {
                        const currentTime = audioContext.currentTime;
                        const duration = source.buffer.duration;
                        setAudioDuration(duration);
                        setProgress(Math.min((currentTime / duration) * 100, 100));
                        animationFrameId.current = requestAnimationFrame(updateProgress);
                    }
                };

                updateProgress();

                source.onended = () => {
                    setIsPlaying(false);
                    setProgress(0);
                    if (animationFrameId.current) {
                        cancelAnimationFrame(animationFrameId.current);
                    }
                };
            }
        }
    };

    return (
        <>
        { true && (
            <Box
                onClick={handlePlayPause}
                className='cursor-pointer'
            >
                {isPlaying ? (
                    <>
                <IconButton
                    radius='full'
                    className='w-10 h-10'
                >
                    {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
                </IconButton>
                <Progress mt={'2'} value={progress} max={100} />
                </>
                ) : (
                <Button variant='surface'  size='1'>Replay</Button>
                )}
            </Box>
        )}
        </>
    );
};

export default AudioPlayer;