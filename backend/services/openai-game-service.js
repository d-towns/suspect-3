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
import { LeaderboardService } from "./leaderboard.service.js";
import { OpenAIEloService } from "./openai-elo.service.js";
import {
  saveBase64PCM16ToWav,
  convertAudioMessageDeltasToAudio,
  base64ToPCM,
} from "../utils/audio-helpers.js";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

dotenv.config({ path: "../.env" });

class OpenaiGameService {
  static client = new OpenAI( process.env.NODE_ENV === 'dev' ? {
    organization: process.env.OPENAI_ORGANIZATION_ID,
    project: process.env.OPENAI_PROJECT_ID,
  } : {apiKey: process.env.OPENAI_SERVICE_API_KEY_TEST});

  static lastAudioMessageDeltas = new Map();
  static lastAudioMessageTranscript = new Map();
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
              .enum(["interrogation", "voting"])
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
                deduction: z.string(),
                votingResults: z.array(
                  z
                    .object({
                      playerId: z.string(),
                      voterId: z.string(),
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
            isCulprit: z.boolean(),
          })
          .strict()
      ),
      allEvidence: z.array(z.string()),
      interrogationProgress: z.number(),
      outcome: z
        .object({
          winner: z.enum(["innocents", "culprit", "not_yet_determined"]),
          averageGuiltScore: z.number(),
        })
        .strict(),
    })
    .strict();

  static async createMultiPlayerGameMasterAssistant() {
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
    - once the interrogation is complete, the game state should be updated with the results of the interrogation and the guilt score of the player should be updated
    - guilt score updates should be calculated based on the evidence and the player's responses to the interrogator, disregard if the player is the culprit or not. 
    - the round object should be updated with the deduction as to why the the guilt score is being updated to a certain value based on the evidence and the player's responses
    - After the interrogation is complete, the next round should be conducted. If there is no round after the interrogation round, the game is finished and the culprit wins


7. Analyze voting rounds:
    - voting rounds are where all players vote on a suspect who they think is the killer
    - the votes will be placed in the game thread
    - if there is a consensus on someone being the culprit, update the game state accordingly
    - if the vote was correct, the innocent players win the game and the game is finished
    - if the vote was incorrect, the next interrogation round should be conducted. if there is no round after the voting round, the game is finished and the culprit wins
    - voting round should have no deduction, but should have the voting results in the round object
    - After the voting round is complete, the next round should be conducted. If there is no round after the voting round, the outcome of the game should be determined accoridng to the instructions below

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
    - if the vote was correct, the innocent players win the game and the game is finished
    - if the vote was incorrect, the next interrogation round should be conducted. if there is no round after the voting round, the game is finished and the culprit wins
    - Conduct the rounds in sequence, starting with the first player and alternating between interrogation and voting rounds
    - Assign a interregation round for each player

  8. Determine if the game is finished:
    - The game is finished when either all the rounds are completed or the players correctly vote for the culprit
    - If the players correctly vote for the culprit, the innocent players win the game
    - If the players do not correctly vote for the culprit by the time all the rounds are completed, the culprit wins the game
    - Update the game state with the outcome of the game only when one of these conditions is met
    - Until a winner has been determined, the game should continue with the next round and the game_state.status should be set to active


    IMPORTANT NOTE:
    NEVER ADD MORE ROUNDS TO THE GAME THAN THE NUMBER OF PLAYERS MULTIPLIED BY 2. THIS WILL CAUSE THE GAME TO BE INCOMPLETE AND THE GAME STATE TO BE INACCURATE.

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

  static async createSinglePlayerGameMasterAssistant() {
    console.log("Creating Game Master Assistant...");
    try {
      const assistant = await this.client.beta.assistants.create({
        name: "Game Master",
        instructions: `
        You will act as the suspect who is currently in the room, and try to maintain their innocence as the player (user) asks them questions.

1. Create a crime scenario with the following details:
    Type of crime
    Location
    Time of occurrence
    Brief description of what happened

2. Generate evidence pieces:
- Create 6 evidence pieces related to the crime
3. Assign identities and evidence to suspects:
- Assign 4 unique suspect identities, each with a background that could potentially make them seem guilty or innocent
4. Participate in interrogations:
The user (player) will question you using text input
You should respond in a way that maintains your innocence and provides plausible deniability when necessary
Determine the game outcome:
After all questions have been asked, the user will make one vote for who they believe is the culprit
If the user's vote matches the true identity of the culprit, they win the game
If the user's vote does not match the true identity of the culprit, they lose the game`,
model: "gpt-4o-2024-08-06",
response_format: zodResponseFormat(this.GameStateSchema, "game_state"),
});
    } catch (error) {
      console.error("Error creating Game Master Assistant:", error);
      throw error;
    }
  }
  


  static async addMessageToThread(threadId, content) {
    console.log(`Adding message to thread: ${threadId} with role: ${content.role}`);
    try {
      const message = await this.client.beta.threads.messages.create(threadId, content);
      console.log("Message added to thread:", message);
      return message;
    } catch (error) {
      console.error("Error adding message to thread:", error);
      throw error;
    }
  }
  static async createGameThread(players) {
    console.log(`Creating game thread for ${players.length} players...\n`);
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

  static async endInterrogationRound(threadId, gameState) {
    const activeRound = gameState.rounds.find(
      (round) => round.status === "active"
    );

    const playerInInterrogation = gameState.players.find(
      (player) => player.id === activeRound.player
    );
   await this.addMessageToThread(threadId, {
      role: "user",
      content: `The interrogation of ${playerInInterrogation.identity} has concluded. The detective has left the room. Update the guilt score of ${playerInInterrogation.id} based on the interrogation. Start the next voting round of the game `,
    });
    console.log("Interrogation round end message sent \n");
  }

  static async endVotingRound(threadId) {
    await this.addMessageToThread(threadId, {
      role: "user",
      content: `The voting round has ended. Tally the votes and determine the outcome of the game. If there is not a majority vote for the culprit, the game will continue to the next round. set this voting round to be completed and the next Interrogation round to be active`,
    });
    console.log("Interrogation round end message sent \n");
}

static async addVotingRoundVote(roomId, vote) {
  return new Promise(async (resolve, reject) => {
    try {
      const {voterId, playerId} = vote;
      if(!roomId) {
        reject(new Error("Room ID is required to add a vote to the game state"));
        return;
      }
      
      const game = await GameRoomService.getGameRoom(roomId);
      const game_state = GameRoomService.decryptGameState(game.game_state);
      if (game_state.status === 'finished') {
        reject(new Error("Game is already finished"));
        return;
      }

      const threadId = game.thread_id;
      await this.addMessageToThread(threadId, {
        role: "user",
        content: `Player ${voterId} voted for player ${playerId} as the culprit in round ${game_state.rounds.findIndex(round => round.status === "active") }`,
      });
      
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}


  static createCrime(players) {
    console.log(`Creating crime scenario for ${players.length} players`);
    const playerInfo = players
      .map((player) => `{id: "${player.id}", email: "${player.email || 'guest'}" username: "${player.username}"}`)
      .join(", ");
    const crime = `Create a crime scenario for a game with the following ${players.length} players: [${playerInfo}]. Assign identities and distribute evidence to each player using their provided ids as the id field.`;
    return crime;
  }

  static async runThreadAndProcess(threadId, roomId, simulated = false) {
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
      const socketServer = GameRoomSocketServer.getInstance();
      socketServer.emitToRoom(roomId, "game-state-updating");
      

      const gameState = await this.waitForRunCompletion(threadId, run.id);

      if (gameState) {
        console.log("Game state created:", gameState);

        // Save the encrypted game state to the database
        await GameRoomService.saveGameState(roomId, gameState);
        // TODO: this may be redundant since we can setup listeners using supabase on the game_rooms table
        if(!simulated) {
          
          socketServer.emitToRoom(roomId, "game-state-update", gameState);
        }
      }

      console.log("Thread run completed");
      return gameState
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
      // console.log('key being used', process.env.NODE_ENV === 'dev' ? process.env.OPENAI_API_KEY : process.env.OPENAI_SERVICE_API_KEY_TEST);

      const socketServer = GameRoomSocketServer.getInstance();

      console.log("Connecting to OpenAI Realtime API...");

      ws.on("disconnect", () => {
        console.log("Disconnected from OpenAI Realtime API");
        this.roomRealtimeSessions.delete(roomId);
      });

      // ws.on("error", (error) => {
      //   console.error("Error with OpenAI Realtime API:", error);
      //   reject(error);
      // });

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
              session.instructions = `You are AI who is acting as a police detective for a co-operative criminal mystery game. Remember to always talk as quickly as you possibly can, and to be impartial but thorough in your investigation. try to trip up the players by using their own words against them.
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
                        `;
              session.input_audio_transcription = {
                model: "whisper-1",
              };
              session.voice = 'verse';
              session.turn_detection = null;
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

              this.lastAudioMessageDeltas.set(roomId, []);


              const playerConversationItem = {
                audioTranscript: suspectTranscript,
                speaker: "user",
                currentRoundTime : socketServer.roomRoundTimers.get(roomId).currentRoundTime
              };


              await this.client.beta.threads.messages.create(threadId, {
                role: "user",
                content: suspectTranscript,
              });
              // sedn the transctiption back to the client
              socketServer.emitToRoom(roomId, "user-audio-transcript", playerConversationItem);
              // Once the user's audio transcription is complete, send a response.create event to the realtime API to get the assistant's response
              ws.send(JSON.stringify({ type: "response.create" }));
              break;
            case "response.audio.done":
              console.log("Audio response received from OpenAI Realtime API");
              if(!this.lastAudioMessageDeltas.has(roomId)) {
                this.lastAudioMessageDeltas.set(roomId, []);
              }
              if(!this.lastAudioMessageTranscript.has(roomId)) {
                this.lastAudioMessageTranscript.set(roomId, []);
              }
              const audioBuffer = await convertAudioMessageDeltasToAudio([
                ...this.lastAudioMessageDeltas.get(roomId),
              ]);

              const conversationItem = {
                audioBuffer,
                audioTranscript: this.lastAudioMessageTranscript.get(roomId).join(" "),
              };

              // write the audio buffer to the file system
              console.log("Writing audio buffer to file system");
              fs.writeFileSync(
                `./test_response_data/${event.response_id}_audio`,
                audioBuffer
              );
              fs.writeFileSync(
                `./test_response_data/${event.response_id}_audio_transcript.txt`,
                this.lastAudioMessageTranscript.get(roomId).join(" ")
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
              socketServer.emitToRoom(
                roomId,
                "realtime-audio-message",
                conversationItem
              );
              this.lastAudioMessageDeltas.set(roomId, []);
              this.lastAudioMessageTranscript.set(roomId, []);
              break;
            case 'response.done':
              console.log("Response done:", event);
              if(event.response.status_details?.type == "failed") {
                console.error("Response failed:", JSON.stringify(event.response.status_details.error));
              }
              break;
            case "response.audio_transcript.done":
              const interrogatorTranscript = event.transcript;
              await this.client.beta.threads.messages.create(threadId, {
                role: "assistant",
                content: `Interrogator: ${interrogatorTranscript}`,
              });
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

  static async skipInterrogationRound(roomId, userId) {
    try {
      // Get the current game state
      const game = await GameRoomService.getGameRoom(roomId);
      const gameState = GameRoomService.decryptGameState(game.game_state);

      // Add a message to the thread indicating the player skipped their interrogation
      await this.addMessageToThread(game.thread_id, {
        role: "user",
        content: `${userId} has skipped their interrogation round. Update their guilt score to 1.0 to reflect their unwillingness to cooperate, mark their round as completed, and move to the next round.`
      });

      // Run the thread to process the skip
      return await this.runThreadAndProcess(game.thread_id, roomId);
    } catch (error) {
      console.error("Error skipping interrogation round:", error);
      throw error;
    }
  }

  static async endRealtimeInterrogation(roomId) {
    return new Promise((resolve, reject) => {
      const ws = this.roomRealtimeSessions.get(roomId);
      if (!ws) {
        reject(new Error("Realtime session not found for room: " + roomId));
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
              text: "End the interrogation now. Tell the suspect they are free to go and send them out of the room.",
            },
          ],
        },
      };

      const responseListener = (data) => {
        const event = JSON.parse(data);
        if(event.type === "response.done") {
          console.log("Response done event received");
          resolve();
          ws.off("message", responseListener);
        }
      }

      ws.on("message", responseListener);


      ws.send(JSON.stringify(event));
      ws.send(JSON.stringify({ type: "response.create" }));
      console.log("Sent end interrogation message to realtime API");
    });
  }


  static async endGameAndCalculateResults(threadId, roomId) {
    try {
      // Get the final game state
      const game = await GameRoomService.getGameRoom(roomId);
      const gameState = GameRoomService.decryptGameState(game.game_state);

      // Create a thread for ELO calculations

      const playerStats = LeaderboardService.getLeaderboardStatsForPlayers(gameState.players.map(player => player.id));
      // Add player ELOs to thread
      await OpenAIEloService.addPlayerEloToThread(
        eloThread.id,
        playerStats
      );

      // Add game conversation history

      // Process ELO changes
      await OpenAIEloService.processGameThread(threadId, roomId);

      console.log('Game results and ELO changes processed successfully');
    } catch (error) {
      console.error('Error calculating game results:', error);
      throw error;
    }
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
      if (!ws) {
        console.error("Realtime session not found for room:", roomId);
        return;
      }
      const socketServer = GameRoomSocketServer.getInstance();

      const user = gameState.players.find((player) => player.id === userId);
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

      const audioDeltaListener =  (data) => {

        const event = JSON.parse(data);
        if(event.type === "response.audio.delta") {
        console.log("Response audio delta received");
        const userSocket = socketServer.getSocketForUser(userId);
        socketServer.emitToSocket(userSocket.id, "realtime-audio-delta", {audio: base64ToPCM(event.delta), speaker: 'assistant', currentRoundTime: socketServer.roomRoundTimers.get(roomId).currentRoundTime || 90});
        }
      }

      ws.on('message', audioDeltaListener); 

      const audioTranscriptListener =  (data) => {

        const event = JSON.parse(data);
        if(event.type === "response.audio_transcript.delta") {
        console.log("Response audio transcript delta received");
        const userSocket = socketServer.getSocketForUser(userId);
        socketServer.emitToSocket(userSocket.id, "realtime-audio-transcript-delta", {transcript: event.delta, speaker: 'assistant', currentRoundTime: socketServer.roomRoundTimers.get(roomId).currentRoundTime || 90});
        } 
      }
      

      ws.on('message', audioTranscriptListener);
      // use a timeout to clear the listeners once the round is done
      setTimeout(() => {
        console.log(`removing realtime listeres for ${userId} in room ${roomId}`);
        ws.off("message", audioDeltaListener);
        ws.off("message", audioTranscriptListener);
        reject(new Error("Realtime interrogation timed out."));
      }, 90000); 

      const responseListener = (data) => {
        const event = JSON.parse(data);
        if(event.type === "response.done") {
          if(event.response.status_details?.type == "failed") {
            console.error("Response failed:", JSON.stringify(event.response.status_details.error));
            reject(new Error("Response failed"));
          }
          console.log("Response done event received");
          resolve();
          ws.off("message", responseListener);
        }
      }

      ws.on("message", responseListener);



      ws.send(JSON.stringify(event));
      ws.send(JSON.stringify({ type: "response.create" }));
      console.log("Sent user conversation item to realtime API:", event);
    });
  }
}

export default OpenaiGameService;
