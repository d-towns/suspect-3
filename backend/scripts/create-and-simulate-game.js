import { GameRoomService } from "../services/game-room.service.js";
import OpenaiGameService from "../services/openai-game-service.js";
import { populateGameThread } from "./populate-game-thread/populate-game-thread.js";
import { simulateVotingRound } from "./simulate-voting-round/simulate-voting-round.js";
import { LeaderboardService } from "../services/leaderboard.service.js";
import OpenAIEloService from "../services/openai-elo.service.js";

const players = [
  { id: "10428b95-58d6-4748-bb34-4f50a4cdf54a", email: "test@email.com" },
  { id: "643fe9f2-1b62-4390-b246-b4f56eae19cd", email: "pest@email.com" },
//   { id: "7ac3a8aa-3fde-45b0-9bc2-95c6d81d5b67", email: "gest@email.com" },
//   { id: "866a16a2-4704-4027-821c-bb43e7bbae77", email: "pop@gmail.com" },
];

const createAndSimulateGame = async () => {
  // create the game room with the host user and the other players

  const gameRoom = await GameRoomService.createGameRoom(players[0].id);
  console.log("Game Room Created: ", gameRoom);

  const thread = await OpenaiGameService.createGameThread(players);

  await GameRoomService.updateGameRoom(gameRoom.id, { thread_id: thread.id });
  let updatedGameState;
  updatedGameState = await OpenaiGameService.runThreadAndProcess(
    thread.id,
    gameRoom.id,
    true
  );
  console.log("Initial Game State: ", updatedGameState);
  const roundTypes = updatedGameState.rounds.map((round) => round.type);
  for (let round of roundTypes) {
    // if we have an active interrogation round, populate the thread with the conversation
    if (updatedGameState.status === "finished") {
      break;
    }
    if (round === "interrogation") {
      await populateGameThread(gameRoom.id);
      updatedGameState = await OpenaiGameService.runThreadAndProcess(
        thread.id,
        gameRoom.id,
        true
      );
    } else if (round === "voting") {
      await simulateVotingRound(gameRoom.id, { culpritWins: true });
      updatedGameState = await OpenaiGameService.runThreadAndProcess(
        thread.id,
        gameRoom.id,
        true
      );
    }

    console.log("Round completed");
    console.log("Updated Game State: ", updatedGameState);
    //if we have an active voting round, populate the thread with the voting options
  }
  if (updatedGameState.status !== "finished") {
    await OpenaiGameService.addMessageToThread(
      thread.id,
      "The game is now complete. Please update the game status to finished."
    );
    updatedGameState = await OpenaiGameService.runThreadAndProcess(
      thread.id,
      gameRoom.id,
      true
    );
  }

  const playerStats = await LeaderboardService.getLeaderboardStatsForPlayers(
    updatedGameState.players.map((player) => player.id)
  );
  // Add player ELOs to thread
  await OpenAIEloService.addPlayerEloToThread(threadId, playerStats);


  // Process the game thread and update ELO ratings
  const eloUpdates = await OpenAIEloService.processGameThread(threadId, gameRoomId);


  console.log("Game Completed");

  console.log("Final Game State: ", updatedGameState + '\n');
  console.log("ELO Updates: ", eloUpdates + '\n');


  return;
};

await createAndSimulateGame();
