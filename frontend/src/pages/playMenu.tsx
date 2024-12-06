import React from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';
import {
  Box,
  Flex,
  Text,
  Separator,
  Card,
  Inset,
  Strong,
} from '@radix-ui/themes';


interface ModeCardProps {
  createRoom: () => void;
  imgSrc: string;
  altText: string;
  description?: string;
}

const ModeCard: React.FC<ModeCardProps> = ({
  createRoom,
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
    >
      <Card size="3" onClick={() => createRoom()} className='hover:scale-105 hover:border transition ease-in-out duration-200 '>
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
      </Card>

          
    </Box>
  );
};

const PlayMenu: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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


  return (
    <Flex justify="center" align="center" style={{ height: '100vh', width:'100%'}}>
      <Flex>
        <ModeCard
          createRoom={createRoom}
          imgSrc="single-player-splash-2.webp"
          altText="Single Player"
          description="Enter the interrogation room as a detective! Interview the suspects in a real-time chat and use their testimonies along with the evidence to solve the case."
        />
        <ModeCard
          createRoom={createRoom}
          imgSrc="multi-player-splash.webp"
          description='Play with friends in a private room. Share the invite code with your friends to join the room. The game will start when all players are ready.'
          altText="Multiplayer"
        />
      </Flex>
    </Flex>
  );
};

export default PlayMenu;
