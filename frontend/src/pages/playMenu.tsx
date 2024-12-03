import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';
import { useSocketContext } from '../context/SocketContext/socket.context';
import {
  Box,
  Button,
  Flex,
  Text,
  Separator,
  Card,
  Inset,
  Strong,
} from '@radix-ui/themes';

type Mode = 'single' | 'multi' | null;

interface ChooseGameProps {
  createRoom: () => void;
  roomToJoinId: string;
  setRoomToJoinId: React.Dispatch<React.SetStateAction<string>>;
  navigateToRoom: (roomId: string) => void;
}

const ChooseGame: React.FC<ChooseGameProps> = ({
  createRoom,
  roomToJoinId,
  setRoomToJoinId,
  navigateToRoom,
}) => {
  return (
    <Box>
      <Flex direction="column" gap="4" mt="4">
        <Button onClick={createRoom}>Create New Game </Button>
      </Flex>
      </Box>
  );
};

interface ModeCardProps {
  setMode: (mode: Mode) => void;
  mode: Mode;
  chooseGameProps: ChooseGameProps;
  imgSrc: string;
  altText: string;
  description?: string;
}

const ModeCard: React.FC<ModeCardProps> = ({
  setMode,
  mode,
  chooseGameProps,
  imgSrc,
  altText,
  description
}) => {
  return (
    <Box
      maxWidth="640px"
      style={{
        position: 'relative',
        flex: 1,
        cursor: 'pointer',
        margin: '0 16px',
      }}
      onClick={() => setMode(mode)}
    >
      <Card size="3">
        <Inset clip="padding-box" side="top" pb="current">
          <img
            src={imgSrc}
            alt={altText}
            style={{
              display: 'block',
              objectFit: 'cover',
              width: '100%',
              height: 440,
              backgroundColor: 'var(--gray-5)',
            }}
          />
        </Inset>
        <Text as="p" align='center' size="8">
          <Strong>{altText} Mode</Strong>
        </Text>
        <Separator my="3" size="4" />
        {description && <Text as="p" size={'4'}>{description}</Text>}
        <Separator my="3" size="4" />
        <ChooseGame {...chooseGameProps} />
      </Card>

          
    </Box>
  );
};

const PlayMenu: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomToJoinId, setRoomToJoinId] = useState<string>('');
  const [mode, setMode] = useState<Mode>('single');

  const createRoom = async () => {
    if (!user) return;
    try {
      const roomId = await roomsService.createRoom(user.id);
      navigate(`/lobby/${roomId}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Error creating room: ' + (error as Error).message);
    }
  };

  const navigateToRoom = async (roomId: string) => {
    const room = await roomsService.getRoom(roomId);
    if (room) navigate(`/lobby/${roomId}`);
    else {
      alert('Room not found');
    }
  };

  const cardProps = {
    roomToJoinId,
    setRoomToJoinId,
    navigateToRoom,
    createRoom,
  };

  return (
    <Flex justify="center" align="center" style={{ height: '100vh', width:'100%'}}>
      <Flex>
        <ModeCard
          setMode={setMode}
          mode="single"
          chooseGameProps={cardProps}
          imgSrc="single-player-splash-2.webp"
          altText="Single Player"
          description="Enter the interrogation room as a detective! Interview the suspects in a real-time chat and use their testimonies along with the evidence to solve the case."
        />
        <ModeCard
          setMode={setMode}
          mode="multi"
          chooseGameProps={cardProps}
          imgSrc="multi-player-splash.webp"
          description='Play with friends in a private room. Share the invite code with your friends to join the room. The game will start when all players are ready.'
          altText="Multiplayer"
        />
      </Flex>
    </Flex>
  );
};

export default PlayMenu;
