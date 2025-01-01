import { createClient } from '@supabase/supabase-js';
import crypto from "crypto";
import dotenv from "dotenv";


dotenv.config({path: "../../.env"});

export class GameRoomService {
  
    static async createGameRoom(userId, mode) {
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
    }

    static generateRoomId() {
        return 
    }

    static async updateGameRoom(roomId, updates) {

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

        const { data, error } = await supabase
            .from('game_rooms')
            .update(updates)
            .eq('id', roomId).select().single();

        if (error) {
            throw new Error(`Error updating game room: ${error.message}`);
        }
        console.log( "\n" + "Game room updated successfully"+ "\n" ); ;
        return data;
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

    static encryptGameState(gameState) {
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
      }
    
      static decryptGameState(encryptedGameState) {
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
      }
    
      static async saveGameState(roomId, gameState) {
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );
        const encryptedGameState = this.encryptGameState(gameState);
        console.log("Saving encrypted game state for room ID:", roomId);
    
        const { data, error } = await supabase
          .from("game_rooms")
          .update({ game_state: encryptedGameState })
          .eq("id", roomId)
          .select();
    
        if (error) {
          console.error("Error saving encrypted game state:", error);
          throw error;
        }
        console.log("Encrypted game state saved successfully");
      }
}