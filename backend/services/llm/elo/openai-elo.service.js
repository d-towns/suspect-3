import OpenAI from "openai";
import dotenv from "dotenv";
import { z } from "zod";
import { GameRoomSocketServer } from "../../../socket/io.js";
import { createClient } from "@supabase/supabase-js";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { EventEmitter } from "events";
import { LeaderboardSchema } from "../../../models/leaderboard.schema.js";
import { SocketEvents } from "../../../socket/events_schema.js";

dotenv.config({ path: "../.env" });

class EventHandler extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;
    this.results = null;
  }

  async onEvent(event) {
    try {
      // Retrieve events that are denoted with 'requires_action'
      // since these will have our tool_calls
      if (event.event === "thread.run.requires_action") {
        const response = await this.handleRequiresAction(
          event.data,
          event.data.id,
          event.data.thread_id
        );
      } else if (event.event === "thread.message.completed") {
        // Store the results for later use
        console.log("Event data:", event.data.content[0].text.value);
        this.results = JSON.parse(event.data.content[0].text.value);
      }
    } catch (error) {
      console.error("Error handling event:", error);
    }
  }

  async handleRequiresAction(data, runId, threadId) {
    try {
      const toolCalls = data?.required_action?.submit_tool_outputs?.tool_calls || [];
      // Only handle calls where function.name === "calculateEloChanges"
      const toolOutputs = toolCalls
        .filter(toolCall => toolCall.function?.name === "calculateEloChanges")
        .map(toolCall => {
          const parsedArgs = JSON.parse(toolCall.function.arguments);
          console.log("Calculating ELO changes for players:", parsedArgs.players);
          return {
            tool_call_id: toolCall.id,
            output: OpenAIEloService.calculateEloChanges(parsedArgs.players),
          };
        });
  
      console.log("Filtered tool outputs:", toolOutputs);
      // Make sure to await if 'submitToolOutputs' is async
      this.submitToolOutputs(toolOutputs, runId, threadId).then(() => {
        console.log("Tool outputs submitted successfully");
      });
    } catch (error) {
      console.error("Error processing required action:", error);
    }

  }

  async submitToolOutputs(toolOutputs, runId, threadId) {
    let stream;
    try {
      // Use the submitToolOutputsStream helper
      stream = await this.client.beta.threads.runs.submitToolOutputsStream(
        threadId,
        runId,
        { tool_outputs: toolOutputs }
      );
      for await (const event of stream) {
        // console.log("Tool output event received:", event);
        this.emit("event", event);
      }

    } catch (error) {
      console.error("Error submitting tool outputs:", error);
    }
  }
}

export class OpenAIEloService {
  static client = new OpenAI( process.env.NODE_ENV === 'dev' ? {
    organization: process.env.OPENAI_ORGANIZATION_ID,
    project: process.env.OPENAI_PROJECT_ID,
  } : {apiKey: process.env.OPENAI_SERVICE_API_KEY_TEST});
  static supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );



  static async createEloAssistant() {
    try {
      const assistant = await this.client.beta.assistants.create({
        name: "Elo Evaluator",
        instructions: `
You are an assistant tasked with analyzing a game thread and determining the ELO rating changes for each player.

Consider multiple attributes:
- All players who won should have a positive change in ELO.
- All players who lost should have a negative change in ELO.
- Consider individual performance, cooperation, and strategy.

Badges are an array consisting of descriptors of how the player played the game.

Possible badges include:
- Positive: 'strategist', 'team_player', 'dedicated', 'quick_thinker', 'detective'
- Negative: 'slacker', 'antagonist', 'slow_poke', 'flustered', 'clueless'

In the explanation, provide a detailed analysis of why the player received the badge, referencing their actions in the game like the kinds of questions they asked, how they built their dueduction graph, etc.

Analyze the game thread thoroughly to assign appropriate ELO changes and badges.`,
        response_format: zodResponseFormat(
          LeaderboardSchema,
          "leaderboard_results"
        ),
        model: "gpt-4o-2024-08-06",
        tools: [
          {
            type: "function",
            function: {
              name: "calculateEloChanges",
              description:
                "Calculate ELO rating changes for players based on game results",
              parameters: {
                type: "object",
                properties: {
                  players: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        elo: { type: "number" },
                        won: { type: "boolean" },
                      },
                      required: ["id", "elo", "won"],
                    },
                  },
                },
                required: ["players"],
              },
            },
          },
        ],
      });

      console.log("Elo Assistant created:", assistant.id);
      return assistant;
    } catch (error) {
      console.error("Error creating Elo Assistant:", error);
      throw error;
    }
  }

  static calculateEloChanges(players) {
    console.log("Calculating ELO changes for players:", players);
    const K = 32;
    const averageElo =
      players.reduce((acc, player) => acc + player.elo, 0) / players.length;
    const expectedScores = players.map((player) => {
      const expectedScore = 1 / (1 + 10 ** ((averageElo - player.elo) / 400));
      return expectedScore;
    });
    const ratingChanges = players.map((player, index) => {
      const actualScore = players[index].won ? 1 : 0;
      const ratingChange = {
        playerId: player.id,
        newRating: K * (actualScore - expectedScores[index]) + player.elo,
      };
      return ratingChange;
    });
    console.log("Rating changes:", ratingChanges);
    console.log("Average Elo:", averageElo);
    return JSON.stringify(ratingChanges);
  }

  /**
   * Adds player ELO ratings to an OpenAI thread
   * @param {string} threadId - The ID of the OpenAI thread
   * @param {Array<{id: string, elo: number}>} players - Array of player objects containing ID and ELO rating
   * @returns {Promise<void>}
   */
  static async addPlayerEloToThread(threadId, players, outcome) {
    try {
      const message = `Current player ratings:\n${players
        .map((p) => `Player ${p.user_id}: ${p.elo}`)
        .join(
          "\n"
        )}\n\nPlease analyze the game and calculate ELO changes based on player performance. the outcome of the game for this player is ${outcome}`;

      await this.client.beta.threads.messages.create(threadId, {
        role: "user",
        content: message,
      });
    } catch (error) {
      console.error("Error adding player ELO to thread:", error);
      throw error;
    }
  }

  static async processGameThread(threadId) {
    let stream;
    try {
      const assistantId = process.env.OPENAI_ELO_ASSISTANT_ID;
      const eventHandler = new EventHandler(this.client);
      eventHandler.on("event", eventHandler.onEvent.bind(eventHandler));

      const runs = await this.client.beta.threads.runs.list(
        threadId,
      );

      const activeRuns = runs?.data?.filter(run => ['in_progress', 'requires_action'].includes(run.status));

      // if there is an active run, return 
      if (activeRuns.length > 0) {
        console.log("Active runs found, cannot calculate ELO changes", activeRuns);
        return;
      }



      stream = await this.client.beta.threads.runs.stream(
        threadId,
        {
          assistant_id: assistantId,
        },
        eventHandler
      );

      for await (const event of stream) {
        console.log("Event received:", event);
        eventHandler.emit("event", event);
      }

      while (eventHandler.results === null) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      // console.log(stream);


      const leaderboardData = eventHandler.results;

      console.log("Leaderboard data:", leaderboardData);
      
      return leaderboardData;
      // if (leaderboardData) {
      //   // Update ELO and wins in the database
      //   await this.updatePlayerStats(leaderboardData.playerResults);
      //   this.emitLeaderboardUpdates(leaderboardData.playerResults);

      //   return leaderboardData.playerResults;
      // }
    } catch (error) {
      // console.log the error and cancel the stream if it exists
      console.error("Error processing game thread:", error);
    }
  }

  static async emitLeaderboardUpdates(playerResults) {
    const socketServer = GameRoomSocketServer.getInstance();
    for (const results of playerResults) {
      const { playerId, oldRating, newRating, badges } = results;
      const socketId = socketServer.getSocketForUser(playerId);
      if (socketId) {
        socketServer.emitToSocket(socketId, SocketEvents.LEADERBOARD_UPDATED, {
          oldRating,
           newRating,
          badges,
        });
      } else {
        console.log("No socket found for user:", playerId);
      }
    }
  }

  static async waitForRunCompletion(threadId, runId) {
    let run = { status: "queued" };

    while (run.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await this.client.beta.threads.runs.retrieve(threadId, runId);
      console.log("Elo Run status:", run.status);

      if (run.status === "requires_action") {
      }

      if (run.status === "failed") {
        console.error("Elo Run failed:", run);
        return null;
      }
    }

    if (run.status === "completed") {
      const messages = await this.client.beta.threads.messages.list(threadId);
      const lastMessage = messages.data[messages.data.length - 1];
      const leaderboardData = JSON.parse(lastMessage.content[0].text.value);
      return leaderboardData;
    }
  }

  static async updatePlayerStats(playerResults) {
    console.log("Updating player stats:", playerResults);
    for (const result of playerResults) {
      const { playerId, newRating, won } = result;

      const { data, error } = await this.supabase
        .from("leaderboard")
        .select("elo, multi_wins")
        .eq("user_id", playerId)
        .single();

      if (error) {
        console.error("Error fetching player stats:", error);
        continue;
      }

      const newElo = newRating;
      const newWins = won ? data.multi_wins + 1 : data.multi_wins;

      const { error: updateError } = await this.supabase
        .from("leaderboard")
        .update({ elo: newElo, multi_wins: newWins })
        .eq("user_id", playerId);

      console.log("Player stats updated:", playerId, newElo, newWins);

      if (updateError) {
        console.error("Error updating player stats:", updateError);
      }
    }
  }
}

export default OpenAIEloService;
