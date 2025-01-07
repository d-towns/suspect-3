import axiosInstance from '../utils/axios-instance';
import { GameRoom, GameState, Lead } from '../models';
import { decryptGameState } from '../utils/decrypt';
import { supabase } from '../utils/supabase-client';


export const roomsService = {

  fetchRooms: async (): Promise<GameRoom[]> => {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*');
    if (error) {
      console.error(error);
      throw new Error('Failed to fetch rooms');
    }
    return data as GameRoom[];
  },

  createRoom: async (userId: string | null, mode: string): Promise<string> => {
    const roomData = {
      host_id: userId,
      created_at: new Date(),
      mode
    };

    console.log('roomData:', await supabase.auth.getUser());
    // return '1234';
    
    const { data, error } = await supabase
      .from('game_rooms')
      .insert([roomData])
      .select()
      .single();
      console.log('data:', data);
      console.log('error:', error);
    if (error || !data) {
      console.error(error);
      throw new Error('Failed to create room');
    }
    return data.id;
  },

  getRoom: async (roomId: string): Promise<GameRoom> => {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    if (error || !data) {
      console.error(error);
      throw new Error('Failed to fetch room');
    }
    const decrypted = await decryptGameState(data.game_state);
    const game_state = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
    return { ...data, game_state };
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


