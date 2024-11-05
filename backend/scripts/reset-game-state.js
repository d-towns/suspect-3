import { createClient } from '@supabase/supabase-js';
import { GameRoomService } from '../services/game-room.service.js';
import OpenAI from "openai";
// read in the uuid from args
const resetGameState = async () => {
    try {
        const gameRoomId = process.argv.slice(2)[0]
        console.log(`resetting game state for game room ${gameRoomId}`)
        const gameRoom = await GameRoomService.getGameRoom(gameRoomId)
        const gameState = GameRoomService.decryptGameState(gameRoom.game_state)
        const gameThreadId = gameRoom.thread_id
        const client = new OpenAI({
            organization: process.env.OPENAI_ORGANIZATION_ID,
            project: process.env.OPENAI_PROJECT_ID,
          });
        
        
        // List all messages in the thread, get all of the message ids, and then delete all of them except for the first one that specifies the crime for the game
        const threadMessages = await client.beta.threads.messages.list(
            gameThreadId
          );
        const messageIds = threadMessages.data.map((message) => message.id);
        const messageIdsToDelete = messageIds.slice(1);
        for(let id of messageIdsToDelete)  {
            await client.beta.threads.messages.del(
                gameThreadId,
                id
              );
        }

        gameState.rounds[0].status = "active"
        for(let i = 1; i < gameState.rounds.length; i++) {
            gameState.rounds[i].status = "inactive"
        }
        gameState.status = 'setup'
        console.log('Updated state: ', gameState)

        const newEncryptedState = GameRoomService.encryptGameState(gameState)
    
        await GameRoomService.updateGameRoom(gameRoomId, {game_state: newEncryptedState})
    
        console.log(`Game Room ${gameRoomId} state successfully reset`)
    } catch (e) {
        console.error("error resetting game state", e)
    }


}

resetGameState();