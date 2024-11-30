import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';
import { User, ChatMessage, GameRoom } from '../models';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../context/ToastContext/toast.context';
import { invitesService } from '../services/invites.service';

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
    getPlayersInRoom, 
    sendChatMessage, 
    startGame, 
    sendReadyStatus 
  } = useSocket();
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
      isReady: false
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
        socket.on('game-created', () => navigate(`/game/${roomId}`));
        
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
    let cleanupListeners : Function;
    if(socket && socket.connected){
        initializeLobby();
        cleanupListeners = setupListeners();
    }

    return () => {
      if(cleanupListeners) cleanupListeners();
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
      updatedPlayers.delete(player.email);
      console.log('Updated players:', Array.from(updatedPlayers.values()));
      return { ...prevState, players: updatedPlayers };
    });
  };

  const addPlayer = (player: User) => {
    console.log('User joined:', player);
    setLobbyState(prevState => {
      const updatedPlayers = new Map(prevState.players);
      updatedPlayers.set(player.email, player);
      console.log('Updated players:', Array.from(updatedPlayers.values()));
      return { ...prevState, players: updatedPlayers, 
        gameStatus: { ...prevState.gameStatus, allPlayersReady: false } };
    });
  };

  const updatePlayerList = (newPlayers: User[]) => {
    console.log('Updating player list:', newPlayers);
    setLobbyState(prevState => {
      const updatedPlayers = new Map<string, User>();
      newPlayers.forEach(player => {
        updatedPlayers.set(player.email, player);
      });
      console.log('Updated players:', Array.from(updatedPlayers.values()));
      return { ...prevState, players: updatedPlayers };
    });
  };

  const updatePlayerReadyStatus = (data: { email: string; isReady: boolean }) => {
    console.log('Updating player ready status:', data);
    setLobbyState(prevState => {
      const updatedPlayers = new Map(prevState.players);
      const player = updatedPlayers.get(data.email);
      if (player) {
        updatedPlayers.set(data.email, { ...player, isReady: data.isReady });
      }
      const allPlayersReady = Array.from(updatedPlayers.values()).every(player => player.isReady);
      console.log('Updated players:', Array.from(updatedPlayers.values()));
      return { ...prevState, players: updatedPlayers, 
        gameStatus: { ...prevState.gameStatus, allPlayersReady } };
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
          messages: [...prevState.chat.messages, { userEmail: user.email, message: lobbyState.chat.inputMessage }],
          inputMessage: '',
        },
      }));
    }
  };

  const handleStartGameClick = () => {
    setLobbyState(prevState => ({
      ...prevState,
      gameStarting: true
    }));
    startGame();
  };

  const handleReadyClick = () => {
    const newReadyStatus = !lobbyState.gameStatus.isReady;
    sendReadyStatus(newReadyStatus);
    
    // Update local state optimistically
    setLobbyState(prevState => {
      const updatedPlayers = new Map(prevState.players);
      if (user) {
        const currentPlayer = updatedPlayers.get(user.email);
        if (currentPlayer) {
          updatedPlayers.set(user.email, { ...currentPlayer, isReady: newReadyStatus });
        }
      }
      return {
        ...prevState,
        players: updatedPlayers,
        gameStatus: { ...prevState.gameStatus, isReady: newReadyStatus },
      };
    });
  };

  const handleSendInvite = async () => {
    try {
      if (!user || !user.id || !roomId) {
        addToast('User not authenticated', undefined);
        return;
      }
      // Replace 'currentGameId' with the actual game ID from your state
      const toGame = roomId; // Assuming `roomId` is available from props or context
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-center text-2xl font-extrabold text-gray-900 mb-8">Lobby</h1>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Connected Players</h2>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {Array.from(lobbyState.players.values()).map((player) => (
                <li key={player.email} className="px-4 py-4 sm:px-6 flex justify-between items-center">
                  <div className="text-sm font-medium text-indigo-600">{player.email}</div>
                  <div className="flex items-center">
                    {lobbyState.room?.host_id === player.id && (
                      <span className="mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Host
                      </span>
                    )}
                    <div
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${player.isReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {player.isReady ? 'Ready' : 'Not Ready'}
                    </div>
                  </div>
                </li>
              ))}
              {lobbyState.players.size === 0 && (
                <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                  No players connected.
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          {lobbyState.gameStatus.userIsHost && (
            <button
              onClick={handleStartGameClick}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${lobbyState.gameStatus.allPlayersReady
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-600 cursor-not-allowed'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              disabled={!lobbyState.gameStatus.allPlayersReady}
            >
              Start Game
            </button>
          )}
          <button
            onClick={handleReadyClick}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${lobbyState.gameStatus.isReady
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            {lobbyState.gameStatus.isReady ? 'Cancel Ready' : 'Ready Up'}
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Lobby Chat</h2>
          </div>
          <div className="border-t border-gray-200">
            <div ref={chatMessagesRef} className="px-4 py-5 sm:p-6 h-64 overflow-y-auto">
              {lobbyState.chat.messages.map((msg, index) => (
                <div key={index} className="mb-2">
                  <span className="font-medium text-indigo-600">{msg.userEmail}: </span>
                  <span className="text-gray-700">{msg.message}</span>
                </div>
              ))}
              {lobbyState.chat.messages.length === 0 && (
                <div className="text-center text-gray-500">No messages yet.</div>
              )}
            </div>
            <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
              <div className="flex rounded-md shadow-sm">
                <input
                  type="text"
                  value={lobbyState.chat.inputMessage}
                  onChange={(e) =>
                    setLobbyState(prevState => ({
                      ...prevState,
                      chat: { ...prevState.chat, inputMessage: e.target.value },
                    }))
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                />
                <button
                  onClick={handleSendMessage}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-6">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Invite Players</h2>
          </div>
          <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
            <div className="flex rounded-md shadow-sm">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email to invite..."
                className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
              />
              <button
                onClick={handleSendInvite}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>

        {/* Game Starting Splash Screen */}
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
      </div>
    </div>
  );
};

export default Lobby;