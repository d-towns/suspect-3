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
  mode: 'single' | 'multi';
}

const ModeCard: React.FC<ModeCardProps> = ({
  createRoom,
  imgSrc,
  altText,
  description,
  mode
}) => {
  return (
    <Box
      maxWidth="640px"
      style={{
        position: 'relative',
        flex: 1,
        cursor: mode === 'single' ? 'default' : 'pointer',
        margin: '0 16px',
      }}
    >
      <Card 
        size="3" 
        onClick={() => mode === 'multi' && createRoom()} 
        className={mode === 'multi' ? 'hover:scale-105 hover:border transition ease-in-out duration-200' : ''}
        style={{ opacity: mode === 'single' ? 0.5 : 1 }}
      >
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
        <Text as="p" align='center' size={{ lg: '7', md: '5', sm: '4'}} >
          <Strong>{altText} Mode</Strong>
        </Text>
        <Separator my="3" size="4" />
        {description && <Text as="p" size={{ sm: '2', md: '3', lg: '4' }}>{description}</Text>}
        <Separator my="3" size="4" />
      </Card>

      {mode === 'single' && (
        <Card
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '20px',
            borderRadius: '8px',
          }}
        >
          <Text as="p" align='center' style={{ color: 'white' }} size="6">
            <Strong>Coming Soon!</Strong>
          </Text>
        </Card>
      )}
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
          mode="single"
        />
        <ModeCard
          createRoom={createRoom}
          imgSrc="multi-player-splash.webp"
          description='Clear your name as a suspect against the detective! The culprit is among you, but who? Invite your friends and use your wits to deceive the detective and avoid being framed...or found out.'
          altText="Multiplayer"
          mode="multi"
        />
      </Flex>
    </Flex>
  );
};

export default PlayMenu;
