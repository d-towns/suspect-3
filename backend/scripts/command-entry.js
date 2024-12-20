import { listThreadMessages } from "./list-thread-messages/list-thread-messages.js";
import { simulateVotingRound } from "./simulate-voting-round/simulate-voting-round.js";
import { createAssistants } from './create-assistants.js';
import { runThread } from "./run-thead.js";
import { resetGameState } from "./reset-game-state/reset-game-state.js";
import { populateGameThread } from "./populate-game-thread/populate-game-thread.js";

const scripts = {
  list_thread_messages: (gameRoomId) => {
    try {
      console.log('gameRoomId:', gameRoomId);
      listThreadMessages(gameRoomId);
      console.log('Executed "list_thread_messages" successfully.');
    } catch (error) {
      console.error('Error executing "list_thread_messages":', error);
    }
  },
  populate_game_thread: (gameId) => {
    try {
      populateGameThread(gameId);
      console.log('Executed "populate_game_thread" successfully.');
    } catch (error) {
      console.error('Error executing "populate_game_thread":', error);
    }
  },
  reset_game_state: (gameRoomId) => {
    try {
      resetGameState(gameRoomId);
      console.log('Executed "reset_game_state" successfully.');
    } catch (error) {
      console.error('Error executing "reset_game_state":', error);
    }
  },
  simulate_voting_round: (gameRoomId, options) => {
    try {
      simulateVotingRound(gameRoomId, options);
      console.log('Executed "simulate_voting_round" successfully.');
    } catch (error) {
      console.error('Error executing "simulate_voting_round":', error);
    }
  },
  create_assistant: () => {
    try {
      createAssistants()
      console.log('Executed "create_assistant" successfully.');
    } catch (error) {
      console.error('Error executing "create_assistant":', error);
    }
  },
  run_thread: (gameRoomId) => {
    try {
      runThread(gameRoomId);
      console.log('Executed "run_thread" successfully.');
    } catch (error) {
      console.error('Error executing "run_thread":', error);
    }
  },
};

const scriptName = process.argv[2];
const scriptArgs = process.argv.slice(3);

if (scripts[scriptName]) {
  console.log(`Executing script with args "${scriptName}"... ${scriptArgs}`);
  scripts[scriptName](...scriptArgs);
} else {
  console.error(`Script "${scriptName}" not found. Available scripts: ${Object.keys(scripts).join(', ')}`);
  process.exit(1);
}
