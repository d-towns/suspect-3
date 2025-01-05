import { createClient } from "@supabase/supabase-js";
export class LeaderboardService {
    static async getLeaderboard() {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const { data, error } = await supabase
            .from("leaderboard")
            .select("*")
            .order("elo", { ascending: false });
        if (error) {
            throw new Error(`Error getting leaderboard: ${error.message}`);
        }
        return data;
    }

    static async getLeaderboardStatsForPlayer(playerId) {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const { data, error } = await supabase
            .from("leaderboard")
            .select("*")
            .eq("user_id", playerId);
        if (error) {
            throw new Error(`Error getting leaderboard stats for player: ${error.message}`);
        }
        return data;
    }

    static async getLeaderboardStatsForPlayers(playerIds) {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const { data, error } = await supabase
            .from("leaderboard")
            .select("*")
            .in("user_id", playerIds);
        if (error) {
            throw new Error(`Error getting leaderboard stats for players: ${error.message}`);
        }
        return data;
    }

    /**
     * Updates the player stats in the leaderboard.
     * @param {LeaderboardSchema.playerResults} playerResults 
     */
    static async updatePlayerStats(playerResults, roomId) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        console.log("Updating player stats:", playerResults);
        for (const result of playerResults) {
          const { playerId, newRating, oldRating, won, badges} = result;
    
          const { data, error } = await supabase
            .from("leaderboard")
            .select("elo, single_wins")
            .eq("user_id", playerId)
            .single();

          
          // insert a reord into the game results table with all of the player results
          const { data: gameResultsData, error: gameResultsError } = await supabase
            .from("game_results")
            .upsert([{user_id: playerId, new_rating: newRating, game_room_id: roomId, old_rating: oldRating, won: won, badges: badges}]).select().single();

          console.log("Game results inserted:", gameResultsData);
          if (gameResultsError) {
            console.error("Error inserting game results:", gameResultsError);
          }

    
          if (error) {
            console.error("Error fetching player stats:", error);
            continue;
          }
    
          const newElo = newRating;
          const newWins = won ? data.single_wins + 1 : data.single_wins;
    
          const { error: updateError } = await supabase
            .from("leaderboard")
            .update({ elo: newElo, single_wins: newWins })
            .eq("user_id", playerId);
    
          console.log("Player stats updated:", playerId, newElo, newWins);
    
          if (updateError) {
            console.error("Error updating player stats:", updateError);
          }
        }
      }


      static async getGameResultsForUser(userId, gameId) {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const { data, error } = await supabase
          .from("game_results")
          .select("*")
          .eq("user_id", userId)
          .eq("game_room_id", gameId)

          console.log("Game results for user:", data);
      
        if (error) {
          throw new Error(`Error fetching game results: ${error.message}`);
        }
      
        return { data, error };
      }

      static async getAllGameResultsForUser(userId, page) {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const limit = 30;
        const offset = (page - 1) * limit;
        const { data, error } = await supabase
          .from("game_results")
          .select("*")
          .eq("user_id", userId)
          .range(offset, offset + limit - 1);

        if (error) {
          throw new Error(`Error fetching game results: ${error.message}`);
        }

        return { data, error };
      }

    

}