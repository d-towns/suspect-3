import { z } from "zod";

const badgesEnum = [
    "strategist",
    "team_player",
    "dedicated",
    "quick_thinker",
    "detective",
    "slacker",
    "antagonist",
    "slow_poke",
    "flustered",
    "clueless",
  ];

export const PlayerResultSchema = z.object({
  playerId: z.string(),
  oldRating: z.number(),
  newRating: z.number(),
  won: z.boolean(),
  badges: z.array(
    z.object({ badge: z.enum(badgesEnum), explanation: z.string() })
  ),
});

export const LeaderboardSchema = z.object({
    gameMode: z.enum(["single", "multi"]),
  playerResults: z.array(PlayerResultSchema),
});
