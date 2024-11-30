import { Router } from 'express';
import { createSupabaseClient } from '../db/supabase.js';
import {z} from 'zod';

const InviteSchema = z.object({
    created_at: z.date(),
    expires_at: z.date(),
    accepted: z.boolean(),
    id: z.string(),
    invite_code: z.string(),
    sender_user_id: z.string(),
    recipient_user_email: z.string(),
    game_id: z.string(),
});
    

const router = Router();

// Middleware for error handling
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /create-invite
router.post('/create-invite', asyncHandler(createInvite));

// GET /get-invites
router.get('/get-invites', asyncHandler(getInvites));

// GET /get-invite/:inviteId
router.get('/get-invite/:inviteId', asyncHandler(getInvite));

// Function to create an invite
async function createInvite(req, res) {
    const supabase = createSupabaseClient({ req, res });
    const { recipient_user_email, sender_user_id, game_id } = req.body;

    if (!recipient_user_email || !game_id || !sender_user_id) {
        return res.status(400).json({ success: false, message: 'User ID and Room ID are required to create an invite' });
    }

    const createInviteCode = () => {
        // create a random 6 character alphanumeric string
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    const inviteData = {
        sender_user_id,
        recipient_user_email,
        game_id,
        accepted: false,
        created_at: new Date(),
        invite_code: createInviteCode(),
        // expires in 15 minutes
        expires_at: new Date(Date.now() + 15 * 60 * 1000),
    };

    const { data, error } = await supabase
        .from('invites')
        .insert([inviteData])
        .select()
        .single();

    if (error) {
        console.error('Error creating invite:', error);
        return res.status(500).json({ success: false, message: `Error creating invite: ${error.message}` });
    }

    return res.status(200).json({ success: true, inviteId: data.id });
}

// Function to get all invites
async function getInvites(req, res) {
    const supabase = createSupabaseClient({ req, res });
    const { userId } = req.body;

    const { data, error } = await supabase
        .from('invites')
        .select('*').eq('to_user', userId);

    if (error) {
        console.error('Error fetching invites:', error);
        return res.status(500).json({ success: false, message: `Error fetching invites: ${error.message}` });
    }

    return res.status(200).json({ success: true, invites: data });
}

// Function to get a specific invite by ID
async function getInvite(req, res) {
    const { inviteId } = req.params;
    const supabase = createSupabaseClient({ req, res });

    const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('id', inviteId)
        .single();

    if (error) {
        console.error('Error fetching invite:', error);
        return res.status(500).json({ success: false, message: `Error fetching invite: ${error.message}` });
    }

    if (!data) {
        return res.status(404).json({ success: false, message: 'Invite not found' });
    }

    return res.status(200).json({ success: true, invite: data });
}

export { router as invitesRouter };