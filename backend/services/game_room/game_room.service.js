import { createClient } from '@supabase/supabase-js';
import crypto from "crypto";
import dotenv from "dotenv";


dotenv.config({path: "../../.env"});

export class GameRoomService {
  
  static async createGameRoom(userId, mode) {
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

      const roomData = {
        host_id: userId,
        created_at: new Date(),
        mode
      }
      console.log(roomData);

      const { data, error } = await supabase
        .from('game_rooms')
        .insert([roomData]).select().single();

      if (error) {
        throw new Error(`Error creating game room: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async updateGameRoom(roomId, updates) {
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

      const { data, error } = await supabase
        .from('game_rooms')
        .update(updates)
        .eq('id', roomId).select().single();

      if (error) {
        throw new Error(`Error updating game room: ${error.message}`);
      }
      console.log(`Game room ${roomId} updated successfully`);
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async getGameRoom(roomId) {
    try {
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
    } catch (error) {
      throw error;
    }
  }

  static async getAllGameRooms() {
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*');
      if (error) {
        throw new Error(`Error fetching all game rooms: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static encryptGameState(gameState) {
    try {
      const gameStateString = JSON.stringify(gameState);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        Buffer.from(process.env.ENCRYPTION_KEY, "hex"),
        iv
      );
      let encrypted = cipher.update(gameStateString);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      return iv.toString("hex") + ":" + encrypted.toString("hex");
    } catch (error) {
      throw error;
    }
    }
  
    static decryptGameState(encryptedGameState) {
    try {
      const textParts = encryptedGameState.split(":");
      const iv = Buffer.from(textParts.shift(), "hex");
      const encryptedText = Buffer.from(textParts.join(":"), "hex");
      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(process.env.ENCRYPTION_KEY, "hex"),
        iv
      );
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return JSON.parse(decrypted.toString());
    } catch (error) {
      throw error;
    }
    }
}