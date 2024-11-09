import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
async function runThead() {
    const threadId = process.argv.slice(2)[0];
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
            console.log(JSON.parse(finalMessage.content[0].text))
      } else if(run.status === "failed") {
        console.log("Error during run:" + run.last_error)
      }

}

runThead();
