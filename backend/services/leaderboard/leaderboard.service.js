import { createClient } from "@supabase/supabase-js";

export class LeaderboardService {
  static supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  static async getLeaderboard() {
    try {
      const { data, error } = await this.supabase
        .from("leaderboard")
        .select("*")
        .order("elo", { ascending: false });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error getting leaderboard: ${error.message}`);
      return [];
    }
  }

  static async getLeaderboardStatsForPlayer(playerId) {
    try {
      const { data, error } = await this.supabase
        .from("leaderboard")
        .select("*")
        .eq("user_id", playerId);
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error getting stats for player ${playerId}: ${error.message}`);
      return null;
    }
  }

  static async getLeaderboardStatsForPlayers(playerIds) {
    try {
      const { data, error } = await this.supabase
        .from("leaderboard")
        .select("*")
        .in("user_id", playerIds);
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error getting stats for players: ${error.message}`);
      return [];
    }
  }

  static async updatePlayerStats(playerResults, roomId) {
    try {
      console.log("Updating player stats:", playerResults);
      for (const result of playerResults) {
        const { playerId, newRating, won, badges } = result;

        const { data, error } = await this.supabase
          .from("leaderboard")
          .select("elo, single_wins")
          .eq("user_id", playerId)
          .single();

        if (error) {
          console.error(`Error fetching stats for player ${playerId}: ${error.message}`);
          continue;
        }

        const newWins = won ? data.single_wins + 1 : data.single_wins;

        const { error: updateError } = await this.supabase
          .from("leaderboard")
          .update({ elo: newRating, single_wins: newWins })
          .eq("user_id", playerId);

        if (updateError) {
          console.error(`Error updating stats for player ${playerId}: ${updateError.message}`);
        } else {
          console.log(`Player stats updated: ${playerId}, ELO: ${newRating}, Wins: ${newWins}`);
        }

        const { error: gameError } = await this.supabase
          .from("game_results")
          .upsert([{ user_id: playerId, new_rating: newRating, game_room_id: roomId, old_rating: result.oldRating, won, badges }])
          .select()
          .single();

        if (gameError) {
          console.error(`Error inserting game results for player ${playerId}: ${gameError.message}`);
        } else {
          console.log("Game results inserted:", playerId);
        }
      }
    } catch (error) {
      console.error(`Error updating player stats: ${error.message}`);
    }
  }

  static async getGameResultsForUser(userId, gameId) {
    try {
      const { data, error } = await this.supabase
        .from("game_results")
        .select("*")
        .eq("user_id", userId)
        .eq("game_room_id", gameId);

      if (error) throw error;

      console.log("Game results for user:", data);
      return data;
    } catch (error) {
      console.error(`Error fetching game results for user ${userId}: ${error.message}`);
      return null;
    }
  }

  static async getAllGameResultsForUser(userId, page) {
    try {
      const limit = 30;
      const offset = (page - 1) * limit;
      const { data, error } = await this.supabase
        .from("game_results")
        .select("*")
        .eq("user_id", userId)
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching all game results for user ${userId}: ${error.message}`);
      return [];
    }
  }
}