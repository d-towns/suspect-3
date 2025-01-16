import { LeaderboardService } from "../services/leaderboard/leaderboard.service.js";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

async function createLeaderboardEntry(userId) {
  let playerStats = await LeaderboardService.getLeaderboardStatsForPlayer(
    userId
  );

  // if there is no leaderboard entry to the user, then
  if (playerStats.length === 0) {
    playerStats = await LeaderboardService.createLeaderboardEntry(userId);
    console.log("Leaderboard entry created for user\n\n");
  } else {
    console.log("Leaderboard entry already exists for user\n\n");
  }

  console.log(playerStats);
}

await createLeaderboardEntry(process.argv[2]);
