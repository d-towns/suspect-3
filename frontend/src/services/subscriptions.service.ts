import { supabase } from '../utils/supabase-client';

export interface UserSubscription {
  id: string;
  user_id: string;
  game_credits_left: number;
  created_at: string;
  active: boolean;
}

export const subscriptionsService = {
  /**
   * Gets the remaining game credits for a user
   * @param userId - ID of the user to check credits for
   * @returns The number of game credits remaining
   */
  getGameCredits: async (userId: string): Promise<number> => {
    try {
        console.log('Fetching game credits for user:', userId);
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('game_credits_left')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error(error);
        throw new Error('Failed to fetch game credits');
      }

      return data?.game_credits_left ?? 0;
    } catch (error) {
      console.error('Error fetching game credits:', error);
      throw error;
    }
  }
};
