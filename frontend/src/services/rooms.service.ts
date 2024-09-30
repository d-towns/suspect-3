import axiosInstance from '../utils/axios-instance';
import { io, Socket } from 'socket.io-client';
import { Player, Room } from '../models';

let socket: Socket | null = null;
let socketPromise: Promise<Socket> | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

export const roomsService = {
  fetchRooms: async (): Promise<Room[]> => {
    try {
      const response = await axiosInstance.get('/games/get-rooms');
      if (response.data.success) {
        return response.data.rooms;
      }
      throw new Error('Failed to fetch rooms');
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  },

  createRoom: async (userId: string | null): Promise<string> => {
    try {
      const response = await axiosInstance.post('/games/create-room', { userId });
      if (response.data.roomId) {
        return response.data.roomId;
      }
      throw new Error('Failed to create room');
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  },

  getRoom: async (roomId: string): Promise<Room> => {
    try {
      const response = await axiosInstance.get(`/games/get-room/${roomId}`);
      if (response.data.room) {
        return response.data.room;
      }
      throw new Error('Failed to get room');
    } catch (error) {
      console.error('Error getting room:', error);
      throw error;
    }
  },

  initializeSocket: (): Promise<Socket> => {
    if (!socketPromise) {
      socketPromise = new Promise((resolve, reject) => {
        socket = io(import.meta.env.VITE_SOCKET_URL, {
          path: '/socket.io',
          transports: ['websocket'], // Explicitly set transport
        });

        socket.on('connect', () => {
          console.log('Socket connected');
          resolve(socket!);
        });

        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          reject(error);
        });

        socket.on('disconnect', () => {
          console.log('Socket disconnected');
          socket = null;
          socketPromise = null;
          roomsService.stopHeartbeat();
        });
      });
    }
    return socketPromise;
  },

  startHeartbeat: (roomId: string) => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    heartbeatInterval = setInterval(() => {
      if (socket && socket.connected) {
        socket.emit('heartbeat', roomId);
      }
    }, 5000); // 5 seconds
  },

  stopHeartbeat: () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    // if (socket) {
    //   socket.emit('leave-room', roomId);
    //   socket.disconnect();
    //   socket = null;
    //   socketPromise = null;
    // }
  },

  joinRoom: async ({
    roomId,
    userId,
    userEmail,
  }: {
    roomId: string;
    userId: string;
    userEmail: string;
  }): Promise<boolean> => {
    try {
      const socketInstance = await roomsService.initializeSocket();
      return new Promise((resolve, reject) => {
        socketInstance.emit(
          'join-room',
          { roomId, userId, userEmail },
          (response: { success: boolean; error?: string }) => {
            if (response.success) {
              roomsService.startHeartbeat(roomId);
              resolve(true);
            } else {
              reject(new Error(response.error || 'Failed to join room'));
            }
          }
        );
      });
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  },

  getOnlinePlayers: async (roomId: string): Promise<Player[]> => {
    try {
      const socketInstance = await roomsService.initializeSocket();
      return new Promise((resolve, reject) => {
        socketInstance.emit('online-players-list', roomId, (response: { success: boolean; players: Player[]; error?: string }) => {
          if (response.success) {
            resolve(response.players);
          } else {
            reject(new Error(response.error || 'Failed to get online players'));
          }
        });
      });
    } catch (error) {
      console.error('Error getting online players:', error);
      throw error;
    }
  },

  sendChatMessage: async (roomId: string, userEmail: string, message: string): Promise<void> => {
    try {
      const socketInstance = await roomsService.initializeSocket();
      socketInstance.emit('chat-message', roomId, userEmail, message);
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  },

  sendReadyStatus: async (roomId: string, userEmail: string, isReady: boolean): Promise<void> => {
    try {
      const socketInstance = await roomsService.initializeSocket();
      console.log(`Sending ready status for user ${userEmail} in room ${roomId}: ${isReady}`);
      socketInstance.emit('player-ready', roomId, userEmail, isReady);
    } catch (error) {
      console.error('Error sending ready status:', error);
      throw error;
    }
  },

  startGame: async (roomId: string): Promise<void> => {
    try {
      const socketInstance = await roomsService.initializeSocket();
      socketInstance.emit('start-game', roomId);
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  },
};