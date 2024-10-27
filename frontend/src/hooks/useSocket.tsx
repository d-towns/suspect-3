import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/auth.context';
import { Player, ChatMessage } from '../models';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL;
const HEARTBEAT_INTERVAL = 5000; // 5 seconds

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { roomId } = useParams<{ roomId?: string }>();
  const { user } = useAuth();

  const connectSocket = useCallback(() => {
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
      newSocket.disconnect();
    };
  }, []);

  const emitEvent = useCallback((event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  } , [socket, isConnected]);

  const joinRoom = useCallback(() => {
    if (socket && isConnected && roomId && user) {
      socket.emit('join-room', { roomId, userId: user.id, userEmail: user.email }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          console.log(`Joined room: ${roomId}`);
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
        socket.emit('heartbeat', roomId || 'global');
      }, HEARTBEAT_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [socket, isConnected, roomId]);

  const getPlayersInRoom = useCallback(() => {
    return new Promise<Player[]>((resolve, reject) => {
      if (socket && isConnected && roomId) {
        socket.emit('online-players-list', roomId, (response: { success: boolean; players?: Player[]; error?: string }) => {
          if (response.success && response.players) {
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
      socket.emit('chat-message', roomId, user.email, message);
    }
  }, [socket, isConnected, roomId, user]);

  const startGame = useCallback(() => {
    if (socket && isConnected && roomId) {
      socket.emit('start-game', roomId);
    }
  }, [socket, isConnected, roomId]);

  const sendReadyStatus = useCallback((isReady: boolean) => {
    if (socket && isConnected && roomId && user) {
      socket.emit('player-ready', roomId, user.email, isReady);
    }
  }, [socket, isConnected, roomId, user]);

  useEffect(() => {
    const cleanup = connectSocket();
    return cleanup;
  }, [connectSocket]);

  useEffect(() => {
    if (roomId) {
      joinRoom();
    }
    const stopHeartbeat = startHeartbeat();
    return stopHeartbeat;
  }, [roomId, joinRoom, startHeartbeat]);

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