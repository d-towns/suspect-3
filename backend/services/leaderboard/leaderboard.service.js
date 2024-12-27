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
    static async updatePlayerStats(playerResults) {
        console.log("Updating player stats:", playerResults);
        for (const result of playerResults) {
          const { playerId, newRating, won } = result;
    
          const { data, error } = await this.supabase
            .from("leaderboard")
            .select("elo, multi_wins")
            .eq("user_id", playerId)
            .single();
    
          if (error) {
            console.error("Error fetching player stats:", error);
            continue;
          }
    
          const newElo = newRating;
          const newWins = won ? data.multi_wins + 1 : data.multi_wins;
    
          const { error: updateError } = await this.supabase
            .from("leaderboard")
            .update({ elo: newElo, multi_wins: newWins })
            .eq("user_id", playerId);
    
          console.log("Player stats updated:", playerId, newElo, newWins);
    
          if (updateError) {
            console.error("Error updating player stats:", updateError);
          }
        }
      }

    

}