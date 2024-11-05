import axiosInstance from '../utils/axios-instance';
import { GameRoom } from '../models';
import { decryptGameState } from '../utils/decrypt';

export const roomsService = {
  fetchRooms: async (): Promise<GameRoom[]> => {
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

  getRoom: async (roomId: string): Promise<GameRoom> => {
    try {
      const response = await axiosInstance.get(`/games/get-room/${roomId}`);
      if (response.data.room) {
        const decryptedGameState = await decryptGameState(response.data.room.game_state);
        return { ...response.data.room, game_state: decryptedGameState };
      }
      throw new Error('Failed to fetch room');
    } catch (error) {
      console.error('Error fetching room:', error);
      throw error;
    }
  },

  
};


