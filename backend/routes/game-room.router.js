import { Router } from "express";
import { createSupabaseClient } from "../db/supabase.js";
import { GameRoomService } from "../services/game_room/game_room.service.js";

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
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /create-room
router.post("/create-room", asyncHandler(createGameRoom));

// GET /get-rooms
router.get("/get-rooms", asyncHandler(getGameRooms));

// GET /get-room/:roomId
router.get("/get-room/:roomId", asyncHandler(getRoom));

// POST /:roomId/leads/create
router.post("/:roomId/leads/create", asyncHandler(createNewLead));

// POST /:roomId/culprit-vote/create
router.post("/:roomId/culprit-vote/create", asyncHandler(createNewCulpritVote));

async function getGameRooms(req, res) {
  const supabase = createSupabaseClient({ req, res });
  const { data, error } = await supabase.from("game_rooms").select("*");

  if (error) {
    console.error("Error fetching game rooms:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: `Error fetching game rooms: ${error.message}`,
      });
  }

  return res.status(200).json({ success: true, rooms: data });
}

// POST /create-room
async function createGameRoom(req, res) {
  const supabase = createSupabaseClient({ req, res });
  const { userId, mode } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({
        success: false,
        message: "User ID is required to create a room",
      });
  }

  // Generate a unique room ID

  const roomData = {
    host_id: userId,
    created_at: new Date(),
    mode,
  };

  const { data, error } = await supabase
    .from("game_rooms")
    .insert([roomData])
    .select()
    .single();

  if (error) {
    console.error("Error creating game room:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: `Error creating game room: ${error.message}`,
      });
  }

  console.log("Game room created:", data);

  // Add the host to the game_players table

  return res.status(200).json({ success: true, roomId: data.id });
}

// GET /get-room/:roomId
async function getRoom(req, res) {
  const { roomId } = req.params;
  const supabase = createSupabaseClient({ req, res });

  const { data, error } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (error) {
    console.error("Error fetching game room:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: `Error fetching game room: ${error.message}`,
      });
  }

  if (!data) {
    return res
      .status(404)
      .json({ success: false, message: "Game room not found" });
  }

  return res.status(200).json({ success: true, room: data });
}

async function createNewCulpritVote(req, res) {
  try {
    const { roomId } = req.params;
    const { culpritVote } = req.body;
    const supabase = createSupabaseClient({ req, res });

    if (!culpritVote) {
      return res
        .status(400)
        .json({ success: false, message: "Culprit vote is required" });
    }

    const { data: roomData, error: roomError } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError) {
      console.error("Error fetching game room:", roomError);
      return res
        .status(500)
        .json({
          success: false,
          message: `Error fetching game room: ${roomError.message}`,
        });
    }

    if (!roomData) {
      return res
        .status(404)
        .json({ success: false, message: "Game room not found" });
    }

    let gameState = GameRoomService.decryptGameState(roomData.game_state);
    const deduction = gameState.deductions.find(deduction => deduction.active);
    if (deduction) {
      deduction.culpritVote = culpritVote;
    } else {
      return res
        .status(400)
        .json({ success: false, message: "No unsubmitted deduction found" });
    }

    gameState = GameRoomService.encryptGameState(gameState);

    const updatedRoomData = await GameRoomService.updateGameRoom(roomId, { game_state: gameState });

    return res
      .status(200)
      .json({ success: true, game_state: updatedRoomData.game_state });
  } catch (error) {
    console.error("Error creating new culprit vote:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: `Error creating new culprit vote: ${error.message}`,
      });
  }
}
// take in a lead object from the body, get the game state from the room, and update the game state with the new lead and save it back to the database
async function createNewLead(req, res) {
  try {
    const { roomId } = req.params;
    const { lead } = req.body;
    const supabase = createSupabaseClient({ req, res });

    if (!lead) {
      return res
        .status(400)
        .json({ success: false, message: "Lead is required" });
    }

    const { data: roomData, error: roomError } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError) {
      console.error("Error fetching game room:", roomError);
      return res
        .status(500)
        .json({
          success: false,
          message: `Error fetching game room: ${roomError.message}`,
        });
    }

    if (!roomData) {
      return res
        .status(404)
        .json({ success: false, message: "Game room not found" });
    }
    // console.log('Game room data:', roomData);
    let gameState = GameRoomService.decryptGameState(roomData.game_state);
    // push the leads onto the first unsubmuttied deduction
    gameState.deductions.find(deduction => deduction.active).leads.push(lead);
    // console.log('Updated game state:', gameState);
    gameState = GameRoomService.encryptGameState(gameState);
    // console.log('Encrypted game state:', gameState);

    const updatedRoomData = await GameRoomService.updateGameRoom(roomId, { game_state: gameState });

    // if (updateError) {
    //   console.error("Error updating game room:", updateError);
    //   return res
    //     .status(500)
    //     .json({
    //       success: false,
    //       message: `Error updating game room: ${updateError.message}`,
    //     });
    // }

    return res
      .status(200)
      .json({ success: true, game_state: updatedRoomData.game_state });
  } catch (error) {
    console.error("Error creating new lead:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: `Error creating new lead: ${error.message}`,
      });
  }
}

export { router as gameRoomRouter };
