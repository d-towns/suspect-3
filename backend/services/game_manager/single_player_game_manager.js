import { GameRoomService } from "../game_room/game_room.service.js";
import { LeaderboardService } from "../leaderboard/leaderboard.service.js";
import { GameManager } from "./game_manager.js";
import OpenAIGameService from "../llm/openai_game_service.js";
import OpenAIEloService from "../llm/elo/openai-elo.service.js";

import SinglePlayerRealtimeHandler from "../realtime_event_handler/single_player_realtime_handler.js";
import {
  SinglePlayerGameStateSchema,
  AnalysisSchema,
} from "../../models/game-state-schema.js";
import dotenv from "dotenv";
import { set } from "zod";

/** the game loop
 * Single Player:
 * the player will enter the game room and send a joined-game event to the server
 * this should be ignored until the host of the room sends a start-game event
 * the start-game event will be sent once the player has gone over the offense report and is ready to start the game
 * once the start-game event is sent, the server will start the game loop
 * the game loop consisnts of 2 phases, the interrogation phase and the deduction phase
 * the interrogation phase will last 10 minutes and allow the player to start one interrogation at a time and they have to end if before starting another
 * the deduction phase will last 5 minutes and allow the player to create a deduction graph out of the statements made by the suspects, the evidnce and the susepcts themselves
 * the deduction can be submitted at any time during the deduction phase
 * if the deduction is rejected, the player can try again
 * once the deduction is rejected twice, the palyer loses
 * if the deduction is accepted, the supect with the most implication edges linked to their node will be the culprit
 * if the player is correct, they win
 * if the player is incorrect, they lose
 *
 **/

dotenv.config({ path: "../../.env" });

export class SinglePlayerGameManager extends GameManager {
  constructor(gameRoom, player, gameState) {
    console.log("\n\n", gameRoom, player, gameState, "\n\n");
    super();
    this.llmGameService = new OpenAIGameService();
    this.llmEloService = OpenAIEloService;
    this.currentPhase = null;
    this.interrogationTimer = 10 * 60; // 10 minutes in seconds
    this.deductionTimer = 50 * 60; // 5 minutes in seconds
    this.roundTimer = 0;
    this.clearRoundTimer = null;
    this.realtimeHandler = null;
    // TODO: on construction, the game manager should try to pull the game state from the database
    this.gameState = gameState;
    this.threadId = gameRoom.thread_id;
    this.playerId = player.id;
    this.roomId = gameRoom.id;
  }

  createCrime() {
    console.log(`Creating crime scenario for single players game`);
    const crime = `Create a crime scenario for a single player game. the player in this game is ${this.playerId}. Create identities for each suspect and evidence gathered from the scene of the crime`;
    return crime;
  }

  async createInitialGameState() {
    // create a game thread
    const thread = await this.llmGameService.createGameThread();

    // add the crime message to the thread
    await this.llmGameService.addMessageToThread(thread.id, {
      role: "user",
      content: this.createCrime(),
    });

    console.log(`Thread created: ${thread.id}`);

    this.threadId = thread.id;

    // run the thread to get the initial game state
    this.gameState = await this.llmGameService.runGameThread(
      process.env.OPENAI_SINGLEPLAYER_GAMEMASTER_ASSISTANT_ID,
      thread.id
    );
    if (!this.gameState) {
      console.error("Error creating initial game state");
      return null;
    } else {
      // add the game state and thread id to the database
      await GameRoomService.updateGameRoom(this.roomId, {
        thread_id: this.threadId,
        game_state: GameRoomService.encryptGameState(this.gameState),
      });

      // tell the socket server that the game has been created
      // TODO #io.js: the socket server needs to listen for the game-created event and emit that event to the client so that it can route to the correct game screen
      this.emit("game:created", { gameState: this.gameState });
    }
  }

  emitRoundTick(number) {
    this.emit("round:tick", { countdown: number });
    this.roundTimer = number;
  }

  startGame() {
    // use the llm service to create a message in the thread that says the game has started
    console.log("Starting game...");
    if (this.gameState.status !== "active") {
      this.llmGameService.addMessageToThread(this.threadId, {
        role: "assistant",
        content: "The game has started. set the game_state status to active",
      });
    }
    // get the game room from the database and set the game state to active
    this.gameState.status = "active";
    GameRoomService.updateGameRoom(this.roomId, {
      game_state: GameRoomService.encryptGameState(this.gameState),
    });
    
    // emit the game started event
    this.emit("game:started", {});
    this.emit("game:updated", this.gameState);
    const activeRound = this.gameState.rounds.find(
      (round) => round.status === "active"
    );
    if (activeRound.type === "interrogation") {
    this.startInterrogationPhase();
    } else {
      this.startDeductionPhase();
    }
  }

  startInterrogationPhase() {
    if(this.roundTimer > 0) {
      console.log("Round timer is still running, cannot start new phase");
      return;
    }
    this.currentPhase = "interrogation";
    this.emit("phase:started", { phase: this.currentPhase });
    // ... set up a 10-minute timer. On expire, go to next phase ...
    // we should be caching the timer in redis so that if the server restarts, the timer will continue where it left off
    
    const { clear } = startInterval(
      this.interrogationTimer,
      this.emitRoundTick.bind(this),
      this.endInterrogationPhase.bind(this)
    );
    // if there is an active conversation in the interrogation phase, we should open a realtime session using startInterrogation
    // if there is no active conversation, we should just wait for the player to initiate one
    const activeConversation = this.gameState.rounds
      .find((round) => round.type === "interrogation")
      .conversations.find((conversation) => conversation.active);
    if (activeConversation) {
      this.startInterrogation(activeConversation.suspect);
    }

    this.clearRoundTimer = clear;
  }

  addUserAudioToInputBuffer(audioBuffer) {
    if (!this.realtimeHandler) {
      console.error("No realtime session.");
      return;
    }
    this.realtimeHandler.addAudioToInputBuffer(audioBuffer);
  }

  startNextPhase() {
    if(this.roundTimer == null) {
      console.log("game hasnt started, cannot start new phase");
      return;
    }
    if (this.currentPhase === "interrogation") {
      this.endInterrogationPhase();
    } else if (this.currentPhase === "deduction") {
      this.endDeductionPhase();
    } else {
      console.error(
        "Game is not started, cannot move phases",
        this.currentPhase
      );
    }
  }

  /**
   * Open a realtime session using the llmService to start an interrogation with a suspect
   */
  async startInterrogation(suspectId) {
    console.log("Starting interrogation with suspect", suspectId + '\n\n');
    const realtimeSocket = await this.llmGameService.openRealtimeConversation();
    const activeSuspect = this.gameState.suspects.find(
      (suspect) => suspect.id === suspectId
    );

    this.realtimeHandler = new SinglePlayerRealtimeHandler(
      realtimeSocket,
      this,
      activeSuspect
    );
    const activeConversation = this.gameState.rounds
      .find((round) => round.type === "interrogation")
      .conversations.find((conversation) => conversation.active);


    if (!activeConversation) {

      this.llmGameService.addMessageToThread(this.threadId, {
        role: "assistant",
        content: `The interrogation of ${activeSuspect.name}, ${activeSuspect.identity} has begun.`,
      });
      this.gameState.rounds
        .find((round) => round.type === "interrogation")
        .conversations.push({
          suspect: suspectId,
          active: true,
          responses: [],
        });
      await GameRoomService.updateGameRoom(this.roomId, {
        game_state: GameRoomService.encryptGameState(this.gameState),
      });

    }
    // update the game state and set the conversation status to active

    this.emit("game:updated", this.gameState );

  //   this.emit("realtime:message", {
  //     transcript: `${activeSuspect.name} enters the room for interrogation. Begin the interrogation. ask them about the crime, and their involvement in it.`,
  //     speaker: "assistant",
  //     currentRoundTime:
  //       this.roundTimer
  // })

    this.emit("realtime:started", { suspectId });
  }

  async endInterrogation() {
    if (!this.realtimeHandler) {
      console.log("No realtime session.");
      return;
    }

    await new Promise((resolve) => {
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

      const responseListener = async (data) => {
        const parsed = JSON.parse(data);
        if (parsed.type === "response.audio.done") {
          console.log("Response done event received");
          setTimeout(() => {
            this.realtimeHandler.closeRealtimeConversation();
            this.realtimeHandler = null;
          }, 10000);

          // Remove this listener so we only handle one final response
          
          this.gameState = await this.llmGameService.runGameThread(
            process.env.OPENAI_SINGLEPLAYER_GAMEMASTER_ASSISTANT_ID,
            this.threadId);

          await GameRoomService.updateGameRoom(this.roomId, {
            game_state: GameRoomService.encryptGameState(this.gameState),
          });

          setTimeout(() => {
            this.emit("game:updated", this.gameState );
          }, 5000);
          // Emit that the realtime session ended
          

          
        }
        if (parsed.type === "response.audio_transcript.done") {
          await this.llmGameService.addMessageToThread(this.threadId, {
            role: "assistant",
            content: `The interrogation of ${this.realtimeHandler.responder.name}, ID:${this.realtimeHandler.responder.id} has concluded.`,
          });
          this.emit("realtime:ended", {});
          this.realtimeHandler.removeCustomMessageListener(responseListener);
          resolve();
        }

      };

      // Attach the custom listener
      this.realtimeHandler.addCustomMessageListener(responseListener);



      // Send the "end interrogation" message
      this.realtimeHandler.sendMessage(event);
      // Then send a response.create event
      this.realtimeHandler.sendMessage({ type: "response.create" });
    });


  }

  /**
   *
   *
   */
  async endInterrogationPhase() {
    this.emit("phase:ended", { phase: this.currentPhase });

    if (this.realtimeHandler) {
      this.endInterrogation();
    }
    // run the game thread to process the conversation and generate the next game state
    this.gameState = await this.llmGameService.runGameThread(
      process.env.OPENAI_SINGLEPLAYER_GAMEMASTER_ASSISTANT_ID,
      this.threadId
    );
    // save the game state to the database
    await GameRoomService.updateGameRoom(this.roomId, {
      game_state: GameRoomService.encryptGameState(this.gameState),
    });
    this.emit("game:updated", this.gameState );
    // if the game is not over, start the deduction phase
    if (this.gameState.status !== "finished") {
      this.startDeductionPhase();
    } else {
      this.emit("game:finished", {});
    }
  }

  startDeductionPhase() {
    if(this.roundTimer > 0) {
      console.log("Round timer is still running, cannot start new phase");
      return;
    }
    this.currentPhase = "deduction";
    this.emit("phase:started", { phase: this.currentPhase });
    // ... set up deduce window ...
    // start the round timer for the deduction phase

    // if the game state deduction object is empty, we should places nodes in the graph for each suspect and evidence
    if (this.gameState.deduction.nodes.length === 0) {
      this.gameState.suspects.forEach((suspect) => {
        this.gameState.deduction.nodes.push({
          id: suspect.id,
          type: "suspect",
          data: {
            identity: suspect.identity,
            name: suspect.name,
            temperment: suspect.temperment,
          },
        });
      });

      this.gameState.allEvidence.forEach((evidence) => {
        this.gameState.deduction.nodes.push({
          id: evidence.id,
          type: "evidence",
          data: {
            id: evidence.id,
            description: evidence.description,
          },
        });
      });

      // update the game state with the new nodes
      GameRoomService.updateGameRoom(this.roomId, {
        game_state: GameRoomService.encryptGameState(this.gameState),
      });

      this.emit("game:updated", this.gameState );

    }
    const { clear } = startInterval(
      this.deductionTimer,
      this.emitRoundTick.bind(this),
      this.endDeductionPhase.bind(this)
    );
    this.clearRoundTimer = clear;
  }

  async endDeductionPhase() {
    // tell listeners that the deduction phase has ended
    this.emit("phase:ended", { phase: this.currentPhase });
    // run the thread to process the deduction and generate the finished game state
    this.gameState = await this.llmGameService.runGameThread(
      process.env.OPENAI_SINGLEPLAYER_GAMEMASTER_ASSISTANT_ID,
      this.threadId
    );

    // save the game state to the database
    await GameRoomService.updateGameRoom(this.roomId, {
      game_state: GameRoomService.encryptGameState(this.gameState),
    });

    this.emit("game:updated", this.gameState );

    // check if the game is over ( is should be ) and then run the elo rating calculation
    this.checkWinCondition();
  }

  async runDeductionAnalysis() {
    try {
      this.emit("deduction:started", result);
      const { crime, evidence, suspects, deduction } = this.gameState;
      // delete the isCulprit property from the suspects
      suspects.forEach((suspect) => delete suspect.isCulprit);

      const deductionMessage = {
        role: "user",
        content: `Crime Offense Report:\n${JSON.stringify(
          crime.offenseReport.map((report) => JSON.stringify(report))
        )}\n\nEvidence:\n${JSON.stringify(
          evidence
        )}\n\nSuspects:\n${JSON.stringify(
          suspects
        )}\n\nDetective's deduction${this.analyzeDeductionGraph(deduction)}
          \n\nPlease analyze the evidence like a seasoned police chief would and decide whether to accept the deduction as highly plausible. make your anaylsis based on the evidence and the suspect's responses to the detective's questions. repsond in a speaking language, like a police cheif would in a real conversation.`,
      };

      const messages = [
        {
          role: "system",
          content: "You are a police chief analyzing a detective's deduction.",
        },
        deductionMessage,
      ];

      const responseFormat = zodResponseFormat(
        AnalysisSchema,
        "analysis_result"
      );
      console.log("Running deduction analysis...");
      const completion = this.llmGameService.createChatCompletion(
        messages,
        responseFormat
      );

      const result = completion.choices[0].message.content;

      console.log("Deduction analysis completed:", result);

      this.emit("deduction:completed", result);

      // add the result to the game thread as an assistant message
      console.log(
        "Adding deduction analysis to game thread...",
        JSON.stringify(result)
      );
      await this.llmGameService.addMessageToThread(this.threadId, {
        role: "assistant",
        content: `Here is the police chief analysis of the current deduction: ${JSON.stringify(
          result
        )}`,
      });

      this.gameState = await this.llmGameService.runGameThread(
        process.env.OPENAI_SINGLEPLAYER_GAMEMASTER_ASSISTANT_ID,
        this.threadId
      );
      this.emit("game:updated",  this.gameState );
      await GameRoomService.updateGameRoom(this.roomId, {
        game_state: GameRoomService.encryptGameState(this.gameState),
      });
      // check the win condition
      this.checkWinCondition();
    } catch (error) {
      this.emit("deduction:error", error);
      console.error("Error running deduction analysis:", error);
      throw error;
    }
  }

  /**
   * Take the deduction graph and traverse in a depth-first search from each statement node in order to build the dedudction analysis that will be sent to the chat completion.
   * Each complete path create a string, incomplete paths will not be included in the analysis. the edge types will be used to connect the nodes in their logical order.
   *
   * @param {SinglePlayerGameStateSchema.deduction} deduction
   */

  analyzeDeductionGraph(deduction) {
    const { nodes, edges } = deduction;
    const adjacencyList = {};

    // Build adjacency list
    edges.forEach((edge) => {
      if (!adjacencyList[edge.source_node]) {
        adjacencyList[edge.source_node] = [];
      }
      adjacencyList[edge.source_node].push({
        target: edge.target_node,
        type: edge.type,
      });
    });

    const analysisResults = [];
    const visited = new Set();

    const dfs = (currentNode, path, edgeTypes) => {
      if (visited.has(currentNode)) return;
      visited.add(currentNode);
      path.push(currentNode);

      if (
        !adjacencyList[currentNode] ||
        adjacencyList[currentNode].length === 0
      ) {
        // Complete path
        const pathStrings = path.map((nodeId) => {
          const node = nodes.find((n) => n.id === nodeId);
          if (node.type === "statement" || node.type === "suspect") {
            return node.data.message || node.data.identity;
          }
          return node.data;
        });
        const edgeDescriptions = edgeTypes.map((type) => {
          switch (type) {
            case "supports":
              return "supports";
            case "contradicts":
              return "contradicts";
            case "implicates":
              return "implicates";
            default:
              return "";
          }
        });
        let analysisString = "";
        for (let i = 0; i < edgeDescriptions.length; i++) {
          analysisString += `${pathStrings[i]} ${edgeDescriptions[i]} ${
            pathStrings[i + 1]
          }. `;
        }
        analysisResults.push(analysisString.trim());
      } else {
        adjacencyList[currentNode].forEach((edge) => {
          dfs(edge.target, [...path], [...edgeTypes, edge.type]);
        });
      }

      visited.delete(currentNode);
    };

    // Start DFS from each statement node
    nodes.forEach((node) => {
      if (node.type === "statement") {
        dfs(node.id, [], []);
      }
    });

    return analysisResults;
  }

  async checkWinCondition() {
    // ... if deduction accepted -> check culprit
    // if correct -> emit('game-won'), else -> emit('game-lost')
    if (this.gameState.status === "finished") {
      this.emit("game:finished", {});
      this.emit("leaderboard:started", {});
      console.log("Game finished, calculating ELO changes...");
      const playerStats = await LeaderboardService.getLeaderboardStatsForPlayer(
        this.playerId
      );

      await this.llmEloService.addPlayerEloToThread(this.threadId, playerStats);
      const leaderboardUpdates = await this.llmEloService.processGameThread(
        threadId
      );

      // update the leaderboard table
      await LeaderboardService.updatePlayerStats(
        leaderboardUpdates.playerResults
      );

      //emit the leaderboard updates to the client
      this.emit("leaderboard:finished", {
        oldRating,
        newRating,
        badges,
      });

      console.log("Game results and ELO changes processed successfully");
    } else {
      return false;
    }
  }

  assignVoiceToSuspect(suspect) {
    if (suspect.temperment.includes("aggressive")) {
      return "verse";
    } else if (suspect.temperment.includes("calm")) {
      return "coral";
    } else {
      return "ash";
    }
  }
}

function startInterval(initialNumber, tickCallback, doneCallback) {
  let intervalId;

  const start = () => {
    console.log("Starting interval...");
    let number = initialNumber;

    intervalId = setInterval(() => {
      number--;
      if (tickCallback) {
        tickCallback(number);
      }
      if (number <= 0) {
        clearInterval(intervalId);
        if (doneCallback) {
          doneCallback();
        }
        console.log("Interval cleared automatically.");
      }
    }, 1000);
  };

  // Immediately start the interval
  start();

  // Return an object with a clear method
  return {
    // give the ability to clear the interval on demand and call the doneCallback
    // ex. All voting round votes are in so we can clear the interval and move on to the next round

    clear: () => {
      clearInterval(intervalId);
      if (doneCallback) {
        doneCallback();
      }
      console.log("Interval cleared on demand.");
    },
  };
}
