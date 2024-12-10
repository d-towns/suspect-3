import { GameRoomService } from '../services/game-room.service.js';
import { OpenAIEloService } from '../services/openai-elo.service.js';
import { LeaderboardService } from '../services/leaderboard.service.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

async function processGameElo(gameRoomId) {
    try {
        // Get the game room
        const gameRoom = await GameRoomService.getGameRoom(gameRoomId);
        if (!gameRoom) {
            console.error('Game room not found');
            process.exit(1);
        }

        // Decrypt and check game state
        const gameState = GameRoomService.decryptGameState(gameRoom.game_state);
        if (gameState.status !== 'finished') {
            console.error('Game is not finished yet');
            process.exit(1);
        }

        // Use existing thread ID from game room
        const threadId = gameRoom.thread_id;
        
        // Add player ELO information to the thread
        const playerStats = await LeaderboardService.getLeaderboardStatsForPlayers(gameState.players.map(player => player.id));
        // Add player ELOs to thread
        // await OpenAIEloService.addPlayerEloToThread(
        // threadId,
        //   playerStats
        // );

        // Process the game thread and update ELO ratings
        await OpenAIEloService.processGameThread(threadId, gameRoomId);

        console.log('Successfully processed ELO updates for game room:', gameRoomId);
        process.exit(0);
    } catch (error) {
        console.error('Error processing game ELO:', error);
        process.exit(1);
    }
}

// Get gameRoomId from command line arguments
const gameRoomId = process.argv[2];
if (!gameRoomId) {
    console.error('Please provide a game room ID');
    process.exit(1);
}

processGameElo(gameRoomId);