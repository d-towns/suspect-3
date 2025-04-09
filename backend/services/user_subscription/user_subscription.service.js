import { createClient } from '@supabase/supabase-js';

/**
 * User Subscription Service
 * Handles operations related to user subscriptions including:
 * - Getting user subscription details
 * - Updating game credits
 * - Activating/deactivating subscriptions
 * - Creating new subscriptions
 */
export class UserSubscriptionService {
  static supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  /**
   * Get a user's subscription details
   * @param {string} userId - The user's ID
   * @returns {Promise<Object>} - The user's subscription details
   */
  static async getUserSubscription(userId) {
    try {
      const { data, error } = await UserSubscriptionService.supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user subscription:', error);
        throw new Error('Failed to fetch user subscription');
      }

      return data;
    } catch (error) {
      console.error('Error in getUserSubscription:', error);
      throw error;
    }
  }

  /**
   * Update a user's game credits
   * @param {string} userId - The user's ID
   * @param {number} credits - The new credit amount (or delta if isDelta is true)
   * @param {boolean} isDelta - If true, add/subtract credits instead of setting directly
   * @returns {Promise<Object>} - The updated user subscription
   */
  static async updateGameCredits(userId, credits, isDelta = false) {
    try {
      let updatedCredits = credits;
      
      if (isDelta) {
        // Get current credits first if we're adding/subtracting
        const currentSubscription = await this.getUserSubscription(userId);
        if (!currentSubscription) {
          throw new Error('User subscription not found');
        }
        updatedCredits = Math.max(0, currentSubscription.game_credits_left + credits);
      }

      const { data, error } = await this.supabase
        .from('user_subscriptions')
        .update({ game_credits_left: updatedCredits })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating game credits:', error);
        throw new Error('Failed to update game credits');
      }

      return data;
    } catch (error) {
      console.error('Error in updateGameCredits:', error);
      throw error;
    }
  }

  /**
   * Deduct game credits when a user starts a game
   * @param {string} userId - The user's ID
   * @param {number} creditsToDeduct - Number of credits to deduct (default: 1)
   * @returns {Promise<boolean>} - True if successful, throws error otherwise
   */
  static async deductGameCredits(userId, creditsToDeduct = 1) {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        throw new Error('User subscription not found');
      }
      
      if (subscription.game_credits_left < creditsToDeduct) {
        throw new Error('Insufficient game credits');
      }
      
      await this.updateGameCredits(userId, -creditsToDeduct, true);
      return true;
    } catch (error) {
      console.error('Error in deductGameCredits:', error);
      throw error;
    }
  }

  /**
   * Create a new subscription for a user
   * @param {string} userId - The user's ID
   * @param {string} subscriptionId - The subscription plan ID
   * @param {number} gameCredits - Initial game credits
   * @returns {Promise<Object>} - The created user subscription
   */
  static async createUserSubscription(userId, subscriptionId, gameCredits) {
    try {
      // Check if user already has a subscription
      const existingSubscription = await this.supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existingSubscription.data) {
        // Update existing subscription
        const { data, error } = await this.supabase
          .from('user_subscriptions')
          .update({
            subscription_id: subscriptionId,
            active: true,
            game_credits_left: existingSubscription.data.game_credits_left + gameCredits
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          console.error('Error updating user subscription:', error);
          throw new Error('Failed to update user subscription');
        }

        return data;
      } else {
        // Create new subscription
        const { data, error } = await this.supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            subscription_id: subscriptionId,
            active: true,
            game_credits_left: gameCredits
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating user subscription:', error);
          throw new Error('Failed to create user subscription');
        }

        return data;
      }
    } catch (error) {
      console.error('Error in createUserSubscription:', error);
      throw error;
    }
  }

  /**
   * Activate or deactivate a user's subscription
   * @param {string} userId - The user's ID
   * @param {boolean} active - Whether to activate or deactivate
   * @returns {Promise<Object>} - The updated user subscription
   */
  static async setSubscriptionStatus(userId, active) {
    try {
      const { data, error } = await this.supabase
        .from('user_subscriptions')
        .update({ active })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating subscription status:', error);
        throw new Error('Failed to update subscription status');
      }

      return data;
    } catch (error) {
      console.error('Error in setSubscriptionStatus:', error);
      throw error;
    }
  }

  /**
   * Check if a user has an active subscription
   * @param {string} userId - The user's ID
   * @returns {Promise<boolean>} - True if user has an active subscription
   */
  static async hasActiveSubscription(userId) {
    try {
      const subscription = await this.getUserSubscription(userId);
      return subscription && subscription.active;
    } catch (error) {
      console.error('Error in hasActiveSubscription:', error);
      return false;
    }
  }

  /**
   * Check if a user has sufficient game credits
   * @param {string} userId - The user's ID
   * @param {number} requiredCredits - Number of credits required
   * @returns {Promise<boolean>} - True if user has sufficient credits
   */
  static async hasSufficientCredits(userId, requiredCredits = 1) {
    try {
      const subscription = await this.getUserSubscription(userId);
      return subscription && subscription.game_credits_left >= requiredCredits;
    } catch (error) {
      console.error('Error in hasSufficientCredits:', error);
      return false;
    }
  }

  /**
   * Refresh game credits for all active subscriptions
   * This would typically be called by a scheduled job
   * @returns {Promise<number>} - Number of subscriptions updated
   */
  static async refreshAllSubscriptionCredits() {
    try {
      // Get all subscription plans to know how many credits to add
      const { data: subscriptionPlans, error: plansError } = await this.supabase
        .from('subscriptions')
        .select('id, game_credits');
      
      if (plansError) {
        console.error('Error fetching subscription plans:', plansError);
        throw new Error('Failed to fetch subscription plans');
      }
      
      // Create a map of plan IDs to credit amounts
      const planCreditsMap = subscriptionPlans.reduce((map, plan) => {
        map[plan.id] = plan.game_credits;
        return map;
      }, {});
      
      // Get all active user subscriptions
      const { data: activeSubscriptions, error: subsError } = await this.supabase
        .from('user_subscriptions')
        .select('*')
        .eq('active', true);
      
      if (subsError) {
        console.error('Error fetching active subscriptions:', subsError);
        throw new Error('Failed to fetch active subscriptions');
      }
      
      // Update each subscription with the appropriate credit amount
      let updatedCount = 0;
      for (const subscription of activeSubscriptions) {
        const creditsToAdd = planCreditsMap[subscription.subscription_id] || 0;
        
        if (creditsToAdd > 0) {
          await this.supabase
            .from('user_subscriptions')
            .update({ 
              game_credits_left: subscription.game_credits_left + creditsToAdd,
              last_refreshed: new Date().toISOString()
            })
            .eq('user_id', subscription.user_id);
          
          updatedCount++;
        }
      }
      
      return updatedCount;
    } catch (error) {
      console.error('Error in refreshAllSubscriptionCredits:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const userSubscriptionService = new UserSubscriptionService();
export default userSubscriptionService;
