import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.VITE_NODE_ENV === 'dev' ? import.meta.env.VITE_STRIPE_TEST_SECRET_KEY : import.meta.env.VITE_STRIPE_PROD_SECRET_KEY);

export default stripe;