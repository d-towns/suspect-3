import { createSupabaseClient } from '../db/supabase.js';

export const handleSubscriptionCreated = async (userId, planId) => {
    const supabase = createSupabaseClient();

    // find the user with the customerId
    const {data: subscription} = await supabase.from('subscriptions').select('game_credits_left').eq('id', planId).single();


    const {data: user, error}= await supabase.from('user_subscriptions').insert({
        user_id: userId,
        subscription_id: planId,
        active: true,
        game_credits_left: subscription.game_credits_left
    })

    if(error) {
        console.error('Error creating user subscription:', error);
        throw error;
    }

    console.log('User subscription created:', user);
    
}
