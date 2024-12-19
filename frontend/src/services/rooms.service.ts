import axiosInstance from '../utils/axios-instance';
import { GameRoom, GameState, Lead } from '../models';
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

  createRoom: async (userId: string | null, mode: string): Promise<string> => {
    try {
      const response = await axiosInstance.post('/games/create-room', { userId, mode});
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

  updateGameState: async (roomId: string, gameState: GameState): Promise<void> => {
    try {
      const response = await axiosInstance.post(`/games/update-game/${roomId}`, { gameState });
      if (response.data.success) {
        return;
      }
      throw new Error('Failed to update game');
    } catch (error) {
      console.error('Error updating game:', error);
      throw error;
    }
  },

  createNewLead: async (roomId: string, lead: Lead): Promise<string> => {
    try {
      const response = await axiosInstance.post(`/games/${roomId}/leads/create`, {lead});
      if (response.data.success) {
        return response.data.game_state;
      }
      throw new Error('Failed to create lead');
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  },

  createCulpritVote: async (roomId: string, culpritVote: string): Promise<string> => {
    try {
      const response = await axiosInstance.post(`/games/${roomId}/culprit-vote/create`, {culpritVote});
      if (response.data.success) {
        return response.data.game_state;
      }
      throw new Error('Failed to create culprit vote');
    } catch (error) {
      console.error('Error creating culprit vote:', error);
      throw error;
    }
  }

  
};


