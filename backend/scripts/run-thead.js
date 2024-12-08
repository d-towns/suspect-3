import OpenAI from "openai";
import dotenv from 'dotenv';
import { GameRoomService } from "../services/game-room.service.js";
import {createClient} from '@supabase/supabase-js';
dotenv.config({ path: '../.env' });
export async function runThread(gameRoomId) {
    const gameRoom = await GameRoomService.getGameRoom(gameRoomId)
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const client = new OpenAI({
        organization: process.env.OPENAI_ORGANIZATION_ID,
        project: process.env.OPENAI_PROJECT_ID,
      });
    
      const run = await client.beta.threads.runs.createAndPoll(
        gameRoom.thread_id,
        { assistant_id: process.env.OPENAI_GAMEMASTER_ASSISTANT_ID}
      );
      console.log('run created')

      if(run.status === "completed") {
        // list the most recent messages in the thread
        const finalMessage = await client.beta.threads.messages.list(
          gameRoom.thread_id, {limit: 1}
          );
            console.log(finalMessage.data[0].content[0].text.value)
        
        // update the game state with the final message
        console.log('encrpyted game state', GameRoomService.encryptGameState(finalMessage.data[0].content[0].text.value))

        await supabase.from('game_rooms').update({game_state: GameRoomService.encryptGameState(JSON.parse(finalMessage.data[0].content[0].text.value))}).eq('id', gameRoomId)
        
        console.log('Game thread run completed successfully, game state saved')
            
      } else if(run.status === "failed") {
        console.log("Error during run:" + run.last_error)
      }

}
