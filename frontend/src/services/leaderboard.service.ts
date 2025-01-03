import { Badge } from '../models/gameResults.model';
import axiosInstance from '../utils/axios-instance';

export interface LeaderboardEntry {
    id: number;
    created_at: string;
    single_wins: number;
    single_average_guilt_score: number;
    multi_wins: number;
    multi_average_guilt_score: number;
    elo: number;
    username: string;
}

export interface LeaderboardResponse {
    success: boolean;
    leaderboard?: LeaderboardEntry[];
    stats?: LeaderboardEntry;
    entry?: LeaderboardEntry;
    message?: string;
    page?: number;
    limit?: number;
}

export interface GameResultResponse {
    success: boolean;
    results: {
        game_room_id: string;
        user_id: string;
        old_rating: number;
        new_rating: number;
        won: boolean;
        badges: Badge[];
    }
}

export const leaderboardService = {
    /**
     * Fetches the leaderboard data with pagination
     * @param page - Page number for pagination
     */
    getLeaderboard: async (page: number = 1): Promise<LeaderboardResponse> => {
        try {
            const response = await axiosInstance.get('/leaderboard', {
                params: { page }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            throw error;
        }
    },

    /**
     * Retrieves stats for a specific user
     * @param userId - The ID of the user
     */
    getUserStats: async (userId: string): Promise<LeaderboardResponse> => {
        try {
            const response = await axiosInstance.get(`/leaderboard/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching user stats:', error);
            throw error;
        }
    },

    /**
     * Creates a new leaderboard entry for a user
     * @param userId - The ID of the user
     */
    createLeaderboardEntry: async (userId: string): Promise<LeaderboardResponse> => {
        try {
            const response = await axiosInstance.post('/leaderboard', {
                user_id: userId
            });
            return response.data;
        } catch (error) {
            console.error('Error creating leaderboard entry:', error);
            throw error;
        }
    },

    /**
     * Updates a leaderboard entry for a user
     * @param userId - The ID of the user
     * @param updates - Partial leaderboard entry with fields to update
     */
    updateLeaderboardEntry: async (userId: string, updates: Partial<LeaderboardEntry>): Promise<LeaderboardResponse> => {
        try {
            const response = await axiosInstance.put(`/leaderboard/${userId}`, updates);
            return response.data;
        } catch (error) {
            console.error('Error updating leaderboard entry:', error);
            throw error;
        }
    },

    /**
     * Deletes a leaderboard entry for a user
     * @param userId - The ID of the user
     */
    deleteLeaderboardEntry: async (userId: string): Promise<LeaderboardResponse> => {
        try {
            const response = await axiosInstance.delete(`/leaderboard/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting leaderboard entry:', error);
            throw error;
        }
    },

    /**
     * Retrieves game results for a specific game
     * @param gameId - The ID of the game
     */
    getGameResultsForUser: async (gameId: string, userId:string): Promise<GameResultResponse> => {
        try {
            const response = await axiosInstance.get(`/leaderboard/${gameId}/results`,
                { params: { userId: userId } });
            console.log('Game results:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching game results for user:', error);
            throw error;
        }
    }
};