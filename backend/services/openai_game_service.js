import OpenAI from "openai";
import dotenv from "dotenv";
import { GameRoomSocketServer } from "../socket/io.js";
import Websocket from "ws";
import fs from "fs";
import { GameRoomService } from "./game-room.service.js";
import { LeaderboardService } from "./leaderboard.service.js";
import { OpenAIEloService } from "./openai-elo.service.js";
import {
  convertAudioMessageDeltasToAudio,
  base64ToPCM,
} from "../utils/audio-helpers.js";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  MultiPlayerGameStateSchema,
  SinglePlayerGameStateSchema,
  AnalysisSchema,
} from "../models/game-state-schema.js";
import z from "zod";

dotenv.config({ path: "../.env" });

class OpenaiGameService {
  static client = new OpenAI(
    process.env.NODE_ENV === "dev"
      ? {
          organization: process.env.OPENAI_ORGANIZATION_ID,
          project: process.env.OPENAI_PROJECT_ID,
        }
      : { apiKey: process.env.OPENAI_SERVICE_API_KEY_TEST }
  );

  static lastAudioMessageDeltas = new Map();
  static lastAudioMessageTranscript = new Map();
  static roomRealtimeSessions = new Map();

  static async createMultiPlayerGameMasterAssistant() {
    console.log("Creating Game Master Assistant...");
    try {
      const assistant = await this.client.beta.assistants.create({
        name: "Game Master",
        instructions: `You are the Game Master for a game called Suspect 3. Your role is to create a crime scenario, assign identities and evidence pieces to players, and conduct interrogations. Here are your key responsibilities:

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
        response_format: zodResponseFormat(
          MultiPlayerGameStateSchema,
          "game_state"
        ),
      });
      console.log(
        "Multiplayer Game Master Assistant created successfully:",
        assistant.id
      );
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
        instructions: `You are the Game Master for a game called Suspect 3. Your role is to create a crime scenario, assign identities and evidence pieces to 4 suspects , and conduct interrogations. Here are your key responsibilities:

1. Create a crime scenario with the following details:
   - Type of crime
   - Location
   - Time of occurrence
   - Brief description of what happened
   - the crime scenario has a culprit, and the goal of the game is to determine who the culprit is

2. Create suspects:
    - Create 3 suspects for the crime scenario
    - Each suspect should have a unique identity related to the crime scenario
    - The identities should be assigned in a way that makes it difficult for the player to determine who committed the crime
    - Give the identity a real name and a brief description of their background
    - Only one suspect can be the culprit. Create evidence in a way that makes it difficult to determine who the culprit is
    - give each suspect a temperment that will affect how they react to interrogation

3. Generate evidence pieces:
   - Create 4 evidence pieces related to the crime



4. Analyze interrogations:
   - a conversation between the player acting as the detective and the suspects who are LLM's will take place each interrogation round
    - the round object should be updated with the conversation between the detective ( player ) and the suspect.
    - After the interrogation is complete, START THE NEXT VOTING ROUND OF THE GAME. IF THERE IS NO ROUND AFTER THE INTERROGATION ROUND, THE GAME IS FINISHED AND THE CULPRIT WINS.
    - DO NOT REMOVE ANY ROUNDS FROM THE PREVIOUS GAME STATE IN THE NEXT STATE UPDATE. 

5. Analyze voting rounds:
    - At the end of each interrogation round, there should be a voting rund where the player has a chance to vote on a suspect who they think is the killer
    - the players deduction, which includes 3 leads and a vote for who the culprit is, along with the analysis from their police chief, should be placed in the game thread
    - the deduction.analysis.accepted value will be either true or false, depending on whether the police chief accepts the deduction as highly plausible
    - if the active deduction is accepted, but the vote is incorrect, the player loses the game, change the game status to finished and change the outcome to the player losing
    - if the active deduction is rejected, and the player has two deductions that are rejected, the player loses the game, change the game status to finished and change the outcome to the player losing
    - the voting round is over once there is a message in the game thread that the curent voting round is over
    - if the active deduction is accepted and is correct, the player wins the game, change the game status to finished and change the outcome to the player winning
    - voting rounds may be skipped if the players hasnt gathered enough leads to make an informed decision. if a vote round is beig skipped, a message should be placed in the game thread that indicates the vote round is being skipped

6. Assign rounds:
    - Conduct a total of n*2 rounds, where n is the number of suspects. so the total number of rounds is 2 times the number of suspects. there should never be more rounds than the number of suspects multiplied by 2
    - DO NOT REMOVE ROUNDS FROM THE GAME STATE AFTER THE INITAL CREATION. IF A ROUND IS SKIPPED, A MESSAGE SHOULD BE PLACED IN THE GAME THREAD THAT INDICATES THE ROUND IS BEING SKIPPED
    - Each round is either an interrogation or a voting round
    - Interrogation Round Rules:
      - The suspect attribute for each round should be the suspect ID
      - When the game state is first created, the first round should be an interrogation round for the first suspect. the round should be active and the game_state status should be active
      - Each round has a status, it is either inactive, active, or completed
      - Interrogation rounds are for individual suspects, assign a suspect attribute for these rounds using their suspect id\
      - if both deductions have not been submitted, then at least one deduction should always be  active
    - voting round Rules:
      - voting rounds involve the player creating leads and determining a culprit vote, make the suspect attribute for these rounds be am empty string.
      - At the end of each interrogation round, there should be a voting round where the players has a chance to vote on a suspect who they think is the killer
      - the players deduction, which includes 3 leads and a vote for who the culprit is, along with the analysis from their police chief, should be placed in the game thread
      - the deduction.analysis.accepted value will be either true or false, depending on whether the police chief accepts the deduction as highly plausible
      - if the players deduction is accepted, but the vote is incorrect, the player loses the game
      - if the players had two deductions that are rejected (false), the player loses the game
      - if the players deduction is accepted and is correct, the player wins the game
      - voting rounds may be skipped if the players hasnt gathered enough leads to make an informed decision. if a vote round is beig skipped, a message should be placed in the game thread that indicates the vote round is being skipped
      - when a voting round starts, if there is a deductions that has been submitted and not accepted, that previous deduction should be set to active = false and the next deduction should be set to active = true
      - if both deductions have not been submitted, then at least one deduction should always be  active

  7. Determine if the game is finished:
    - The game is finished when either all the rounds are completed or the player (detective) correctly vote for the culprit
    - if the player hasnt made a deduction that is accepted by the police chief and is the correct culprit vote by the time all the rounds are completed, the player loses the game

  8. IMPORTANT NOTE:
    
    WHEN THE GAME STATE IS FIRST BEING CREATED, THE DEDUCTIONS ANAYLSIS SHOULD BE CREATED WITH TWO OBJECTS THAT HAVE EITHER EMPTY STRINGS OR ARRAYS FOR THEIR VALUES.
    DO NOT CHANGE ANY OF THE DEDUCTION ANALYSIS OR VOTING ROUND RULES. ONLY UPDATE THE GAMESTATE WITH THE DEDUCTION OBJECTS THAT HAVE BEEN PUT INTO THE GAME THREAD. THESE RULES ARE CRUCIAL TO THE GAMEPLAY AND SHOULD NOT BE ALTERED.
    DO NOT REMOVE ROUNDS FROM THE GAME STATE OR ADD MORE ROUNDS THAN THE NUMBER OF SUSPECTS MULTIPLIED BY 2. THIS WILL CAUSE THE GAME TO BE INCOMPLETE AND THE GAME STATE TO BE INACCURATE.
    DO NOT REMOVE ROUNDS FORM THE GAME STATE AFTER THE INITAL CREATION. IF A ROUND IS SKIPPED, A MESSAGE SHOULD BE PLACED IN THE GAME THREAD THAT INDICATES THE ROUND IS BEING SKIPPED.
    IMPORTANT NOTE:
    NEVER ADD MORE ROUNDS TO THE GAME THAN THE NUMBER OF SUSPECTS MULTIPLIED BY 2. THIS WILL CAUSE THE GAME TO BE INCOMPLETE AND THE GAME STATE TO BE INACCURATE.`,
        model: "gpt-4o-2024-08-06",
        response_format: zodResponseFormat(
          SinglePlayerGameStateSchema,
          "game_state"
        ),
      });
      console.log(
        "Single player Game Master Assistant created successfully:",
        assistant.id
      );
      return assistant;
    } catch (error) {
      console.error("Error creating Game Master Assistant:", error);
      throw error;
    }
  }

  static createMultiplayerCrime(players) {
    console.log(`Creating crime scenario for ${players.length} players`);
    const playerInfo = players
      .map(
        (player) =>
          `{id: "${player.id}", email: "${
            player.email || "guest"
          }" username: "${player.username}"}`
      )
      .join(", ");
    const crime = `Create a crime scenario for a game with the following ${players.length} players: [${playerInfo}]. Assign identities and distribute evidence to each player using their provided ids as the id field.`;
    return crime;
  }

  static createSinglePlayerCrime(player) {
    console.log(`Creating crime scenario for single players game`);
    const crime = `Create a crime scenario for a single player game. the player in this game is ${player.id}. Create identities for each suspect and evidence gathered from the scene of the crime`;
    return crime;
  }

  static async addMessageToThread(threadId, content) {
    console.log(
      `Adding message to thread: ${threadId} with role: ${content.role}`
    );
    try {
      const message = await this.client.beta.threads.messages.create(
        threadId,
        content
      );
      console.log("Message added to thread:", message);
      return message;
    } catch (error) {
      console.error("Error adding message to thread:", error);
      throw error;
    }
  }
  static async createGameThread(players, gameMode) {
    console.log(`Creating game thread for ${players.length} players...\n`);
    try {
      const thread = await this.client.beta.threads.create();
      console.log("Game thread created:", thread.id);
      let crime;
      if (gameMode === "multi") {
        crime = this.createMultiplayerCrime(players);
      } else {
        crime = this.createSinglePlayerCrime(players[0]);
      }

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

  static async endInterrogationRound(threadId, gameState, gameMode) {
    if (gameMode === "single") {
      const activeRound = gameState.rounds.find(
        (round) => round.status === "active"
      );

      const suspectInInterrogation = gameState.suspects.find(
        (suspect) => suspect.id === activeRound.suspect
      );

      console.log(activeRound, suspectInInterrogation);
      await this.addMessageToThread(threadId, {
        role: "assistant",
        content: `The interrogation of ${suspectInInterrogation.name}, ${suspectInInterrogation.identity} has concluded.`,
      });

      console.log("Interrogation round end message sent \n");
    } else {
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
  }

  static async endVotingRound(threadId, gameMode) {
    if (mode == "multi") {
      await this.addMessageToThread(threadId, {
        role: "user",
        content: `The voting round has ended. Tally the votes and determine the outcome of the game. If there is not a majority vote for the culprit, the game will continue to the next round. set this voting round to be completed and the next Interrogation round to be active`,
      });
      console.log("Interrogation round end message sent \n");
    } else {
      await this.addMessageToThread(threadId, {
        role: "assistant",
        content: `The voting round has ended. the players loses the game. The game is finished. The outcome of the game is that the player loses the game. The game is finished.`,
      });
      console.log("Interrogation round end message sent \n");
    }
  }

  static async addVotingRoundVote(roomId, vote) {
    return new Promise(async (resolve, reject) => {
      try {
        const { voterId, playerId } = vote;
        if (!roomId) {
          reject(
            new Error("Room ID is required to add a vote to the game state")
          );
          return;
        }

        const game = await GameRoomService.getGameRoom(roomId);
        const game_state = GameRoomService.decryptGameState(game.game_state);
        if (game_state.status === "finished") {
          reject(new Error("Game is already finished"));
          return;
        }

        const threadId = game.thread_id;
        await this.addMessageToThread(threadId, {
          role: "user",
          content: `Player ${voterId} voted for player ${playerId} as the culprit in round ${game_state.rounds.findIndex(
            (round) => round.status === "active"
          )}`,
        });

        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  static async runThreadAndProcess(
    threadId,
    roomId,
    gameMode,
    simulated = false,
    roundEnd = true
  ) {
    console.log(`Running thread: ${threadId}`);

    try {
      const isSinglePlayer = gameMode === "single";
      const assistantId = isSinglePlayer
        ? process.env.OPENAI_SINGLEPLAYER_GAMEMASTER_ASSISTANT_ID
        : process.env.OPENAI_MULTIPLAYER_GAMEMASTER_ASSISTANT_ID;

      console.log(
        `Using ${
          isSinglePlayer ? "single" : "multi"
        } player assistant: ${assistantId}`
      );

      const run = await this.client.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });
      console.log("Run created:", run.id);
      const socketServer = GameRoomSocketServer.getInstance();
      socketServer.emitToRoom(roomId, "game-state-updating", roundEnd);

      const gameState = await this.waitForRunCompletion(threadId, run.id);

      if (gameState) {
        console.log("Game state created:", gameState);

        // Save the encrypted game state to the database
        await GameRoomService.saveGameState(roomId, gameState);
        // TODO: this may be redundant since we can setup listeners using supabase on the game_rooms table
        if (!simulated) {
          socketServer.emitToRoom(roomId, "game-state-update", gameState);
        }
      }

      console.log("Thread run completed");
      return gameState;
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

  /**
   * single players changes to this function:
   * session.created: different instructions and voice based on the suspect name and temperment
   * conversation.item.input_audio_transcription.completed: add detective to the beginning of messages created
   * "response.audio_transcript.done": use suspect name at the front of the transcript
   * response.audio.done: look for active round suspect instead of player
   *
   */
  static async runDeductionAnalysis(roomId, threadId, gameState) {
    try {
      const { crime, evidence, suspects, deductions } = gameState;
      // delete the isCulprit property from the suspects
      suspects.forEach((suspect) => delete suspect.isCulprit);
      const currentDeduction = deductions.find(
        (deduction) => deduction.submitted === false
      );
      const { leads, culpritVote } = currentDeduction;

      const messages = [
        {
          role: "system",
          content: "You are a police chief analyzing a detective's deduction.",
        },
        {
          role: "user",
          content: `Crime Description:\n${
            crime.description
          }\n\nEvidence:\n${JSON.stringify(
            evidence
          )}\n\nSuspects:\n${JSON.stringify(
            suspects
          )}\n\nLeads:\n${JSON.stringify(
            leads
          )}\n\nCulprit Vote:\n${culpritVote}
          \n\nPlease analyze the evidence like a seasoned police chief would and decide whether to accept the deduction as highly plausible. make your anaylsis based on the evidence and the suspect's responses to the detective's questions. repsond in a speaking language, like a police cheif would in a real conversation.`,
        },
      ];

      const responseFormat = zodResponseFormat(
        AnalysisSchema,
        "analysis_result"
      );
      console.log("Running deduction analysis...");
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: messages,
        response_format: responseFormat,
      });

      const result = completion.choices[0].message.content;

      console.log("Deduction analysis completed:", result);

      const socketServer = GameRoomSocketServer.getInstance();
      socketServer.emitToRoom(roomId, "deduction-analysis-completed", {});

      currentDeduction.analysis = result;
      currentDeduction.submitted = true;

      // add the result to the game thread as an assistant message
      console.log(
        "Adding deduction analysis to game thread...",
        currentDeduction
      );
      await this.addMessageToThread(threadId, {
        role: "assistant",
        content: `Deduction: ${JSON.stringify(currentDeduction)}`,
      });

      await this.addMessageToThread(threadId, {
        role: "assistant",
        content: `DO NOT REMOVE ANY ROUNDS FROM THE GAME STATE IN THE NEXT STATE UPDATE. JUST UPDATE THE DEDUCTION OBJECTS THAT HAVE BEEN PUT INTO THE GAME THREAD AND KEEP THE CURRENT ACTIVE VOTING ROUND ACTIVE. THESE RULES ARE CRUCIAL TO THE GAMEPLAY AND SHOULD NOT BE ALTERED.`,
      });

      await OpenaiGameService.runThreadAndProcess(
        threadId,
        roomId,
        "single",
        false,
        false
      );
      if (gameState.status === "finished") {
        this.endGameAndCalculateResults(threadId, roomId);
      }

      // update the game state with the deduction analysis

      // gameState.deductionAnalysis.push(result);
      // await GameRoomService.saveGameState(roomId, gameState);
      // // emit the analysis result to the room
      // const socketServer = GameRoomSocketServer.getInstance();
      // socketServer.emitToRoom(roomId, "game-state-update", gameState);

      console.log("Analysis Result:", result);

      return result;
    } catch (error) {
      console.error("Error running deduction analysis:", error);
      throw error;
    }
  }

  static assignVoiceToSuspect(suspect) {
    if (suspect.temperment.includes("aggressive")) {
      return "verse";
    } else if (suspect.temperment.includes("calm")) {
      return "coral";
    } else {
      return "ash";
    }
  }

  static async realtimeMessageListener(
    data,
    ws,
    gameState,
    threadId,
    gameMode,
    roomId
  ) {
    const isSinglePlayer = gameMode === "single";
    const activeSuspect = gameState.suspects.find(
      (suspect) =>
        suspect.id ==
        gameState.rounds.find((round) => round.status == "active").suspect
    );
    const socketServer = GameRoomSocketServer.getInstance();

    const multiplayerSessionInstructions = `You are AI who is acting as a police detective for a co-operative criminal mystery game. Remember to always talk as quickly as you possibly can, and to be impartial but thorough in your investigation. try to trip up the players by using their own words against them.
                    You will interrogate a set of suspects for this crime:
                     
                    ${JSON.stringify(gameState.crime.description)}. 
                    Time of the crime: ${gameState.crime.time}.
                    Location of the crime: ${gameState.crime.location}.

                    The identities of the suspects are as follows:
                    ${gameState.players
                      ?.map((player) => `${player.identity}`)
                      .join("\n")}
                    
                    Conduct a thorough interrogation, but only respond as the interrogator.
                    Do not respond as the user, but as their interrogator only. 
                    Use the provided player identities when referring to the players. Only one player will be in the interrogation room at a time. 
                    You can know who is in the room by using the user messages that are in the conversation that define who is entering the room.
                    When a new suspect enters the room, you can assume that the previous one has left. 
                    You are able to play the suspects off of each other, using a previous suspect's statements against them and the other suspects. 
                    When a user enters the room, start the interrogation by asking them about the crime, and their involvement in it. 
                    `;

    const singlePlayerSessionInstructions = `You are AI who is acting as a suspect in a co-operative criminal mystery game. Remember to always talk as quickly as you possibly can.
                    Here are the details of the crime:
                     
                    ${JSON.stringify(gameState.crime.description)}. 
                    Time of the crime: ${gameState.crime.time}.
                    Location of the crime: ${gameState.crime.location}.

                    Here are the suspects of the crime:
                    ${gameState.suspects
                      .map((suspect) => `${suspect.identity}`)
                      .join("\n")}

                    YOU ARE the following identity. adpot this personality:
                    ${activeSuspect.identity}
                    Adpot this temperment in your responses:
                    ${activeSuspect.temperment}

                    
                    Create an alibi for yourself that explains your experience of the crime, and keep it consistent as you are questioned by the detective
                    Use 'detective' when referring to the player you are responsing to.  
                    when it makes sense, you should try to deflect questions to the other suspects of the crime in order to avoid suspicion
                    `;

    try {
      const event = JSON.parse(data);
      switch (event.type) {
        case "error":
          console.error("Error from OpenAI Realtime API:", event);
          break;

        case "session.created":
          // take the session object and update its instructions to respond to the user's most previous message in the conversation, and do not respond as the user, but as their interrogator only
          const session = event.session;
          session.instructions = isSinglePlayer
            ? singlePlayerSessionInstructions
            : multiplayerSessionInstructions;
          session.input_audio_transcription = {
            model: "whisper-1",
          };
          session.voice = this.assignVoiceToSuspect(activeSuspect);
          session.turn_detection = null;
          delete session["id"];
          delete session["object"];
          delete session["expires_at"];
          delete session["client_secret"];
          ws.send(JSON.stringify({ type: "session.update", session }));
          break;

        case "session.updated":
          console.log("Session updated:", event);
          break;

        case "conversation.item.input_audio_transcription.completed":
          // commit the transcript to the game thread as a user message
          console.log("Audio transcription completed", event.transcript);

          this.lastAudioMessageDeltas.set(roomId, []);

          const playerConversationItem = {
            audioTranscript: event.transcript,
            speaker: "user",
            currentRoundTime:
              socketServer.roomRoundTimers.get(roomId).currentRoundTime,
          };

          await this.client.beta.threads.messages.create(threadId, {
            role: "user",
            content: `${isSinglePlayer ? "Detective: " : ""} ${
              event.transcript
            }`,
          });
          // sedn the transctiption back to the client
          socketServer.emitToRoom(
            roomId,
            "user-audio-transcript",
            playerConversationItem
          );
          // Once the user's audio transcription is complete, send a response.create event to the realtime API to get the assistant's response
          ws.send(JSON.stringify({ type: "response.create" }));
          break;
        case "response.audio.done":
          console.log("Audio response received from OpenAI Realtime API");
          if (!this.lastAudioMessageDeltas.has(roomId)) {
            this.lastAudioMessageDeltas.set(roomId, []);
          }
          if (!this.lastAudioMessageTranscript.has(roomId)) {
            this.lastAudioMessageTranscript.set(roomId, []);
          }
          const audioBuffer = await convertAudioMessageDeltasToAudio([
            ...this.lastAudioMessageDeltas.get(roomId),
          ]);

          const conversationItem = {
            audioBuffer,
            audioTranscript: this.lastAudioMessageTranscript
              .get(roomId)
              .join(" "),
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
          const game_state = GameRoomService.decryptGameState(game.game_state);
          // const activePlayer = game_state.rounds.find(
          //   (round) => round.status === "active"
          // ).player; // suspect
          // console.log("Active player:", activePlayer);
          // const userSocket = socketServer.getSocketForUser(activePlayer); // not needed
          socketServer.emitToRoom(
            roomId,
            "realtime-audio-message",
            conversationItem
          );
          this.lastAudioMessageDeltas.set(roomId, []);
          this.lastAudioMessageTranscript.set(roomId, []);
          break;
        case "response.done":
          console.log("Response done:", event);
          if (event.response.status_details?.type == "failed") {
            console.error(
              "Response failed:",
              JSON.stringify(event.response.status_details.error)
            );
          }
          break;
        case "response.audio_transcript.done":
          const interrogatorTranscript = event.transcript;
          await this.client.beta.threads.messages.create(threadId, {
            role: "assistant",
            content: `${
              isSinglePlayer ? activeSuspect.name : "Interrogator"
            }: ${interrogatorTranscript}`,
          });
          break;
        default:
          console.warn("Unhandled event type:", event.type);
          break;
      }
    } catch (e) {
      console.error(e);
    }
  }

  static async openRealtimeSession(roomId, gameState, threadId, gameMode) {
    return new Promise((resolve, reject) => {
      const url =
        "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
      const ws = new Websocket(url, {
        headers: {
          Authorization: "Bearer " + process.env.OPENAI_API_KEY,
          "OpenAI-Beta": "realtime=v1",
        },
      });

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
        this.realtimeMessageListener(
          data,
          ws,
          gameState,
          threadId,
          gameMode,
          roomId
        );
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
        content: `${userId} has skipped their interrogation round. Update their guilt score to 1.0 to reflect their unwillingness to cooperate, mark their round as completed, and move to the next round.`,
      });

      // Run the thread to process the skip
      return await this.runThreadAndProcess(game.thread_id, roomId);
    } catch (error) {
      console.error("Error skipping interrogation round:", error);
      throw error;
    }
  }

  static async endRealtimeInterrogation(roomId, mode) {
    return new Promise((resolve, reject) => {
      const ws = this.roomRealtimeSessions.get(roomId);
      if (!ws) {
        reject(new Error("Realtime session not found for room: " + roomId));
        return;
      }

      if (mode == "multi") {
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
          if (event.type === "response.done") {
            console.log("Response done event received");
            resolve();
            ws.off("message", responseListener);
          }
        };

        ws.on("message", responseListener);

        ws.send(JSON.stringify(event));
        ws.send(JSON.stringify({ type: "response.create" }));
      } else {
        // in single rounds i want to have a user message that tells the suspect they are free to go
        // and then a response.create event to get the assistant's response

        const event = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: "You are free to go. The interrogation is over.",
              },
            ],
          },
        };

        // add a listener for the response.done event
        const responseListener = async (data) => {
          const event = JSON.parse(data);
          if (event.type === "response.done") {
            console.log("Response done event received");
            await this.addMessageToThread(threadId, {
              role: "assistant",
              content: `The interrogation of ${suspectInInterrogation.name}, ${suspectInInterrogation.identity} has concluded.`,
            });
            setTimeout(() => {
              console.log("Closing realtime session for room:", roomId);
              ws.close();
            }, 10000);
            resolve();
            ws.off("message", responseListener);
          }
        };

        ws.on("message", responseListener);

        ws.send(JSON.stringify(event));
        ws.send(JSON.stringify({ type: "response.create" }));
      }
    });
  }

  static async endGameAndCalculateResults(threadId, roomId) {
    try {
      // Get the final game state
      const game = await GameRoomService.getGameRoom(roomId);
      const gameState = GameRoomService.decryptGameState(game.game_state);
      const isSinglePlayer = game.mode === "single";

      // Create a thread for ELO calculations

      let playerStats;
      if (isSinglePlayer) {
        playerStats = LeaderboardService.getLeaderboardStatsForPlayer(
          gameState.player
        );
      } else {
        playerStats = LeaderboardService.getLeaderboardStatsForPlayers(
          gameState.players.map((player) => player.id)
        );
      }
      // Add player ELOs to thread
      await OpenAIEloService.addPlayerEloToThread(eloThread.id, playerStats);

      // Add game conversation history

      // Process ELO changes
      await OpenAIEloService.processGameThread(threadId, roomId);

      console.log("Game results and ELO changes processed successfully");
    } catch (error) {
      console.error("Error calculating game results:", error);
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
    gameMode,
    listenerFunc
  ) {
    new Promise((resolve, reject) => {
      const ws = this.roomRealtimeSessions.get(roomId);
      if (!ws) {
        console.error("Realtime session not found for room:", roomId);
        return;
      }
      const socketServer = GameRoomSocketServer.getInstance();
      const isSinglePlayer = gameMode === "single";

      /**
       * i need to add a param to this function of the previous listener function
       * for the message event that sends the audio to the client
       * so that i can remove that listener when the round is done ad add a new one for the next player
       */

      const audioDeltaListener = (data) => {
        const event = JSON.parse(data);
        if (event.type === "response.audio.delta") {
          console.log("Response audio delta received");
          const userSocket = socketServer.getSocketForUser(userId);
          socketServer.emitToSocket(userSocket.id, "realtime-audio-delta", {
            audio: base64ToPCM(event.delta),
            speaker: "assistant",
            currentRoundTime:
              socketServer.roomRoundTimers.get(roomId).currentRoundTime || 90,
          });
        }
      };

      ws.on("message", audioDeltaListener);

      const audioTranscriptListener = (data) => {
        const event = JSON.parse(data);
        if (event.type === "response.audio_transcript.delta") {
          console.log("Response audio transcript delta received");
          const userSocket = socketServer.getSocketForUser(userId);
          socketServer.emitToSocket(
            userSocket.id,
            "realtime-audio-transcript-delta",
            {
              transcript: event.delta,
              speaker: "assistant",
              currentRoundTime:
                socketServer.roomRoundTimers.get(roomId).currentRoundTime || 90,
            }
          );
        }
      };

      ws.on("message", audioTranscriptListener);
      // use a timeout to clear the listeners once the round is done
      setTimeout(() => {
        console.log(
          `removing realtime listeres for ${userId} in room ${roomId}`
        );
        ws.off("message", audioDeltaListener);
        ws.off("message", audioTranscriptListener);
        reject(new Error("Realtime interrogation timed out."));
      }, 90000);

      const responseListener = (data) => {
        const event = JSON.parse(data);
        if (event.type === "response.done") {
          if (event.response.status_details?.type == "failed") {
            console.error(
              "Response failed:",
              JSON.stringify(event.response.status_details.error)
            );
            reject(new Error("Response failed"));
          }
          console.log("Response done event received");
          resolve();
          ws.off("message", responseListener);
        }
      };

      ws.on("message", responseListener);

      if (!isSinglePlayer) {
        const user = gameState.players.find((player) => player.id === userId);
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
      } else {
        const activeSuspect = gameState.suspects.find(
          (suspect) =>
            suspect.id ==
            gameState.rounds.find((round) => round.status == "active").suspect
        );
        const userSocket = socketServer.getSocketForUser(userId);
        socketServer.emitToSocket(userSocket.id, "realtime-message", {
          transcript: `${activeSuspect.name} enters the room for interrogation. Begin the interrogation. ask them about the crime, and their involvement in it.`,
          speaker: "assistant",
          currentRoundTime:
            socketServer.roomRoundTimers.get(roomId).currentRoundTime || 90,
        });
      }
    });
  }
}

export default OpenaiGameService;
