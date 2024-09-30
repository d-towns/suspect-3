import { Router } from 'express';
import { createSupabaseClient } from '../db/supabase.js';

const router = Router();

// Define the Room and Player interfaces for clarity
/**
 * @typedef {Object} Room
 * @property {string} id - Unique identifier for the room
 * @property {string} host_id - User ID of the host
 * @property {string[]} players - Array of user IDs in the room
 */

/**
 * @typedef {Object} Player
 * @property {string} user_id - User ID
 * @property {string} room_id - Room ID
 */

// Middleware for error handling
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /create-room
router.post('/create-room', asyncHandler(createGameRoom));

// GET /get-rooms
router.get('/get-rooms', asyncHandler(getGameRooms));

// GET /get-room/:roomId
router.get('/get-room/:roomId', asyncHandler(getRoom));

async function getGameRooms(req, res) {
  const supabase = createSupabaseClient({ req, res });
  const { data, error } = await supabase
    .from('game_rooms')
    .select('*');

  if (error) {
    console.error('Error fetching game rooms:', error);
    return res.status(500).json({ success: false, message: `Error fetching game rooms: ${error.message}` });
  }

  return res.status(200).json({ success: true, rooms: data });
}

// POST /create-room
async function createGameRoom(req, res) {
  const supabase = createSupabaseClient({ req, res });
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required to create a room' });
  }

  // Generate a unique room ID
  const roomId = generateRoomId();

  const roomData = {
    id: roomId,
    host_id: userId,
    players: [userId],
  };

  const { data, error } = await supabase
    .from('game_rooms')
    .insert([roomData]);

  if (error) {
    console.error('Error creating game room:', error);
    return res.status(500).json({ success: false, message: `Error creating game room: ${error.message}` });
  }

  // Add the host to the game_players table
  const { error: playerError } = await supabase
    .from('game_players')
    .insert([{ user_id: userId, room_id: roomId }]);

  if (playerError) {
    console.error('Error adding host to game_players:', playerError);
    return res.status(500).json({ success: false, message: `Error adding host to game: ${playerError.message}` });
  }

  return res.status(200).json({ success: true, roomId });
}

// GET /get-room/:roomId
async function getRoom(req, res) {
  const { roomId } = req.params;
  const supabase = createSupabaseClient({ req, res });

  const { data, error } = await supabase
    .from('game_rooms')
    .select('id, host_id')
    .eq('id', roomId)
    .single();

  if (error) {
    console.error('Error fetching game room:', error);
    return res.status(500).json({ success: false, message: `Error fetching game room: ${error.message}` });
  }

  if (!data) {
    return res.status(404).json({ success: false, message: 'Game room not found' });
  }

  return res.status(200).json({ success: true, room: data });
}

// Utility function to generate unique room IDs
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase(); // Generates a 6-character ID
};

export { router as gameRoomRouter };