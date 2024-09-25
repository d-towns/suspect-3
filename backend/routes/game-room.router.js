import { Router } from 'express';
import { createSupabaseClient } from '../db/supabase.js';
import { GameRoomSocketServer } from '../../socket/io.js';

const router = Router();

router.post("/create-room", createGameRoom);
router.post("/join-room", joinGameRoom);
router.get("/get-rooms", getGameRooms);

function getGameRooms(req, res) {
    const supabase = createSupabaseClient(req.headers.authorization?.split(' ')[1]);
    supabase
        .from('game_rooms')
        .select('*')
        .then(({ data, error }) => {
            if (error) {
                return res.status(500).json({ success: false, message: `Error fetching game rooms: ${error.message}` });
            }
            return res.status(200).json({ success: true, rooms: data });
        });
}

function joinGameRoom(req, res) {
    const { userId, roomId } = req.body;
    const supabase = createSupabaseClient(req.headers.authorization?.split(' ')[1]);

    if (!userId || !roomId) {
        return res.status(400).json({ success: false, message: `User ID and Room ID are required` });
    }

    supabase
        .from('game_rooms')
        .select('players')
        .eq('room_id', roomId)
        .single()
        .then(({ data, error }) => {
            if (error) {
                return res.status(500).json({ success: false, message: "Error fetching game room" });
            }

            if (!data) {
                return res.status(404).json({ success: false, message: "Game room not found" });
            }

            const updatedPlayers = [...data.players, userId];

            supabase
                .from('game_rooms')
                .update({ players: updatedPlayers })
                .eq('room_id', roomId)
                .then(({ data, error }) => {
                    if (error) {
                        return res.status(500).json({ success: false, message: `Error joining game room: ${error.message}` });
                    }
                    return res.status(200).json({ success: true, message: "Successfully joined game room" });
                });
        });
}

function createGameRoom(req, res, next) {
    const supabase = createSupabaseClient(req.headers.authorization?.split(' ')[1]);
    console.log(req.body);
    const { userId } = req.body;
    var roomId;
    const roomData = {
        host_id: userId,
    }
    console.log(roomData);

    supabase
        .from('game_rooms')
        .insert([roomData]).select()
        .then(({ data, error }) => {
            if (error) {
                return res.status(500).json({ success: false, message: `Error creating game room: ${error.message}` });
            }
            
            roomId = data[0].id;
            console.log(roomId);
            supabase.from('game_players').insert([{
                user_id: userId,
                room_id: roomId
            }]).then(({ data, error }) => {
                if (error) {
                    return res.status(500).json({ success: false, message: `Error creating game player: ${error.message}` });
                }
                return res.status(200).json({ success: true, roomId });
            });
        });
}

var generateRoomId = () => {
    return Math.random().toString(36).substring(2, 7);
}

export { router as gameRoomRouter };