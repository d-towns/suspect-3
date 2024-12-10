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

    

}