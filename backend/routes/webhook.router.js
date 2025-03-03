import { Router } from "express";
import dotenv from 'dotenv';
import { handleSubscriptionCreated } from '../services/webhook.service.js';
import Stripe from 'stripe';
dotenv.config({path: '../.env'});

const stripe = new Stripe( process.env.NODE_ENV === 'dev' ? process.env.STRIPE_TEST_SECRET_KEY : process.env.STRIPE_PROD_SECRET_KEY);

const router = Router();


router.post("/activate", async (req, res) => {
    const {type, data} = req.body;
    switch(type.toString()) {
        case 'customer.subscription.created':
            const object = data.object;
            console.log(data)
            // const priceId = subscription.items.data[0].price.id;

            let productId = object.plan.product;

            if(process.env.NODE_ENV === 'dev') {
                if(productId === process.env.TEST_PRODUCT_ID) {
                    productId = process.env.CADET_PLAN_PRODUCT_ID;
                }
            }


            if(productId === process.env.CADET_PLAN_PRODUCT_ID) {
                const customer = await stripe.customers.retrieve(object.customer);
                handleSubscriptionCreated(customer.metadata.userId, 2);
                console.log('Cadet plan created')
                
            } else if(productId === process.env.DETECTIVE_PLAN_PRODUCT_ID) {
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