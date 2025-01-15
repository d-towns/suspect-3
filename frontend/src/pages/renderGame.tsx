import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SingleGame from './SinglePlayerGame/SingleplayerGame';
import MultiplayerGame from './MultiplayerGame/MultiplayerGame';
import { roomsService } from '../services/rooms.service';
import { GameRoom } from '../models';
import { useAuth } from '../context/auth.context';
import { Button, Card, Flex, Heading } from '@radix-ui/themes';
import Loading from '../components/loading';

const RenderGame: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const {user} = useAuth();
    const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
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
            }
        };



        fetchRoom();
    }, [roomId]);


    if(!user || !gameRoom) {
        return <Loading />
    }


    if(gameRoom?.host_id !== user?.id){
        return (
            <Flex align="center" justify="center" >
            <Card style={{ padding: '24px', textAlign: 'center' }}>
                <Heading style={{ fontFamily: 'Special Elite, sans-serif', marginBottom: '16px' }}>
                    This isn't your case, Detective
                </Heading>
                <Button
                variant='surface'
                size={'4'}
                >
                    <Link to='/play'>Main Menu</Link>
                </Button>
            </Card>
            </Flex>
        )
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