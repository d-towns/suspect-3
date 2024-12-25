import OpenAI from "openai";
import LLMGameService from "./llm_game_service";
export default class OpenAIGameService extends LLMGameService {
  constructor() {
    super();
    try {
      this.client = new OpenAI(
        process.env.NODE_ENV === "dev"
          ? {
              organization: process.env.OPENAI_ORGANIZATION_ID,
              project: process.env.OPENAI_PROJECT_ID,
            }
          : { apiKey: process.env.OPENAI_SERVICE_API_KEY_TEST }
      );
    } catch (error) {
      console.error("Error in _OpenAIGameService constructor:", error);
      this.client = null;
    }
  }

  /**
   * Adds a message to the specified thread.
   * @param {string} roomId
   * @param {{ role: string, content: string }} message
   * @returns {Promise<any>}
   */
  async addMessageToThread(roomId, message) {
    try {
      if (!roomId) {
        console.error("addMessageToThread error: roomId is required.");
        return null;
      }
      if (!message || !message.role || !message.content) {
        console.error("addMessageToThread error: invalid message.");
        return null;
      }
      const result = await this.client.beta.threads.messages.create(roomId, {
        role: message.role,
        content: message.content,
      });
      return result;
    } catch (error) {
      console.error("Error in addMessageToThread:", error);
      return null;
    }
  }

  /**
   * Creates a thread for a game.
   * @returns {Promise<any>}
   */
  async createGameThread() {
    try {
      const thread = await this.client.beta.threads.create();
      return thread;
    } catch (error) {
      console.error("Error in createGameThread:", error);
      return null;
    }
  }

  /**
   * Runs a thread with the LLM client using assistantId and threadId.
   * @param {string} assistantId
   * @param {string} threadId
   * @returns {Promise<Object | null>}
   */
  async runGameThread(assistantId, threadId) {
    try {
      if (!assistantId || !threadId) {
        console.error(
          "runGameThread error: assistantId and threadId are required."
        );
        return null;
      }
      const run = await this.client.beta.threads.runs.createAndPoll(threadId, {
        assistant_id: assistantId,
      });

      if (run.status === "completed") {
        const messages = await this.client.beta.threads.messages.list(
          run.thread_id
        );
        const mostRecentGameState =
          messages.data.reverse()[0].content[0].text.value;
        console.log("Most recent game state:", mostRecentGameState);

        return JSON.parse(mostRecentGameState);
      }

      return null;
    } catch (error) {
      console.error("Error in runGameThread:", error);
      return null;
    }
  }



  /**
   * TODO: this may not be needed once we are using turn detection
   * Commits the audio buffer to produce a response.
   * @param {string} roomId
   * @returns {Promise<any>}
   */
  async createRealtimeResponse(roomId) {
    try {
      if (!roomId) {
        console.error("createRealtimeResponse error: roomId is required.");
        return null;
      }
      const ws = this.client.beta.threads.realtime.get(roomId);
      if (!ws) {
        console.error("createRealtimeResponse error: no connection found.");
        return null;
      }
      ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      return { status: "response_created" };
    } catch (error) {
      console.error("Error in createRealtimeResponse:", error);
      return null;
    }
  }

  /**
   * Opens a realtime conversation (websocket).
   * @returns {Promise<any>}
   */
  async openRealtimeConversation() {
    return new Promise((resolve, reject) => {
      const url =
        "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
      const ws = new Websocket(url, {
        headers: {
          Authorization: "Bearer " + process.env.OPENAI_API_KEY,
          "OpenAI-Beta": "realtime=v1",
        },
      });

      ws.once("open", () => {
        resolve(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      });
    });
  }

  /**
   * Creates a chat completion using the Chat API.
   * @param {Array<{ role: 'user' | 'assistant', content: string }>} messages
   * @param {ZodObject} responseFormat - Zod object to parse the response, Must be wrapped in zodResponseFormat().
   * @returns {Promise<any>}
   */
  async createChatCompletion(messages, responseFormat) {
    try {
      if (!messages || !Array.isArray(messages)) {
        console.error(
          "createChatCompletion error: messages array is required."
        );
        return null;
      }
      if (!responseFormat) {
        console.error(
          "createChatCompletion error: responseFormat is required."
        );
        return null;
      }

      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: messages,
        response_format: responseFormat,
      });

      const result = completion.choices[0].message.content;
      return responseFormat.parse(result);
    } catch (error) {
      console.error("Error in createChatCompletion:", error);
      return null;
    }
  }
}
