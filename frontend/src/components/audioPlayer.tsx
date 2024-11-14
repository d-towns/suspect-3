import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa6';

interface AudioPlayerProps {
    audioData: ArrayBuffer | null;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioData }) => {
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
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
                        setProgress((currentTime / duration) * 100);
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
        { audioData && (
        <div className="audio-player">
            <div className="progress-circle" style={{ position: 'relative', width: '50px', height: '50px' }}>
                <svg className="progress-ring" width="50" height="50">
                    <circle
                        className="progress-ring__circle"
                        stroke="black"
                        strokeWidth="4"
                        fill="transparent"
                        r="22"
                        cx="25"
                        cy="25"
                        style={{ strokeDasharray: '138.2', strokeDashoffset: `${138.2 - (138.2 * progress) / 100}` }}
                    />
                </svg>
                <button onClick={handlePlayPause} className="play-pause-button" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'none', border: 'none', padding: '0', cursor: 'pointer' }}>
                    {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} />}
                </button>
            </div>
        </div>
    )}
    </>
    );
};

export default AudioPlayer;