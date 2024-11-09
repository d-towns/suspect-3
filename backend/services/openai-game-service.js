/**
 * We are building a web game called suspect 3. This the is game prospect,
 * think of it as a MVP. in the game, each player is assigned an identify and 3
 * out of the 6 evidence peices of their case. they have 5 minutes to convince the interragator ( a chat gpt assistant )
 * that they aren't the one who commited to crime. each person enters the room one at a time and doesn't know what the other people said,
 * but the interragator doees, and so if the stories dont match then can point it out. the interregator works of off an algorithm that moves a
 * float from .01 to 1.00 where 1 is guilt and .01 is innocent. the game is won by the average score of the team is less than .30.
 * The goal of this class is to create the assistants that will act as the interregator in the game
 * It will be responsible for creating original game state, and updating the game state
 * It will be responsible for creating the messages that are sent to the assistant and the player
 */

import OpenAI from "openai";
import dotenv from "dotenv";
import { GameRoomSocketServer } from "../socket/io.js";
import Websocket from "ws";
import fs from "fs";
import { GameRoomService } from "./game-room.service.js";
import {
  saveBase64PCM16ToWav,
  convertAudioMessageDeltasToAudio,
} from "../utils/audio-helpers.js";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

dotenv.config({ path: "../.env" });

class OpenaiGameService {
  static client = new OpenAI({
    organization: process.env.OPENAI_ORGANIZATION_ID,
    project: process.env.OPENAI_PROJECT_ID,
  });

  static lastAudioMessageDeltas = [];
  static lastAudioMessageTranscript = [];
  static roomRealtimeSessions = new Map();

  static GameStateSchema = z
    .object({
      status: z
        .enum(["setup", "active", "finished"])
        .describe("The current status of the game"),
      crime: z
        .object({
          type: z.string(),
          location: z.string(),
          time: z.string(),
          description: z.string(),
        })
        .strict(),
      rounds: z.array(
        z
          .object({
            player: z
              .string()
              .describe(
                "The player ID for the round, this should always be the uuid of the player that was passed in the first message of the thread"
              ),
            status: z
              .enum(["inactive", "active", "completed"])
              .describe("The status of the round"),
            type: z
              .enum(["interrogation", "kill"])
              .describe("The type of round"),
            conversation: z.array(
              z
                .object({
                  speaker: z.string(),
                  message: z.string(),
                })
                .strict()
            ),
            results: z
              .object({
                guiltScoreUpdate: z.number(),
                playerFlipped: z.boolean(),
                votingResults: z.array(
                  z
                    .object({
                      player: z.string(),
                      suspect: z.string(),
                    })
                    .strict()
                ),
              })
              .strict(),
          })
          .strict()
      ),
      players: z.array(
        z
          .object({
            id: z.string(),
            identity: z.string(),
            evidence: z.array(z.string()),
            guiltScore: z.number(),
            interrogated: z.boolean(),
          })
          .strict()
      ),
      allEvidence: z.array(z.string()),
      interrogationProgress: z.number(),
      outcome: z
        .object({
          teamWon: z.boolean(),
          averageGuiltScore: z.number(),
        })
        .strict(),
    })
    .strict();

  static async createGameMasterAssistant() {
    console.log("Creating Game Master Assistant...");
    try {
      const assistant = await this.client.beta.assistants.create({
        name: "Game Master",
        instructions: 
`You are the Game Master for a game called Suspect 3. Your role is to create a crime scenario, assign identities and evidence pieces to players, and conduct interrogations. Here are your key responsibilities:

1. Create a crime scenario with the following details:
   - Type of crime
   - Location
   - Time of occurrence
   - Brief description of what happened
   - Use the provided player IDs when assigning identities to players
   - the crime scenario has a culprit, and the goal of the game is to determine who the culprit is

2. Generate evidence pieces:
   - Create 6 evidence pieces related to the crime

3. Assign identities to players:
    - Each player gets a unique identity related to the crime scenario
    - The identities should be assigned in a way that makes it difficult for players to determine who committed the crime
    - Give the identity a real name and a brief description of their background
    - Only one player can be the culprit. Assign evidence in a way that makes it difficult to determine who the culprit is
    - Use the provided player IDs when assigning identities - Each player gets a unique identity related to the crime scenario


4. Distribute evidence:
   - Assign 3 out of 6 evidence pieces to each player

5. Analyze interrogations:
   - a conversation between the player and the a in game interrogator will be conducted and placed in the game thread
    - The interrogator will be an AI acting as a police detective
    - The goal of the interrogation is to determine the guilt of the player
    - The interrogator will use the evidence provided to assess the player's guilt
    - there will be a message in the conversation about the guilt score updates of each player after each back and forth exchange
    - use that to update the game state

7. Analyze voting rounds:
    - voting rounds are where all players vote on a suspect who they think is the killer
    - the votes will be placed in the game thread
    - if there is a consensus on someone being the culprit, update the game state accordingly
    - if the vote was correct, the non-culprit players win the game
    - if the vote was incorrect, the culprit wins the game

7. Assign rounds:
    - Conduct a total of n*2 rounds, where n is the number of players. so the total number of rounds is 2 times the number of players. there should never be more rounds than the number of players multiplied by 2
    - Each round is either an interrogation or a voting round
    - Interrogation Round Rules:
    - The player attribute for each round should be the player ID uuid
    - When the game state is first created, the first round should be an interrogation round for the first player. the round should be active and the status should be active
    - Each round has a status, it is either inactive, active, or completed
    - Interrogation rounds are for individual players, assign a player attribute for these rounds using their player ID uuid
    - voting round Rules:
    - voting rounds involve all players voting on a suspect who they think is the killer, make the player attribute for these rounds be "all".
    - there will be messages for each player and who they voted for
    - place those votes in the game state inside the round object
    - if there is a consensus on someone being the culprit, update the game state accordingly
    - if the vote was correct, the non-culprit players win the game
    - Conduct the rounds in sequence, starting with the first player and alternating between interrogation and voting rounds
    - Assign a interregation round for each player

Remember to be impartial but thorough in your investigation.`,
        model: "gpt-4o-2024-08-06",
        response_format: zodResponseFormat(this.GameStateSchema, "game_state"),
      });
      console.log("Game Master Assistant created successfully:", assistant.id);
      return assistant;
    } catch (error) {
      console.error("Error creating Game Master Assistant:", error);
      throw error;
    }
  }

  static addMessageToThread(threadId, content) {
    console.log(`Adding message to thread: ${threadId} with role: ${role}`);
    try {
      const message = this.client.beta.threads.messages.create(threadId, content);
      console.log("Message added to thread:", message);
      return message;
    } catch (error) {
      console.error("Error adding message to thread:", error);
      throw error;
    }
  }

  static async createGameThread(players) {
    console.log(`Creating game thread for ${players.length} players...`);
    try {
      const thread = await this.client.beta.threads.create();
      console.log("Game thread created:", thread.id);
      const crime = this.createCrime(players);
      await this.client.beta.threads.messages.create(thread.id, {
        role: "user",
        content: crime,
      });
      console.log("Initial message added to thread");
      return thread;
    } catch (error) {
      console.error("Error creating game thread:", error);
      throw error;
    }
  }

  static createCrime(players) {
    console.log(`Creating crime scenario for ${players.length} players`);
    const playerInfo = players
      .map((player) => `{id: "${player.id}", email: "${player.email}"}`)
      .join(", ");
    const crime = `Create a crime scenario for a game with the following ${players.length} players: [${playerInfo}]. Assign identities and distribute evidence to each player using their provided ids as the id field.`;
    console.log("Crime scenario created:", crime);
    return crime;
  }

  static async runThreadAndProcess(threadId, roomId) {
    console.log(
      `Running thread: ${threadId} with Game Master assistant: ${process.env.OPENAI_GAMEMASTER_ASSISTANT_ID}`
    );

    try {
      console.log(
        "Using assistant:",
        process.env.OPENAI_GAMEMASTER_ASSISTANT_ID
      );
      const run = await this.client.beta.threads.runs.create(threadId, {
        assistant_id: process.env.OPENAI_GAMEMASTER_ASSISTANT_ID,
      });
      console.log("Run created:", run.id);

      const gameState = await this.waitForRunCompletion(threadId, run.id);

      if (gameState) {
        console.log("Game state created:", gameState);

        // Save the encrypted game state to the database
        await GameRoomService.saveGameState(roomId, gameState);
        // TODO: this may be redundant since we can setup listeners using supabase on the game_rooms table
        const socketServer = GameRoomSocketServer.getInstance();
        socketServer.emitToRoom(roomId, "game-state-update", gameState);
        console.log("Game state update emitted to room:", roomId);
      }

      console.log("Thread run completed");
      return run;
    } catch (error) {
      console.error("Error running thread and processing:", error);
      throw error;
    }
  }
  /**
   *
   * @param {*} threadId
   * @param {*} runId
   * @returns gameState Object -> to be saved in encrytped format in the db
   *
   * Remember: the OpenAI Aissistant is tring the conversation threah into the strctured output using the function call
   *
   * control the flow of the game with user messages
   * they will come in the form of audio or text
   * audio for the interregations
   * text for the voting rounds and game management
   * how do i know when it is safe to start the game?
   * when all of the players are in the started game ( at the game/{game_id} page )
   * once that is the case i can start the first round
   * there are teo types of rounds
   * iterregation roudns or voting rounds
   * There are a total of n*2 rounds in a game where n is the number of total players
   * so the game state needs to have rounds object,
   * an array with a round object in each with their type, conversation (i rounds), and results ( guilt socre update, if the player flipped, who was voted as a rat,)
   * if the first game state update comes with a rounds object, we can take the first i round player and put then into the room, and start the interregation
   * client needs to have its socket ready to receive the first audio from the realtime API
   * I rounds are
   * - for a specific player
   * - last 2 minutes
   * - have guilt score updates after each back and forth exchange which send update-game state events so each player can see the score update
   * K rounds
   * - involve every players
   * - have each player vote on if a player is a rat
   * - if there is a consensus on someone being a rat
   * -- if it is true, the player is removed from the game and lose significant rank
   * -- if it is false, guilt scores are doubled what happened to the suspected rat is now added to the game crime for each player, making the game harder
   *
   *
   */
  static async waitForRunCompletion(threadId, runId) {
    let run = { status: "queued" };

    while (run.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await this.client.beta.threads.runs.retrieve(threadId, runId);
      console.log("Run status:", run.status);

      if (run.status === "failed") {
        console.error("Run failed:", run);
        console.error("Error:", run.last_error);
        return null;
      }
    }

    if (run.status === "completed") {
      const messages = await this.client.beta.threads.messages.list(
        run.thread_id
      );
      console.warn(
        "Most recent game state message:",
        messages.data.reverse()[0].content[0]
      );
      const mostRecentGameState =
        messages.data.reverse()[0].content[0].text.value;
      console.log("Most recent game state:", mostRecentGameState);

      return JSON.parse(mostRecentGameState);
    }
  }

  static async createMessageInThread(threadId, role, content) {
    console.log(`Creating message in thread: ${threadId} with role: ${role}`);
    try {
      const message = await this.client.beta.threads.messages.create(threadId, {
        role,
        content,
      });
      console.log("Message created:", message);
      return message;
    } catch (error) {
      console.error("Error creating message in thread:", error);
      throw error;
    }
  }


  static async addUserResponseToInputAudioBuffer(
    roomId,
    userId,
    base64AudioChunk
  ) {
    const outputPath = `./test_user_audio/${roomId}_${userId}_${
      Math.random() * 1000
    }.wav`;
    const ws = this.roomRealtimeSessions.get(roomId);
    if (!ws) {
      console.error("Realtime session not found for room:", roomId);
      return;
    }

    ws.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: base64AudioChunk,
      })
    );

    // await saveBase64PCM16ToWav(base64AudioChunk, outputPath);

    console.log(
      "Added audio to conversation item in realtime session for room: ",
      roomId
    );
  }

  /**
   * Commit the audio buffer to the realtime session for a specific room and create a response
   * @param {*} roomId
   * @returns
   */
  static async createInterrogationResponse(roomId) {
    const ws = this.roomRealtimeSessions.get(roomId);
    if (!ws) {
      console.error("Realtime session not found for room:", roomId);
      return;
    }
    ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
    console.log("Created response in realtime session for room:", roomId);
  }


  static async deduceGuiltScore(roomId) {
    return new Promise((resolve, reject) => {
      try {
      const ws = this.roomRealtimeSessions.get(roomId);
      if (!ws) {
        console.error("Realtime session not found for room:", roomId);
        return;
      }
      // add a conversation item to he realtiem chat to update the guilt score of the player
      ws.send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "assistant",
          content: [
            {
              type: "input_text",
              text: `This interrogation session is over. Call the function update_guilt_score to update the guilt score of the player based on the evidence and the player's responses.`,
            }
          ]
        },
      });

      ws.send(JSON.stringify({type: 'response.create'}));

      ws.on("message", async (data) => {
        const event = JSON.parse(data);
        if (event.type === "response.function_call_arguments.done") {
          await this.client.beta.threads.messages.create(threadId, {
            role: "assistant",
            content: `Interrogation results: ${JSON.stringify(event.arguments)}`,
          });
          resolve(event.arguments);
        }
      });
    } catch {
      reject("Error updating guilt score");
    }
    });
  }



  static async openRealtimeSession(roomId, gameState, threadId) {
    return new Promise((resolve, reject) => {
      const url =
        "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
      const ws = new Websocket(url, {
        headers: {
          Authorization: "Bearer " + process.env.OPENAI_API_KEY,
          "OpenAI-Beta": "realtime=v1",
        },
      });
      const socketServer = GameRoomSocketServer.getInstance();

      console.log("Connecting to OpenAI Realtime API...");

      ws.on("disconnect", () => {
        console.log("Disconnected from OpenAI Realtime API");
        this.roomRealtimeSessions.delete(roomId);
      });

      ws.on("error", (error) => {å
        console.error("Error with OpenAI Realtime API:", error);
        reject(error);
      });

      ws.on("message", async (data) => {
        try {
          const event = JSON.parse(data);
          switch (event.type) {
            case "error":
              console.error("Error from OpenAI Realtime API:", event);
              break;

            case "session.created":
              // take the session object and update its instructions to respond to the user's most previous message in the conversation, and do not respond as the user, but as their interrogator only
              const session = event.session;
              session.instructions = `You are AI who is acting as a police detective for a co-operative criminal mystery game. 
                        You will interrogate a set of suspects for this crime:
                         
                        ${JSON.stringify(gameState.crime.description)}. 
                        Time of the crime: ${gameState.crime.time}.
                        Location of the crime: ${gameState.crime.location}.

                        The identities of the suspects are as follows:
                        ${gameState.players
                          .map((player) => `${player.identity}`)
                          .join("\n")}
                        
                        Conduct a thorough interrogation, but only respond as the interrogator.
                        Do not respond as the user, but as their interrogator only. 
                        Use the provided player identities when referring to the players. Only one player will be in the interrogation room at a time. 
                        You can know who is in the room by using the user messages that are in the conversation that define who is entering the room.
                        When a new suspect enters the room, you can assume that the previous one has left. 
                        You are able to play the suspects off of each other, using a previous suspect's statements against them and the other suspects. 
                        When a user enters the room, start the interrogation by asking them about the crime, and their involvement in it. 

                        Once the conversation is over, call the function in order to 
                        `;
              session.input_audio_transcription = {
                model: "whisper-1",
              };
              session.turn_detection = null;
              session.tools = [
                {
                  "type": "function",
                  "name": "update_guilt_score",
                  "description": "Update the guilt score of the player based on the evidence and the player's responses",
                  "parameters": {
                      "type": "object",
                      "properties": {
                          "player": {
                              "type": "string",
                              "description": "The player ID to update the guilt score for"
                          },
                          "deduction": {
                              "type": "array",
                              "items": {
                                  "type": "string"
                              },
                              "description": "Reasons as to why the guilt score is being updated to the new value"
                          },
                          "guilt_score": {
                              "type": "number",
                              "description": "The new guilt score for the player"
                          }
                      },
                      "required": ["player", "deduction", "guilt_score"]
                  }
              }
              ]
              delete session["id"];
              delete session["object"];
              delete session["expires_at"];
              ws.send(JSON.stringify({ type: "session.update", session }));
              break;

            case "session.updated":
              console.log("Session updated:", event);
              break;

            case "conversation.item.input_audio_transcription.completed":
              // commit the transcript to the game thread as a user message
              console.log("Audio transcription completed", event.transcript);
              const suspectTranscript = event.transcript;

              await this.client.beta.threads.messages.create(threadId, {
                role: "user",
                content: suspectTranscript,
              });
              // sedn the transctiption back to the client
              socketServer.emitToRoom(roomId, "audio-transcript", {
                transcript: suspectTranscript,
              });
              // Once the user's audio transcription is complete, send a response.create event to the realtime API to get the assistant's response
              ws.send(JSON.stringify({ type: "response.create" }));
              break;

            // case "conversation.item.created":
            //   // add the conversation item to the game thread using the item.role to determine if it is a user or assistant message
            //   const item = event.item;
            //   const role = item.role;
            //   console.log(
            //     `Conversation item created with role: ${role} and status: ${item.status}`
            //   );
            //   let message;
            //   if (item.status === "completed") {
            //     console.log("Conversation item is completed", item);
            //     if (item.content[0].type === "input_text") {
            //       console.log(
            //         "Adding user conversation item:",
            //         item.content[0].text
            //       );
            //       message = item.content[0].text;
            //     } else {
            //       message = item.content[0].transcript;
            //     }
            //     if (message) {
            //       console.log("Adding conversation item to game thread:", item);
            //       await this.client.beta.threads.messages.create(threadId, {
            //         role,
            //         content: message,
            //       });
            //     }
            //   }
            //   break;
            case "response.audio.done":
              console.log("Audio response received from OpenAI Realtime API");
              const audioBuffer = await convertAudioMessageDeltasToAudio([
                ...this.lastAudioMessageDeltas,
              ]);
              const conversationItem = {
                audioBuffer,
                audioTranscript: this.lastAudioMessageTranscript.join(" "),
              };

              // write the audio buffer to the file system
              console.log("Writing audio buffer to file system");
              fs.writeFileSync(
                `./test_response_data/${event.response_id}_audio`,
                audioBuffer
              );
              fs.writeFileSync(
                `./test_response_data/${event.response_id}_audio_transcript.txt`,
                this.lastAudioMessageTranscript.join(" ")
              );
              const game = await GameRoomService.getGameRoom(roomId);
              const game_state = GameRoomService.decryptGameState(
                game.game_state
              );
              const activePlayer = game_state.rounds.find(
                (round) => round.status === "active"
              ).player;
              console.log("Active player:", activePlayer);
              const userSocket = socketServer.getSocketForUser(activePlayer);
              socketServer.emitToSocket(
                userSocket.id,
                "realtime-audio-message",
                conversationItem
              );
              this.lastAudioMessageDeltas = [];
              this.lastAudioMessageTranscript = [];
              break;
            case 'response.done':
              console.log("Response done", event);

              break;
            case "response.audio_transcript.done":
              const interrogatorTranscript = event.transcript;
              await this.client.beta.threads.messages.create(threadId, {
                role: "assistant",
                content: `Interrogator: ${interrogatorTranscript}`,
              });
              break;
            // case "input_audio_buffer.committed":
            //     console.log("Audio buffer committed, sending response.create");
            //     ws.send(JSON.stringify({type: 'response.create'}));
            // break;
            case "response.audio.delta":
              this.lastAudioMessageDeltas.push(event.delta);
              break;

            case "response.audio_transcript.delta":
              // TODO: emit an event to the client with the transcript delta so that the client can display the transcript in real-time
              this.lastAudioMessageTranscript.push(event.delta);
              break;
            default:
              console.warn("Unhandled event type:", event.type);
              break;
          }
        } catch (e) {
          console.error(e);
        }
      });

      ws.on("open", () => {
        console.log("Connected to OpenAI Realtime API");
        this.roomRealtimeSessions.set(roomId, ws);
        resolve(ws);
      });
    });
  }

  static sendGeneratedAudio(filename, roomId, userId) {
    const socketServer = GameRoomSocketServer.getInstance();
    const userSocket = socketServer.getSocketForUser(userId);
    const audioBuffer = fs.readFileSync(
      "./test_response_data/" + filename + "_audio"
    );
    const audioTranscript = fs
      .readFileSync(
        "./test_response_data/" + filename + "_audio_transcript.txt"
      )
      .toString();

    const conversationItem = {
      audioBuffer,
      audioTranscript,
    };

    socketServer.emitToSocket(
      userSocket.id,
      "realtime-audio-message",
      conversationItem
    );
  }

  /**
   * send a message in the realtime session that the user is entering the room and ask for a response from the realtime API
   * return a promise that resolves to the listener function that will be used to listen for the response from the realtime API
   * only resolve the promise when the response from the realtime API is received
   * @param {*} roomId
   * @param {*} userId
   * @param {*} gameState
   * @param {*} listenerFunc
   * @returns
   */
  static async startRealtimeInterregation(
    roomId,
    userId,
    gameState,
    listenerFunc
  ) {
    new Promise((resolve, reject) => {
      const ws = this.roomRealtimeSessions.get(roomId);

      const user = gameState.players.find((player) => player.id === userId);
      console.log("user and players", userId, gameState.players);
      /**
       * i need to add a param to this function of the previous listener function
       * for the message event that sends the audio to the client
       * so that i can remove that listener when the round is done ad add a new one for the next player
       */

      if (!user) {
        console.error("User not found in game state");
        return;
      }

      const event = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `${
                user.identity
              } enters the room for interrogation, with a guilt score of ${
                user.guiltScore
              }. the evidence of their involvement in the crime is ${user.evidence.join(
                ", "
              )}. Begin the interrogation. ask them about the crime, and their involvement in it.`,
            },
          ],
        },
      };

      ws.send(JSON.stringify(event));
      ws.send(JSON.stringify({ type: "response.create" }));
      console.log("Sent user conversation item to realtime API:", event);
    });
  }
}

export default OpenaiGameService;
