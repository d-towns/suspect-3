import axios from 'axios';
import { io } from 'socket.io-client';

interface Room {
  id: string;
  players: string[];
}

export const roomsService = {
  fetchRooms: async (): Promise<Room[]> => {
    try {
      const response = await axios.get('/api/games/get-rooms/');
      if (response.data.success) {
        return response.data.rooms;
      }
      throw new Error('Failed to fetch rooms');
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  },

  createRoom: async (accessToken: string, userId: string | null): Promise<string> => {
    try {
      const response = await axios.post('/api/games/create-room', 
        { userId },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      if (response.data.roomId) {
        return response.data.roomId;
      }
      throw new Error('Failed to create room');
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  },

  joinRoom: async (roomId: string, userId: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const socket = io(process.env.REACT_APP_SOCKET_URL);
      socket.emit('join-room', roomId, userId, (response: { success: boolean, error?: string }) => {
        if (response.success) {
          resolve(true);
        } else {
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  },
};