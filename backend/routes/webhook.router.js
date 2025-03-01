import { Router } from "express";
import dotenv from 'dotenv';
import { createSupabaseClient } from '../db/supabase.js';
import stripe from 'stripe';
dotenv.config({path: '../.env'});

const stripe = new stripe(process.env.STRIPE_TEST_PUBLISHABLE_KEY);

const router = Router();


router.post("/activate", async (req, res) => {
    const {type, data} = req.body;
    switch(type.toString()) {
        case 'customer.subscription.created':
            const object = data.object;
            console.log(data)
            // const priceId = subscription.items.data[0].price.id;
      
            if(object.plan.product === process.env.CADET_PLAN_PRODUCT_ID) {
                const customer = await stripe.customers.retrieve(object.customer);
                handleSubscriptionCreated(customer.metadata.userId, 2);
                console.log('Cadet plan created')
                
            } else if(object.plan.product === process.env.DETECTIVE_PLAN_PRODUCT_ID) {
                const customer = await stripe.customers.retrieve(object.customer);
                handleSubscriptionCreated(customer.metadata.userId, 3);
                console.log('Detective plan created');
            }
            break;
        default:
            console.log('Unknown event type');
    }
    res.send("Webhook received");
});




export {router as webhookRouter};