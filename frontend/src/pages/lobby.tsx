import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth.context';
import { roomsService } from '../services/rooms.service';
import { useSocketContext } from '../context/SocketContext/socket.context';
import { useToast } from '../context/ToastContext/toast.context';
import { invitesService } from '../services/invites.service';
import {
  Box,
  Button,
  Flex,
  Text,
  TextField,
  Heading,
  Card,
  Separator,
  ScrollArea,
  Badge,
  Callout,
} from '@radix-ui/themes';
import { ChatMessage } from '../models/chat-message.model';
import { GameRoom } from '../models/room.model';
import { User } from '../models/user.model';
import { IoAlertCircle } from "react-icons/io5";

type PlayersMap = Map<string, User>;

interface LobbyState {
  room: GameRoom | null;
  players: PlayersMap;
  gameStarting: boolean;
  chat: {
    messages: ChatMessage[];
    inputMessage: string;
  };
  gameStatus: {
    userIsHost: boolean;
    allPlayersReady: boolean;
    isReady: boolean;
  };
}

export const Lobby: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const {
    socket,
    isConnected,
    joinRoom,
    getPlayersInRoom,
    sendChatMessage,
    startGame,
    sendReadyStatus,
  } = useSocketContext();
  const { addToast } = useToast();

  const [lobbyState, setLobbyState] = useState<LobbyState>({
    room: null,
    players: new Map(),
    gameStarting: false,
    chat: {
      messages: [],
      inputMessage: '',
    },
    gameStatus: {
      userIsHost: false,
      allPlayersReady: false,
      isReady: false,
    },
  });

  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    const initializeLobby = async () => {
      console.log(`user: ${user}`)
      console.log(`roomId: ${roomId}`)
      if (!user || !roomId) return;
      console.log('Initializing lobby for room:', roomId);
      try {
        joinRoom(roomId);
        const players = await getPlayersInRoom();
        console.log('Players in room:', players);
        updatePlayerList(players);
        const room = await roomsService.getRoom(roomId);

        console.log('Room:', room);

        setLobbyState(prevState => ({
          ...prevState,
          room,
          gameStatus: {
            ...prevState.gameStatus,
            userIsHost: room.host_id === user.id,
          },
        }));
      } catch (error) {
        console.error('Error initializing lobby:', error);
      }
    };


    const setupListeners = () => {
      if (socket && isConnected) {
        socket.on('player-list', updatePlayerList);
        socket.on('chat-message', addChatMessage);
        socket.on('player-ready', updatePlayerReadyStatus);
        socket.on('all-players-ready', () =>
          setLobbyState(prevState => ({
            ...prevState,
            gameStatus: { ...prevState.gameStatus, allPlayersReady: true },
          }))
        );
        socket.on('game-creating', () => {
          setLobbyState(prevState => ({
            ...prevState,
            gameStarting: true
          }));
        });
        socket.on('game:creating', () => {
          setLobbyState(prevState => ({
            ...prevState,
            gameStarting: true
          }));
        });
        socket.on('game:created', () => navigate(`/game/${roomId}`));

        socket.on('player-left', removePlayer);
        socket.on('player-joined', addPlayer);
      }

      return () => {
        if (socket) {
          socket.off('player-list');
          socket.off('chat-message');
          socket.off('player-ready');
          socket.off('all-players-ready');
          socket.off('game-created');
          socket.off('player-left');
          socket.off('player-joined');
        }
      };
    }
    let cleanupListeners: Function;
    if (socket && socket.connected) {
      initializeLobby();
      cleanupListeners = setupListeners();
    }

    return () => {
      if (cleanupListeners) cleanupListeners();
    }
  }, [socket, isConnected]);

  useEffect(() => {
    if (lobbyState.room && typeof lobbyState.room.game_state !== 'string' && lobbyState.room.game_state?.status == 'active') {
      navigate(`/game/${roomId}`);
    }
  }, [lobbyState.room, navigate, roomId]);

  const removePlayer = (player: User) => {
    console.log('User left:', player);
    setLobbyState(prevState => {
      const updatedPlayers = new Map(prevState.players);
      updatedPlayers.delete(player.username);
      console.log('Updated players:', Array.from(updatedPlayers.values()));
      return { ...prevState, players: updatedPlayers };
    });
  };

  const addPlayer = (player: User) => {
    console.log('User joined:', player);
    setLobbyState(prevState => {
      const updatedPlayers = new Map(prevState.players);
      updatedPlayers.set(player.username, player);
      console.log('Updated players:', Array.from(updatedPlayers.values()));
      return {
        ...prevState, players: updatedPlayers,
        gameStatus: { ...prevState.gameStatus, allPlayersReady: false }
      };
    });
  };

  const updatePlayerList = (newPlayers: User[]) => {
    console.log('Updating player list:', newPlayers);
    setLobbyState(prevState => {
      const updatedPlayers = new Map<string, User>();
      newPlayers.forEach(player => {
        updatedPlayers.set(player.username, player);
      });
      console.log('Updated players:', Array.from(updatedPlayers.values()));
      return { ...prevState, players: updatedPlayers };
    });
  };

  const updatePlayerReadyStatus = (data: { email: string; username: string, isReady: boolean }) => {
    console.log('Updating player ready status:', data);
    setLobbyState(prevState => {
      const updatedPlayers = new Map(prevState.players);
      const player = updatedPlayers.get(data.username);
      if (player) {
        updatedPlayers.set(data.username, { ...player, isReady: data.isReady });
      }
      const allPlayersReady = Array.from(updatedPlayers.values()).every(player => player.isReady);
      console.log('Updated players:', Array.from(updatedPlayers.values()));
      return {
        ...prevState, players: updatedPlayers,
        gameStatus: { ...prevState.gameStatus, allPlayersReady }
      };
    });
  };

  const addChatMessage = (messageData: ChatMessage) => {
    console.log('Received chat message:', messageData);
    setLobbyState(prevState => ({
      ...prevState,
      chat: {
        ...prevState.chat,
        messages: [...prevState.chat.messages, messageData],
      },
    }));
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  const handleSendMessage = () => {
    console.log('Sending message:', lobbyState.chat.inputMessage, user);
    if (lobbyState.chat.inputMessage && user) {
      sendChatMessage(lobbyState.chat.inputMessage);
      setLobbyState(prevState => ({
        ...prevState,
        chat: {
          messages: [...prevState.chat.messages, { userEmail: user.username, message: lobbyState.chat.inputMessage }],
          inputMessage: '',
        },
      }));
    }
  };

  const handleStartGameClick = () => {
    if(!lobbyState.room) { return ;}
    startGame(lobbyState.room.mode);
  };

  const handleReadyClick = () => {
    const newReadyStatus = !lobbyState.gameStatus.isReady;
    sendReadyStatus(newReadyStatus);

    // Update local state optimistically
    setLobbyState(prevState => {
      const updatedPlayers = new Map(prevState.players);
      if (user) {
        const currentPlayer = updatedPlayers.get(user.username);
        if (currentPlayer) {
          updatedPlayers.set(user.username, { ...currentPlayer, isReady: newReadyStatus });
        }
      }
      const allPlayersReady = Array.from(updatedPlayers.values()).every(player => player.isReady);
      return {
        ...prevState,
        players: updatedPlayers,
        gameStatus: { ...prevState.gameStatus, isReady: newReadyStatus, allPlayersReady },
      };
    });
  };

  const handleSendInvite = async () => {
    try {
      if (!user || !user.id || !roomId) {
        addToast('User not authenticated', undefined);
        return;
      }
      const toGame = roomId;
      const fromUser = user.id;

      await invitesService.createInvite(fromUser, inviteEmail, toGame);
      addToast('Invite sent');
      setInviteEmail('');
    } catch (error) {
      console.error('Failed to send invite:', error);
      addToast('Failed to send invite');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <Flex direction="column" align="center" px="4" py="4" mt='4' className='w-full'>
      <Card size="3" style={{ width: '100%', maxWidth: '800px' }}>
        <Heading size="6" mb="4" align="center">
          Lobby - {lobbyState.room?.id.split('-')[0] || 'Room'}
        </Heading>
        <Flex direction={{ initial: 'column' }} gap="4" mt="4">
          {/* Player List */}
          <Box mb='4'>
            <Heading size="4" mb="2">
              Players
            </Heading>
            <Separator size={'4'} />
            <Box mt="4">
              {Array.from(lobbyState.players.values()).map((player, index) => (

                <Flex key={player.username || player.email} align="center" gap="2" mt="4">
                  <Text size={'4'}>{index + 1}. </Text>
                  <Text size={'4'}>{player.username || player.email}</Text>
                  {player.isReady ? <Badge color="green">Ready</Badge> : <Badge color="red">Not Ready</Badge>}
                  {player.username === user?.username && <Badge color="blue">You</Badge>}
                  {player?.id === lobbyState.room?.host_id && <Badge color="orange">Host</Badge>}
                  {lobbyState.gameStatus.userIsHost && player.username !== user?.username && (
                    <Button onClick={() => console.log('Kick player:', player)}>Kick</Button>)
                  }
                </Flex>
              ))}
              <Box className='mt-4'>
                {lobbyState.room?.mode == 'multi' && (
                  <>{
lobbyState.players.size < 2    &&        <Callout.Root size='1' className='my-2 flex items-center'>
                  <Callout.Icon>
                    <IoAlertCircle />
                  </Callout.Icon>
                  <Callout.Text>
                    {lobbyState.players.size < 2 && 'A minimum of 2 players are required to start the game. Invite your friends to join!'}
                  </Callout.Text>
                </Callout.Root>}

                <Flex align="center" gap="2" mt='4'>
                  <TextField.Root
                    placeholder="Invite other players by email"
                    value={inviteEmail}
                    style={{ flex: 1 }}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button onClick={handleSendInvite}>Send Invite</Button>
                </Flex>
                </>)}
              </Box>
            </Box>
          </Box>

          {/* Chat Section */}
          <Box>
            <Heading size="4" mb="2">
              Chat
            </Heading>
            <Separator size={'4'} />
            <ScrollArea style={{ height: '200px', marginTop: '8px' }}>
              <Box ref={chatMessagesRef} pr="2" className='flex flex-col'>
                {lobbyState.chat.messages.map((message, index) => (
                  <Text key={index} mt="2">
                    <strong>{message.userEmail}:</strong> {message.message}
                  </Text>
                ))}
              </Box>
            </ScrollArea>
            <Flex mt="2" gap="2" >
              <TextField.Root
                placeholder="Type a message..."
                value={lobbyState.chat.inputMessage}
                onChange={(e) =>
                  setLobbyState((prevState) => ({
                    ...prevState,
                    chat: { ...prevState.chat, inputMessage: e.target.value },
                  }))
                }
                onKeyDown={handleKeyDown}
                style={{ flex: 1 }}
              />
              <Button onClick={handleSendMessage}>Send</Button>
            </Flex>
          </Box>
        </Flex>

        {/* Actions */}
        <Flex mt="4" gap="2" justify="center">
          {lobbyState.gameStatus.userIsHost && (
            <Button
              onClick={handleStartGameClick}
              style={{ flex: 1 }}
              disabled={
                !lobbyState.gameStatus.allPlayersReady || lobbyState.gameStarting || lobbyState.players.size < 2 && lobbyState.room?.mode == 'multi' 
              }
            >
              {lobbyState.gameStarting ? 'Starting Game...' : 'Start Game'}
            </Button>
          )}
          <Button
            style={{ flex: 1 }}
            color={lobbyState.gameStatus.isReady ? 'red' : 'green'}
            onClick={handleReadyClick}
          >
            {lobbyState.gameStatus.isReady ? 'Cancel Ready' : 'Ready Up'}
          </Button>
          {/* Invite Player */}
          {lobbyState.gameStarting && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-lg shadow-xl text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Game Starting</h2>
                <p className="text-gray-600 mb-6">Prepare yourself for the interrogation!</p>
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-4">This may take a few moments...</p>
              </div>
            </div>
          )}
        </Flex>
      </Card>
    </Flex>
  );
};

export default Lobby;