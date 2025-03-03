import stripe  from "./client";
import { supabase } from "../../utils/supabase-client";

export const createStripeCustomer = async (email: string, userId: string) => {
    const { data: stripeCustomer } = await stripe.customers.list({
      email: email,
    });
    if (stripeCustomer.length === 0) {
      const customer = await stripe.customers.create({ email: email, metadata: { userId: userId } });
      await supabase.auth.updateUser({
        data: {
          stripeCustomerId: customer.id,
        },
      });
      console.log('Stripe customer created:', customer);
    }
    console.log('Stripe customer already exists:', stripeCustomer);
    return true;
  }