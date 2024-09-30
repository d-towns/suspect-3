import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';
import { Socket } from 'socket.io-client';
import { Player, ChatMessage, Room } from '../models';

// Initialize socket outside of the component
let socket: Socket | null = null;

type PlayersMap = Map<string, Player>;

interface LobbyState {
  room: Room | null;
  players: PlayersMap;
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

  const [lobbyState, setLobbyState] = useState<LobbyState>({
    room: null,
    players: new Map(),
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

  useEffect(() => {
    const initializeLobby = async () => {
      if (!user || !roomId) return;
      console.log('Initializing lobby for room:', roomId);
      try {
        await roomsService.joinRoom({ roomId, userId: user.id, userEmail: user.email });
        console.log('Joined room:', roomId);
        await requestOnlinePlayersList();
        console.log('Requested online players list');
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

        if (!socket) {
          console.log('Initializing socket');
          socket = await roomsService.initializeSocket();
          setupSocketListeners(socket);
        }
      } catch (error) {
        console.error('Error initializing lobby:', error);
      }
    };

    initializeLobby();

    return () => {
      if (roomId) {
        roomsService.stopHeartbeat(roomId);
        // Optionally leave the room on cleanup
        // if (socket) {
        //   socket.emit('leave-room', roomId);
        // }
      }
    };
  }, [user, roomId]);

  const setupSocketListeners = (socket: Socket) => {
    socket.on('player-list', updatePlayerList);
    socket.on('chat-message', addChatMessage);
    socket.on('player-ready', updatePlayerReadyStatus);
    socket.on('all-players-ready', () =>
      setLobbyState(prevState => ({
        ...prevState,
        gameStatus: { ...prevState.gameStatus, allPlayersReady: true },
      }))
    );
    socket.on('game-started', startGame);
    socket.on('player-left', removePlayer);
    socket.on('player-joined', addPlayer);
  };

  const startGame = () => {
    navigate(`/game/${roomId}`);
  };

  const removePlayer = (player: Player) => {
    console.log('Player left:', player);
    setLobbyState(prevState => {
      const updatedPlayers = new Map(prevState.players);
      updatedPlayers.delete(player.email);
      console.log('Updated players:', Array.from(updatedPlayers.values()));
      return { ...prevState, players: updatedPlayers };
    });
  };

  const addPlayer = (player: Player) => {
    console.log('Player joined:', player);
    setLobbyState(prevState => {
      const updatedPlayers = new Map(prevState.players);
      updatedPlayers.set(player.email, player);
      console.log('Updated players:', Array.from(updatedPlayers.values()));
      return { ...prevState, players: updatedPlayers, 
        gameStatus: { ...prevState.gameStatus, allPlayersReady: false } };
    });
  };

  const requestOnlinePlayersList = async () => {
    try {
      const players = await roomsService.getOnlinePlayers(roomId!);
      console.log('Online players:', players);
      updatePlayerList(players);
    } catch (error) {
      console.error('Failed to get online players list:', error);
    }
  };

  const updatePlayerList = (newPlayers: Player[]) => {
    console.log('Updating player list:', newPlayers);
    setLobbyState(prevState => {
      const updatedPlayers = new Map<string, Player>();
      newPlayers.forEach(player => {
        updatedPlayers.set(player.email, player);
      });
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

  const sendMessage = async () => {
    console.log('Sending message:', lobbyState.chat.inputMessage);
    if (lobbyState.chat.inputMessage && user) {
      try {
        const newMessage: ChatMessage = { userEmail: user.email, message: lobbyState.chat.inputMessage };
        setLobbyState(prevState => ({
          ...prevState,
          chat: {
            messages: [...prevState.chat.messages, newMessage],
            inputMessage: '',
          },
        }));
        await roomsService.sendChatMessage(roomId!, user.email, lobbyState.chat.inputMessage);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const handleStartGameClick = async () => {
    try {
      await roomsService.startGame(roomId!);
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Error starting game: ' + (error as Error).message);
    }
  };

  const handleReadyClick = async () => {
    try {
      const newReadyStatus = !lobbyState.gameStatus.isReady;
      await roomsService.sendReadyStatus(roomId!, user!.email, newReadyStatus);
      setLobbyState(prevState => ({
        ...prevState,
        gameStatus: { ...prevState.gameStatus, isReady: newReadyStatus },
      }));
      updatePlayerReadyStatus({ email: user!.email, isReady: newReadyStatus });
    } catch (error) {
      console.error('Error sending ready status:', error);
      alert('Error updating ready status: ' + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-8">Game Room</h1>
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
                  placeholder="Type your message..."
                  className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                />
                <button
                  onClick={sendMessage}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;