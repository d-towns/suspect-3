import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SingleGame from './SingleplayerGame';
import MultiplayerGame from './MultiplayerGame';
import { roomsService } from '../services/rooms.service';
import { GameRoom } from '../models';

const RenderGame: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRoom = async () => {
            try {
                if (roomId) {
                    const room = await roomsService.getRoom(roomId);
                    setGameRoom(room);
                } else {
                    setError('No room ID provided.');
                }
            } catch (err) {
                setError('Failed to fetch game room.');
            } finally {
                setLoading(false);
            }
        };

        fetchRoom();
    }, [roomId]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error || !gameRoom) {
        return <div>Error: {error}</div>;
    }

    return gameRoom.mode === 'single' ? (
        <SingleGame  />
    ) : (
        <MultiplayerGame />
    );
};

export default RenderGame;