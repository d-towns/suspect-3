import {GameRoomService} from "../../services/game-room.service.js";
import OpenAI from "openai"; 

export const setGameState = async () => {
    // the the most recent message in the thread
    const gameId = process.argv.slice(2)[0];
    const gameRoom = await GameRoomService.getGameRoom(gameId)
    const threadId = gameRoom.thread_id
    const client = new OpenAI({
        organization: process.env.OPENAI_ORGANIZATION_ID,
        project: process.env.OPENAI_PROJECT_ID,
      });
    const threadMessages = await client.beta.threads.messages.list(
        threadId, {limit: 1}
      );

    const newGameState = JSON.parse(threadMessages.data[0].content[0].text.value)

    console.log('New game state: ', newGameState)
    // get the game room
    // encrypt the new game state
    const newEncryptedState = GameRoomService.encryptGameState(newGameState)
    // update the game room with the new game state
    await GameRoomService.updateGameRoom(gameId, {game_state: newEncryptedState})
    console.log(`Game Room ${gameId} state successfully updated`)
    };

