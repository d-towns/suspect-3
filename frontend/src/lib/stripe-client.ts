import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.VITE_NODE_ENV === 'development' ? import.meta.env.VITE_STRIPE_TEST_PUB_KEY : import.meta.env.VITE_STRIPE_PROD_PUB_KEY);

export default stripe;