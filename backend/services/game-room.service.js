import { createSupabaseClient } from '../db/supabase.js';
import { GameRoomSocketServer } from '../socket/io.js';
import { createClient } from '@supabase/supabase-js';

export class GameRoomService {
    static async createGameRoom(userId) {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const roomId = this.generateRoomId();
        const roomData = {
            id: roomId, // Changed from room_id to id to match the router
            host_id: userId,
            players: [userId],
            created_at: new Date()
        }

        const { data, error } = await supabase
            .from('game_rooms')
            .insert([roomData]);

        if (error) {
            throw new Error(`Error creating game room: ${error.message}`);
        }

        // Add the host to the game_players table
        const { error: playerError } = await supabase
            .from('game_players')
            .insert([{ user_id: userId, room_id: roomId }]);

        if (playerError) {
            throw new Error(`Error adding host to game: ${playerError.message}`);
        }
        return roomId;
    }

    static generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase(); // Changed to match the router's version
    }

    static async getGameRoom(roomId) {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const { data, error } = await supabase
            .from('game_rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (error) {
            throw new Error(`Error getting game room: ${error.message}`);
        }

        return data;
    }

    static async getAllGameRooms() {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const { data, error } = await supabase
            .from('game_rooms')
            .select('*');
        if (error) {
            throw new Error(`Error fetching all game rooms: ${error.message}`);
        }

        return data;
    }
}