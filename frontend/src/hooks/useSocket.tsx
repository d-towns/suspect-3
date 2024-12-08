import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth.context';
import { User, Invite } from '../models';
import { useToast } from '../context/ToastContext/toast.context';

const SOCKET_SERVER_URL = import.meta.env.VITE_NODE_ENV === 'dev' ? import.meta.env.VITE_DEV_SOCKET_URL : import.meta.env.VITE_PROD_SOCKET_URL;
const HEARTBEAT_INTERVAL = 5000; // 5 seconds


export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { roomId } = useParams<{ roomId?: string }>();
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const connectSocket = useCallback(() => {
    console.warn('Connecting socket');
    const newSocket = io(SOCKET_SERVER_URL, {
      path: '/socket.io',
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      console.warn('Disconnecting socket');
      newSocket.disconnect();

    };
  }, []);

  const emitEvent = useCallback((event: string, data: any) => {
    if (socket && isConnected) {
      console.log(`Emitting event: ${event} with data: ${JSON.stringify(data)}`);
      socket.emit(event, data);
    }
  } , [socket, isConnected]);

  const joinRoom = useCallback((gameRoomId : string | null = null) => {
    console.log('join room called')
    if (socket && isConnected && (roomId || gameRoomId) && user) {
      socket.emit('join-room', { roomId: (roomId || gameRoomId), userId: user.id, userEmail: user.email, userName: user.username }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          console.warn(`Joined room: ${JSON.stringify(response)}`);
          // if we are in a game room, we should send a joined-game event
          // check if game is in the url using navigator
          if (window.location.pathname.includes('game')) {
            socket.emit('joined-game');

          }
        } else {
          console.error(`Failed to join room: ${response.error}`);
        }
      });
    }
  }, [socket, isConnected, roomId, user]);

  const startHeartbeat = useCallback(() => {
    if (socket && isConnected) {
      const interval = setInterval(() => {
        if (user) {
          socket.emit('set-user', user.email, user.username, user.id);
        socket.emit('heartbeat', roomId || 'global');
        }
      }, HEARTBEAT_INTERVAL);

      return () => {
        console.warn('Clearing heartbeat interval');
        clearInterval(interval)
      };
    }
  }, [socket, isConnected, roomId, user]);

  const getPlayersInRoom = useCallback(() => {
    return new Promise<User[]>((resolve, reject) => {
      if (socket && isConnected && roomId) {
        socket.emit('online-players-list', roomId, (response: { success: boolean; players?: User[]; error?: string }) => {
          console.log(`Got players response: ${JSON.stringify(response)}`);
          if (response.success && response.players) {
            console.log(`Got players: ${JSON.stringify(response.players)}`);
            resolve(response.players);
          } else {
            reject(new Error(response.error || 'Failed to get players'));
          }
        });
      } else {
        reject(new Error('Socket not connected or room not joined'));
      }
    });
  }, [socket, isConnected, roomId]);

  const sendChatMessage = useCallback((message: string) => {
    if (socket && isConnected && roomId && user) {
      socket.emit('chat-message', roomId, user.email, user.username, message);
    }
  }, [socket, isConnected, roomId, user]);

  const startGame = useCallback(() => {
    if (socket && isConnected && roomId) {
      socket.emit('start-game', roomId);
    }
  }, [socket, isConnected, roomId]);

  const sendReadyStatus = useCallback((isReady: boolean) => {
    if (socket && isConnected && roomId && user) {
      socket.emit('player-ready', roomId, user.email, user.username, isReady);
    }
  }, [socket, isConnected, roomId, user]);

  const handleInviteReceived = useCallback((invite: Invite) => {
    console.log(`Invite received: ${JSON.stringify(invite)}`);
    addToast(`Invite received ${invite.invite_code}`, () => {
      navigate(`/lobby/${invite.game_id}`);
    });
  }, [addToast, navigate]);

  useEffect(() => {
    const cleanup = connectSocket();

    return cleanup;
  }, []);

  useEffect(() => {
    const stopHeartbeat = startHeartbeat();
    return stopHeartbeat;
  }, [startHeartbeat]);

  useEffect(() => {
    if (socket) {
      socket.on('invite-received', handleInviteReceived);
    }
    return () => {
      if (socket) {
        socket.off('invite-received', handleInviteReceived);
      }
    };
  }, [socket, isConnected, handleInviteReceived]);

  return {
    socket,
    isConnected,
    joinRoom,
    getPlayersInRoom,
    sendChatMessage,
    startGame,
    sendReadyStatus,
    emitEvent
  };
};