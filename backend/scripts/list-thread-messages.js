import OpenAI from 'openai'

const listThreadmessages = async (threadId) => {
    try {
        const client = new OpenAI({
            organization: process.env.OPENAI_ORGANIZATION_ID,
            project: process.env.OPENAI_PROJECT_ID,
          });
        const threadMessages = await client.beta.threads.messages.list(
            threadId
          );
          for (let message of threadMessages.data) {
              console.log(message.content[0].text)
              console.log("\n")
          }
    } catch (e) {
        console.error("error listing thread messages", e)
    }
}

listThreadmessages(process.argv.slice(2)[0]);


