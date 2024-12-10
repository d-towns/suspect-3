import { Router } from "express";
import { createSupabaseClient } from "../db/supabase.js";
import { z } from "zod";

const LeaderboardSchema = z.object({
  id: z.number(),
  created_at: z.string().datetime(),
  single_wins: z.number(),
  single_average_guilt_score: z.number(),
  multi_wins: z.number(),
  multi_average_guilt_score: z.number(),
  elo: z.number(),
  user_id: z.string().uuid(),
});

const router = Router();

// Middleware for error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /leaderboard
router.get("/", asyncHandler(getLeaderboard));

// GET /leaderboard/:userId
router.get("/:userId", asyncHandler(getUserStats));

// POST /leaderboard
router.post("/", asyncHandler(createLeaderboardEntry));

// PUT /leaderboard/:userId
router.put("/:userId", asyncHandler(updateLeaderboardEntry));

// DELETE /leaderboard/:userId
router.delete("/:userId", asyncHandler(deleteLeaderboardEntry));

async function getLeaderboard(req, res) {
  const supabase = createSupabaseClient({ req, res });
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const { data, error } = await supabase.from("leaderboard_with_usernames").select("*").range(offset, offset + limit - 1);

    console.log('data', data)

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return res.status(500).json({
      success: false,
      message: `Error fetching leaderboard: ${error.message}`,
    });
  }

  return res.status(200).json({
    success: true,
    leaderboard: data,
    page,
    limit,
  });
}

async function getUserStats(req, res) {
  const { userId } = req.params;
  const supabase = createSupabaseClient({ req, res });

  const { data, error } = await supabase
    .from("leaderboard_with_usernames")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching user stats:", error);
    return res.status(500).json({
      success: false,
      message: `Error fetching user stats: ${error.message}`,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "User stats not found",
    });
  }

  return res.status(200).json({ success: true, stats: data });
}

async function createLeaderboardEntry(req, res) {
  const supabase = createSupabaseClient({ req, res });
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      success: false,
      message: "User ID is required",
    });
  }

  const newEntry = {
    user_id,
    created_at: new Date().toISOString(),
    single_wins: 0,
    single_average_guilt_score: 0,
    multi_wins: 0,
    multi_average_guilt_score: 0,
    elo: 100,
  };

  const { data, error } = await supabase
    .from("leaderboard")
    .insert([newEntry])
    .select()
    .single();

  if (error) {
    console.error("Error creating leaderboard entry:", error);
    return res.status(500).json({
      success: false,
      message: `Error creating leaderboard entry: ${error.message}`,
    });
  }

  return res.status(201).json({ success: true, entry: data });
}

async function updateLeaderboardEntry(req, res) {
  const { userId } = req.params;
  const supabase = createSupabaseClient({ req, res });
  const updates = req.body;

  const { data, error } = await supabase
    .from("leaderboard")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating leaderboard entry:", error);
    return res.status(500).json({
      success: false,
      message: `Error updating leaderboard entry: ${error.message}`,
    });
  }

  return res.status(200).json({ success: true, entry: data });
}

async function deleteLeaderboardEntry(req, res) {
  const { userId } = req.params;
  const supabase = createSupabaseClient({ req, res });

  const { error } = await supabase
    .from("leaderboard")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting leaderboard entry:", error);
    return res.status(500).json({
      success: false,
      message: `Error deleting leaderboard entry: ${error.message}`,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Leaderboard entry deleted successfully",
  });
}

export { router as leaderboardRouter };
