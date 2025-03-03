import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

export const handleSubscriptionCreated = async (userId, planId) => {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // get the game credits for the subscription the user is subscribing to
    const { data: subscription } = await supabase.from('subscriptions').select('game_credits').eq('id', planId).single();

    if (!subscription) {
        console.error('Subscription not found');
        throw new Error('Subscription not found');
    }

    // get the users current game credits

    const { data: user_subscription, error: user_subscription_error } = await supabase.from('user_subscriptions').select('game_credits_left').eq('user_id', userId).single();

    if (user_subscription_error) {
        console.error('Error getting user subscription:', user_subscription_error);
        throw user_subscription_error;
    }

    // update the user subscription with the new game credits + their existing game credits

    const { data: user, error } = await supabase.from('user_subscriptions').update({
        active: true,
        subscription_id: planId,
        game_credits_left: user_subscription.game_credits_left + subscription.game_credits
    }).eq('user_id', userId).single();

    if (error) {
        console.error('Error creating user subscription:', error);
        throw error;
    }

    console.log('User subscription created:', user);

}
