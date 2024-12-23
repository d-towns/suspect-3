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
  createRoom: (mode: string) => void;
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
        cursor:'pointer',
        margin: '0 16px',
      }}
    >
      <Card
        size="3"
        onClick={() => createRoom(mode)}
        className={'hover:scale-105 hover:border transition ease-in-out duration-200'}
      >
        <Inset clip="padding-box" side="top" pb="current">
          <img
            src={imgSrc}
            alt={altText}
            className="block object-cover w-full h-64 sm:h-80 md:h-96 bg-gray-200"
          />
        </Inset>
        <Text as="p" align='center' size={{ lg: '7', md: '5', sm: '4' }} >
          <Strong>{altText} Mode</Strong>
        </Text>
        <Separator my="3" size="4" />
        {description && <Text as="p" size={{ sm: '2', md: '3', lg: '4' }}>{description}</Text>}
        <Separator my="3" size="4" />
      </Card>
    </Box>
  );
};

const PlayMenu: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const createRoom = async (mode: string) => {
    if (!user) return;
    try {
      const roomId = await roomsService.createRoom(user.id, mode);
      navigate(`/lobby/${roomId}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Error creating room: ' + (error as Error).message);
    }
  };


  return (
        <Flex direction={{ initial: 'column', md: 'row' }} gap={'6'} className='h-full self-center items-center justify-self-center '  mt={{xs: '6', md:'0'}}>
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
  );
};

export default PlayMenu;
