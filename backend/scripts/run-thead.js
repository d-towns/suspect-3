import OpenAI from "openai";
import dotenv from 'dotenv';
import { GameRoomService } from "../services/game-room.service.js";
dotenv.config({ path: '../.env' });
export async function runThread(gameRoomId) {
    const threadId = await GameRoomService.getGameRoom(gameRoomId).thread_id
    const client = new OpenAI({
        organization: process.env.OPENAI_ORGANIZATION_ID,
        project: process.env.OPENAI_PROJECT_ID,
      });
    
      const run = await client.beta.threads.runs.createAndPoll(
        threadId,
        { assistant_id: process.env.OPENAI_GAMEMASTER_ASSISTANT_ID}
      );
      console.log('run created')

      if(run.status === "completed") {
        // list the most recent messages in the thread
        const finalMessage = await client.beta.threads.messages.list(
            threadId, {limit: 1}
          );
            console.log(finalMessage.data[0].content[0].text.value)
            
      } else if(run.status === "failed") {
        console.log("Error during run:" + run.last_error)
      }

}
