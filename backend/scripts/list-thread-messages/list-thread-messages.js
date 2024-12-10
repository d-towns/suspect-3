import OpenAI from 'openai'
import  {GameRoomService} from '../../services/game-room.service.js';

 export const listThreadMessages = async (gameRoomId) => {
    console.log(`listing thread messages for game room ${gameRoomId}`)
    const gameRoom = await GameRoomService.getGameRoom(gameRoomId)
    const threadId = gameRoom.thread_id
    try {
        const client = new OpenAI({
            organization: process.env.OPENAI_ORGANIZATION_ID,
            project: process.env.OPENAI_PROJECT_ID,
          });
        const threadMessages = await client.beta.threads.messages.list(
            threadId, {limit: 100}
          );
          for (let message of threadMessages.data.reverse()) {
              console.log(message.content[0].text)
              console.log("\n")
          }
    } catch (e) {
        console.error("error listing thread messages", e)
    }
}


