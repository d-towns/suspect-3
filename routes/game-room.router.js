import {Router} from 'express';
import {supabase} from '../db/supabase.js';

const router = Router();

router.post("/create-room", createGameRoom);

function createGameRoom(req, res, next) {
    /**
     * 1. Generate a random room ID
     * 2. Create the room in the database
     * 3. Return the room ID
     * 4. Send a join-room event to the client for the room
     */
    const { userId } = req.body;
    const roomId = generateRoomId();
    const roomData = {
        room_id: roomId,
        host_id: userId,
        players: [userId],
        created_at: new Date()
    }

    supabase
        .from('game_rooms')
        .insert([roomData])
        .then(({ data, error }) => {
            if (error) {
                return res.status(500).json({ message: "Error creating game room" });
            }
            return res.status(200).json({ roomId });
        });
    
    io.emit('join-room', roomId);
}

var generateRoomId = () => {
    return Math.random().toString(36).substring(2, 7);
}

export {router as gameRoomRouter};