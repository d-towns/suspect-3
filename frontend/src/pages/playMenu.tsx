import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';
import { Box, Flex, Text, Separator, Card, Inset, Strong, Dialog, Button, TextField } from '@radix-ui/themes';
import { useSocketContext } from '../context/SocketContext/socket.context';
import { supabase } from '../utils/supabase-client';
import AnimatedText from '../components/animatedText';
import './playMenu.css';
import { GameRoom } from '../models';
import GameCredits from '../components/GameCredits';

interface ModeCardProps {
  createRoom: (mode: 'single' | 'multi') => void;
  imgSrc: string;
  altText: string;
  description?: string;
  mode: 'single' | 'multi';
  blocked?: boolean;
}

const ModeCard: React.FC<ModeCardProps> = ({
  createRoom,
  imgSrc,
  altText,
  description,
  mode,
  blocked = false
}) => {
  const handleClick = () => {
    if (!blocked) createRoom(mode);
  };

  return (
    <Box
      maxWidth="640px"
      style={{
        position: 'relative',
        flex: 1,
        margin: '0 16px',
        cursor: blocked ? 'not-allowed' : 'pointer',
        opacity: blocked ? 0.6 : 1,
      }}
    >
      <Card
        size="3"
        onClick={handleClick}
        className="hover:scale-105 hover:border transition ease-in-out duration-200"
      >
        <Inset clip="padding-box" side="top" pb="current">
          <img
            src={imgSrc}
            alt={altText}
            className="block object-cover w-full h-64 sm:h-80 md:h-[50vh] bg-gray-200"
          />
        </Inset>
        { blocked && (
          <Text as="p" align={'center'} color="orange" size={{ sm: '2', md: '3', lg: '4' }}>
             Subscribe to Detective Tier to play
          </Text>
        )}
        <Text as="p" align="center" size={{ lg: '7', md: '5', sm: '4' }}>
          <Strong style={{textDecoration: blocked ? 'line-through': 'none'}}>{altText} Mode</Strong>
        </Text>
        <Separator my="3" size="4" />
        {description && (
          <Text as="p" size={{ sm: '2', md: '3', lg: '4' }}>
            {description}
          </Text>
        )}

        <Separator my="3" size="4" />
      </Card>
    </Box>
  );
};

const PlayMenu: React.FC = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const { socket} = useSocketContext();
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [username, setUsername] = useState('');
  const [activeGames, setActiveGames] = useState<GameRoom[]>([]);
  const [showActiveGameModal, setShowActiveGameModal] = useState(false);
  const [roomMode, setRoomMode] = useState<'single' | 'multi' | null>(null);

  useEffect(() => {
    if (user && !user?.username) {
      const defaultName = user?.email?.split('@')[0] || '';
      setUsername(defaultName);
      setShowUsernameModal(true);
      
    }
  }, [user]);


  useEffect(() => {
    if (!user) return;
    roomsService.getActiveGamesForUser(user.id).then((games) => {
      setActiveGames(games);
    });
  }, []);

  const handleSetUsername = async () => {
    try {
     const {data, error} =  await supabase.auth.updateUser({ data: { username } });
      if (error) {
        throw error;
      }
      if(data?.user) {
        const userData = {
          id: data.user.id,
          email: data.user.email || '',
          username: data.user.user_metadata.username,
          stripeCustomerId: data.user.user_metadata.stripeCustomerId
        }
        setUser(userData);
        }
        
      setShowUsernameModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  const createRoom = async (mode: 'single' | 'multi') => {
    if (!user) return;
    // if user has an active game, prompt them to join or end game
    if (activeGames.length > 0) {
      setShowActiveGameModal(true);
      setRoomMode(mode);
      return;
    }
    try {
      const roomId = await roomsService.createRoom(user.id, mode);
      navigate(`/lobby/${roomId}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Error creating room: ' + (error as Error).message);
    }
  };

  return (
    <Box className="flex flex-col items-center">
      <div style={{fontFamily:'Special Elite'}} className='mt-5'><GameCredits/></div>
      <Flex
        direction={{ initial: 'column', md: 'row' }}
        gap="6"
        className="h-full self-center items-center justify-self-center"
        mt={{ initial: '6' }}
      >
        <ModeCard
          createRoom={createRoom}
          imgSrc="single-player-splash.webp"
          altText="Single Player"
          description="Enter the interrogation room as a detective! Interview the suspects in a real-time chat and use their testimonies along with the evidence to solve the case."
          mode="single"
        />
        <ModeCard
          createRoom={createRoom}
          imgSrc="multi-player-splash.webp"
          description="Clear your name as a suspect against the detective! The culprit is among you, but who? Invite your friends and use your wits to deceive the detective and avoid being framed...or found out."
          altText="Multiplayer"
          mode="multi"
          blocked
        />
      </Flex>


 

      <Dialog.Root open={showActiveGameModal} onOpenChange={setShowActiveGameModal}>
        <Dialog.Content>
          <Dialog.Title>You have an active game</Dialog.Title>
          <Dialog.Description>
            Do you want to rejoin or end your previous game? Ending it will result in a loss and rating update.
          </Dialog.Description>
          <Flex gap="3" mt="4" justify="center">
            <Button
              onClick={() => {
                navigate(`/game/${activeGames[0]?.id}`);
                setShowActiveGameModal(false);
              }}
            >
              Rejoin
            </Button>
            <Button
              variant="soft"
              onClick={async () => {
                socket?.emit('game:end', { roomId: activeGames[0]?.id, userId: user?.id });
                setShowActiveGameModal(false);

                try {
                  if(!user) return;
                  const roomId = await roomsService.createRoom(user.id, roomMode || 'single');
                  navigate(`/lobby/${roomId}`);
                } catch (error) {
                  console.error('Error creating room:', error);
                  alert('Error creating room: ' + (error as Error).message);
                }
              }}
            >
              End and Create New
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
      <Dialog.Root open={showUsernameModal} onOpenChange={setShowUsernameModal}>
        <Dialog.Content className='flex flex-col items-center justify-center'>
          <Dialog.Title className="mb-4">
            <AnimatedText message="Welcome to the force, Detective!" className='dialogHeader' animationSpeed={80} />
          </Dialog.Title>
          <Dialog.Description className="mb-4">
            Choose a username to be displayed in game.
          </Dialog.Description>
          <TextField.Root size="3" placeholder="Username"             className="border w-full"
            value={username}
            onChange={(e) => setUsername(e.target.value)}>
            <TextField.Slot side="right" px="1">
            <Button className='w-full' onClick={handleSetUsername}>
            Save
          </Button>
            </TextField.Slot>
          </TextField.Root>

        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default PlayMenu;
