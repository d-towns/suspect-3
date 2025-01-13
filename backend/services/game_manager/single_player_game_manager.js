import { GameRoomService } from "../game_room/game_room.service.js";
import { LeaderboardService } from "../leaderboard/leaderboard.service.js";
import { GameManager } from "./game_manager.js";
import OpenAIGameService from "../llm/game/openai_game_service.js";
import OpenAIEloService from "../llm/elo/openai-elo.service.js";
import { StorageService, ImageBuckets } from "../image/storage.service.js";
import SinglePlayerRealtimeHandler from "../realtime_event_handler/single_player_realtime_handler.js";
import { SinglePlayerGameStateSchema } from "../../models/game-state-schema.js";
import { singlePlayerAssistantInstructions } from "../../utils/assistant_instructions.js";
import dotenv from "dotenv";
import { set, z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { validate as uuidValidate } from "uuid";
import ReplicateImageService from "../llm/image/replicate_image.service.js";
import { SocketEvents } from "../../socket/events_schema.js";

/** the game loop
 * Single Player:
 * the player will enter the game room and send a game:joined event to the server
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
    // console.log("\n\n", gameRoom, player, gameState, "\n\n");
    super();
    this.llmGameService = new OpenAIGameService();
    this.llmEloService = OpenAIEloService;
    this.llmImageService = new ReplicateImageService();
    this.currentPhase = null;
    this.loadProgress = 0;
    this.interrogationTimer = 10 * 60; // 10 minutes in seconds
    this.deductionTimer = 50 * 60; // 5 minutes in seconds
    this.roundTimer = 0;
    this.clearRoundTimer = null;
    this.realtimeHandler = null;
    // TODO: on construction, the game manager should try to pull the game state from the database
    if (typeof gameState === "string") {
      this.gameState = JSON.parse(gameState);
    } else {
      this.gameState = gameState;
    }
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
    try {
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
        // TODO: use a chat completion to check for errors in the game state upon initial creation
        // this.gameState = await this.checkGameState();
        // if the interrogation round has a conversations array that is not length = 0, then set it to be an empty array

        this.emit(SocketEvents.GAME_LOAD_UPDATED, {progress: this.loadProgress += 50})
        if (
          this.gameState.rounds.find((round) => round.type === "interrogation")
            .conversations.length !== 0
        ) {
          this.gameState.rounds.find(
            (round) => round.type === "interrogation"
          ).conversations = [];
        }

        this.gameState.status = "setup";

        // create images for the game
        await this.#createImagesForGame();

        console.log(" \n\n\n game state post image creation", this.gameState, '\n\n\n'); 

        // add the game state and thread id to the database
        await GameRoomService.updateGameRoom(this.roomId, {
          thread_id: this.threadId,
          game_state: GameRoomService.encryptGameState(this.gameState),
        });

        // tell the socket server that the game has been created
        // TODO #io.js: the socket server needs to listen for the game-created event and emit that event to the client so that it can route to the correct game screen
        this.emit("game:created", { gameState: this.gameState });
      }
    } catch (error) {
      console.error("Error creating initial game state:", error);
      this.emit("error", error.message);
    }
  }

  async checkGameState() {
    // use a chat completion to check the game state. give the ai the current game stte along with the instruction from the game master to determine if the game is in the correct state.
    // if the game is not in the correct state, the ai should return a new game state that is in the correct state
    // if the game is in the correct state, the ai should return the current game state

    const result = await this.llmGameService.createChatCompletion(
      [
        {
          role: "system",
          content:
            "You are an assistant checking the game state to ensure that the game is in the correct state. Analyze the current game state and determine if the game is in the correct state.",
        },
        {
          role: "user",
          content: `Given the current game state: ${JSON.stringify(
            this.gameState
          )}, and these instructions: ${singlePlayerAssistantInstructions} 
          determine if the game is in the correct state. If the game is not in the correct state, provide a new game state that is in the correct state.`,
        },
      ],
      zodResponseFormat(SinglePlayerGameStateSchema, "gameState"),
      1500
    );

    console.log("\n\n\n" + "Game state check result:", result + "\n\n\n");

    return result;
  }

  emitRoundTick(number) {
    this.emit("round:tick", { countdown: number });
    this.roundTimer = number;
  }

  startGame() {
    // use the llm service to create a message in the thread that says the game has started
    try {
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
    console.log("Active round:", activeRound);
    if (activeRound && activeRound.type === "interrogation") {
      this.startInterrogationPhase();
    } else {
      this.startDeductionPhase();
    }
  } catch (error) {
    console.error("Error starting game:", error);
    this.emit("error", error.message);
  }
}

  startInterrogationPhase() {
    try {
    if (this.roundTimer > 0) {
      console.log("Round timer is still running, keeping the current timer");
    } else {
      const { clear } = startInterval(
        this.interrogationTimer,
        this.emitRoundTick.bind(this),
        this.endInterrogationPhase.bind(this)
      );

      this.clearRoundTimer = clear;
    }

    console.log("Starting interrogation phase...");
    this.currentPhase = "interrogation";
    this.emit("phase:started", { phase: this.currentPhase });
    // ... set up a 10-minute timer. On expire, go to next phase ...
    // we should be caching the timer in redis so that if the server restarts, the timer will continue where it left off

    // if there is an active conversation in the interrogation phase, we should open a realtime session using startInterrogation
    // if there is no active conversation, we should just wait for the player to initiate one
    const activeConversation = this.gameState.rounds
      .find((round) => round.type === "interrogation")
      .conversations.find((conversation) => conversation.active);

    console.log("Active conversation", activeConversation);
    if (activeConversation) {
      this.startInterrogation(activeConversation.suspect);
    }
  } catch (error) {
    console.error("Error starting interrogation phase:", error);
    this.emit("error", error.message);
  }
}

  async createNewLead(sourceNode, targetNode, type) {
    try{
    const newLead = {
      source_node: sourceNode,
      target_node: targetNode,
      type: type,
    };
    this.gameState.deduction.edges.push(newLead);
    await GameRoomService.updateGameRoom(this.roomId, {
      game_state: GameRoomService.encryptGameState(this.gameState),
    });
    this.emit("game:updated", this.gameState);
    await this.#calculateWarmth();
    this.emit("deduction:completed", {});
  } catch (error) {
    console.error("Error creating new lead:", error);
    this.emit("deduction:error", error);
  }
  }

  async removeLead(edgeId) {
    console.log(" \n\n Removing edge", edgeId, '\n');
    try {
      const index = this.gameState.deduction.edges.findIndex((edge) => {
        const [sourceNodeId, targetNodeId] = edgeId.split("_");
        console.log("sourceNodeId", sourceNodeId, "targetNodeId", targetNodeId);
        return (
          edge.source_node.id === sourceNodeId &&
          edge.target_node.id === targetNodeId
        );
      });
      if (index !== -1) {
        this.gameState.deduction.edges.splice(index, 1);

        await this.#calculateWarmth();
      } else {
        throw new Error("Edge not found in deduction graph");
      }
    } catch (error) {
      console.error("Error removing edge from deduction graph:", error);
      this.emit("deduction:error", error);
    }
  }

  async #calculateWarmth() {
    // Analyze the deduction graph to determine warmth
    const messages = [
      {
        role: "system",
        content:
          "You are an expert detective analyzing a deduction graph to determine the progress of a player's investigation.",
      },
      {
        role: "assistant",
        content:
          "Analyze the current deduction graph, which consists of nodes representing suspect statements, evidence, and suspects, and edges describing the relationships between them. Each edge type indicates how the source node relates to the target node (e.g., supports, contradicts, implicates).",
      },
      {
        role: "user",
        content: `Given the real story: ${
          this.gameState.crime.realStory
        }\n\nAnd the current deduction graph: ${JSON.stringify(
          this.gameState.deduction
        )}`,
      },
      {
        role: "user",
        content:
          "Based on this information, provide a warmth score between 0 and 100 indicating how close the player is to solving the crime. with 0 being no progress and 100 being the case is solved. if the player is on the right track, provide a score closer to 100. if the player is far off, provide a score closer to 0. if the player has made no edges in the graph, provide a score of 0. Also, provide a brief explanation of your analysis. the explanation should be in the form of a first person statment from the partner of the police detective who is creating the deduction. the explanation should only be a few sentences long.",
      },
    ];

    const responseFormat = zodResponseFormat(
      z.object({
        warmth: z
          .number()
          .describe(
            "A number between 0 and 100 that represents how close the player's analysis is to the correct answer"
          ),
        explanation: z.string().describe("A brief explanation of the analysis"),
      }),
      "warmth"
    );

    try {
      const result = await this.llmGameService.createChatCompletion(
        messages,
        responseFormat
      );
      console.log("Warmth analysis result:", result);
      this.gameState.deduction.warmth = result.warmth;
      if (!this.gameState.deduction.feedback) {
        this.gameState.deduction.feedback = [];
      }
      this.gameState.deduction.feedback.push(result.explanation);
    } catch (error) {
      console.error("Error analyzing deduction graph:", error);
      this.emit("deduction:error", error);
      // this.gameState.deduction.warmth = 0;
    }

    await GameRoomService.updateGameRoom(this.roomId, {
      game_state: GameRoomService.encryptGameState(this.gameState),
    });
    this.emit("game:updated", this.gameState);
  }

  addUserAudioToInputBuffer(audioBuffer) {
    if (!this.realtimeHandler) {
      console.error("No realtime session.");
      return;
    }
    this.realtimeHandler.addAudioToInputBuffer(audioBuffer);
  }

  async createNewDeductionNode(node) {
    try{
    console.log("Creating new deduction node", this.gameState);
    this.gameState.deduction.nodes.push(node);
    await GameRoomService.updateGameRoom(this.roomId, {
      game_state: GameRoomService.encryptGameState(this.gameState),
    });
    this.emit("game:updated", this.gameState);
  } catch (error) {

    console.error("Error creating new deduction node:", error);
    this.emit("deduction:error", error);
  }
  }

  startNextPhase() {

    if (this.roundTimer == null) {
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
    try {
    console.log("Starting interrogation with suspect", suspectId + "\n\n");
    const realtimeSocket = await this.llmGameService.openRealtimeConversation();
    const activeSuspect = this.gameState.suspects.find(
      (suspect) => suspect.id === suspectId
    );

    this.realtimeHandler = new SinglePlayerRealtimeHandler(
      realtimeSocket,
      this,
      activeSuspect
    );

    this.realtimeHandler.addCustomMessageListener(async (data) => {
      const parsed = JSON.parse(data);

      const activeSuspect = this.gameState.rounds
        .find((round) => round.type === "interrogation")
        .conversations?.at(-1)?.suspect;

      const transcriptionEventTypes = [
        "response.audio_transcript.done",
        "conversation.item.input_audio_transcription.completed",
      ];

      if (transcriptionEventTypes.includes(parsed.type)) {
        // add the transcription to the game state active conversation
        this.gameState.rounds
          .find((round) => round.type === "interrogation")
          .conversations?.at(-1)
          ?.responses.push({
            speaker:
              parsed.type === "response.audio_transcript.done"
                ? activeSuspect
                : "Detective",
            message: parsed.transcript,
          });

        await GameRoomService.updateGameRoom(this.roomId, {
          game_state: GameRoomService.encryptGameState(this.gameState),
        });
      }
    });

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

    this.emit("game:updated", this.gameState);

    //   this.emit("realtime:message", {
    //     transcript: `${activeSuspect.name} enters the room for interrogation. Begin the interrogation. ask them about the crime, and their involvement in it.`,
    //     speaker: "assistant",
    //     currentRoundTime:
    //       this.roundTimer
    // })

    this.emit("realtime:started", { suspectId });
  } catch (error) {
    console.error("Error starting interrogation:", error);
    this.emit("error", error.message);
  }
  }

  async endInterrogation() {
    try{
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
          this.gameState.rounds
            .find((round) => round.type == "interrogation")
            .conversations.find(
              (conversation) => conversation.active
            ).active = false;

          await GameRoomService.updateGameRoom(this.roomId, {
            game_state: GameRoomService.encryptGameState(this.gameState),
          });

          setTimeout(() => {
            this.emit("game:updated", this.gameState);
          }, 5000);

          // this.gameState = await this.llmGameService.runGameThread(
          //   process.env.OPENAI_SINGLEPLAYER_GAMEMASTER_ASSISTANT_ID,
          //   this.threadId
          // );

          // set the most recent conversation to active false

          // setTimeout(() => {
          //   this.emit("game:updated", this.gameState);
          // }, 5000);
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
  } catch (error) {
    console.error("Error ending interrogation:", error);
    this.emit("error", error);
    }
  }

  /**
   *
   *
   */
  async endInterrogationPhase() {
    try {
    this.emit("phase:ended", { phase: this.currentPhase });

    if (this.realtimeHandler) {
      this.endInterrogation();
    }
    // run the game thread to process the conversation and generate the next game state
    // this.gameState = await this.llmGameService.runGameThread(
    //   process.env.OPENAI_SINGLEPLAYER_GAMEMASTER_ASSISTANT_ID,
    //   this.threadId
    // );

    if (
      this.gameState.rounds
        .find((round) => round.type === "interrogation")
        .conversations.some((conversation) => conversation.active)
    ) {
      this.gameState.rounds
        .find((round) => round.type === "interrogation")
        .conversations.find(
          (conversation) => conversation.active
        ).active = false;
    }
    this.gameState.rounds.find(
      (round) => round.type === "interrogation"
    ).status = "completed";
    // save the game state to the database
    await GameRoomService.updateGameRoom(this.roomId, {
      game_state: GameRoomService.encryptGameState(this.gameState),
    });
    this.emit("game:updated", this.gameState);
    // if the game is not over, start the deduction phase
    if (this.gameState.status !== "finished") {
      this.startDeductionPhase();
    } else {
      this.emit("game:finished", {});
    }
  } catch (error) {
    console.error("Error ending interrogation phase:", error);
    this.emit("error", error.message);
  }
  }

  async startDeductionPhase() {
    try{
    if (this.roundTimer > 0) {
      console.log("Round timer is still running, cannot start new phase");
      return;
    } else {

    const { clear } = startInterval(
      this.deductionTimer,
      this.emitRoundTick.bind(this),
      this.endDeductionPhase.bind(this)
    );
    this.clearRoundTimer = clear;
  }
  this.currentPhase = "deduction";
  this.emit("phase:started", { phase: this.currentPhase });
    if(!this.gameState.rounds.some((round) => round.type === 'voting')) {
      this.gameState.rounds.push({
        type: 'voting',
        status: 'active',
        conversations: [],
      });
    }
    // if the game state dosent have a voting round object, we should create one

    // ... set up deduce window ...
    // start the round timer for the deduction phase
    // this.gameState.deduction.submissions = [];
    // await GameRoomService.updateGameRoom(this.roomId, {
    //   game_state: GameRoomService.encryptGameState(this.gameState),
    // });

    // if the game state deduction object is empty, we should places nodes in the graph for each suspect and evidence
    if (this.gameState.deduction.nodes.length === 0) {
      this.gameState.deduction.nodes = [];
      this.gameState.deduction.edges = [];

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
      await GameRoomService.updateGameRoom(this.roomId, {
        game_state: GameRoomService.encryptGameState(this.gameState),
      });

      this.emit("game:updated", this.gameState);
    }
  } catch (error) {
    console.error("Error starting deduction phase:", error);
    this.emit("error", error.message);
  }

  }

  async endDeductionPhase() {
    // tell listeners that the deduction phase has ended
    try {
    this.emit("phase:ended", { phase: this.currentPhase });
    // run the thread to process the deduction and generate the finished game state
    // this.gameState = await this.llmGameService.runGameThread(
    //   process.env.OPENAI_SINGLEPLAYER_GAMEMASTER_ASSISTANT_ID,
    //   this.threadId
    // );

    this.gameState.rounds.find((round) => round.type === "voting").status =
      "completed";
    this.gameState.status = "finished";

    // save the game state to the database
    await GameRoomService.updateGameRoom(this.roomId, {
      game_state: GameRoomService.encryptGameState(this.gameState),
    });

    this.emit("game:updated", this.gameState);

    // check if the game is over ( is should be ) and then run the elo rating calculation
    await this.calculateGameResults();
  } catch (error) {
    console.error("Error ending deduction phase:", error);
    this.emit("error", error.message);
  }
  }

  async runDeductionAnalysis() {
    try {
    console.log("Running deduction analysis...");
    this.emit("deduction:started", {});

    let adj = {};
    console.log("Deduction graph", this.gameState.deduction.edges);
    for (const edge of this.gameState.deduction.edges) {
      if (!adj[edge.source_node.id]) {
        adj[edge.source_node.id] = [];
      }
      adj[edge.source_node.id].push({
        target: edge.target_node.id,
        type: edge.type,
      });
    }
    let implicatedSuspect = null;
    let maxImplications = 0;
    let suspectImplications = {};
    let visited = new Set();

    console.log("Adjacency list", JSON.stringify(adj));

    function dfs(currentNode, path, edgeTypes) {
      if (visited.has(currentNode)) return;
      visited.add(currentNode);
      path.push(currentNode);
      // when we reach a node
      console.log("Current node", currentNode);
      if (!adj[currentNode] || adj[currentNode].length === 0) {
        return;
      }
      for (const edge of adj[currentNode]) {
        if (edge.type === "implicates") {
          if (!suspectImplications[edge.target]) {
            suspectImplications[edge.target] = 0;
          }
          suspectImplications[edge.target]++;
        }
        dfs(edge.target, [...path], [...edgeTypes, edge.type]);
      }
      visited.delete(currentNode);
    }

    for (const node of Object.keys(adj)) {
      dfs(node, [], []);
    }

    for (const [suspectId, implications] of Object.entries(
      suspectImplications
    )) {
      if (implications > maxImplications) {
        maxImplications = implications;
        implicatedSuspect = suspectId;
      }
    }
    const culprit = this.gameState.suspects.find(
      (suspect) => suspect.isCulprit
    );
    console.log("Implicated suspect", implicatedSuspect, culprit.id);
    this.emit("deduction:completed", {});
    if (culprit.id === implicatedSuspect) {
      this.gameState.status = "finished";
      this.gameState.outcome = "win";
    } else {
      this.gameState.status = "finished";
      this.gameState.outcome = "lose";
    }
    this.calculateGameResults();
    await GameRoomService.updateGameRoom(this.roomId, {
      game_state: GameRoomService.encryptGameState(this.gameState),
    });
    this.emit("game:updated", this.gameState);
  } catch (error) {
    console.error("Error running deduction analysis:", error);
    this.emit("error", error);
  }
  }

  #getPreviousSuspectConversations(suspect) {
    try {
    return this.gameState.rounds
      .find((round) => round.type === "interrogation")
      .conversations.filter(
        (conversation) => conversation.suspect === suspect.id
      );
    } catch (error) {
      console.error("Error getting previous suspect conversations:", error);
      this.emit("error", error);
    }
  }

  async summarizePreviousConversations(suspect) {
    try {
    const previousConversations = this.#getPreviousSuspectConversations(suspect);
    console.log("Previous conversations:", previousConversations);
    if (previousConversations.length === 0) {
      return "This is the first conversation with the detective.";
    }

    const summarySchema = z.object({
      summary: z.string(),
    });
    const response = await this.llmGameService.createChatCompletion(
      [
        {
          role: "system",
          content: "You are an assistant summarizing previous conversations.",
        },
        {
          role: "assistant",
          content: `Summarize the previous conversations with suspect ${suspect.name}.`,
        },
        {
          role: "user",
          content: `Given the previous conversations with suspect ${suspect.name}: ${JSON.stringify(
            previousConversations
          )}`,
        },
      ],
      zodResponseFormat(summarySchema, "summary")
    );
    return response.summary;
  } catch (error) {
    console.error("Error summarizing previous conversations:", error);
    this.emit("error", error);
  }
  }


  async #createImagesForGame() {
    try {
      const basePrompt = 'a retro 16-bit style';
      const categories = [
        {
          type: 'suspects',
          items: this.gameState.suspects,
          bucket: ImageBuckets.Suspect,
          description: (item) => `headshot of ${item.name}, a ${item.identity} with a ${item.temperment} temperment.`,
          assignSrc: (i, url) => { this.gameState.suspects[i].imgSrc = url; },
        },
        {
          type: 'evidence',
          items: this.gameState.allEvidence,
          bucket: ImageBuckets.Evidence,
          description: (item) => `image of ${item.description}`,
          assignSrc: (i, url) => { this.gameState.allEvidence[i].imgSrc = url; },
        },
        {
          type: 'offenseReport',
          items: this.gameState.crime.offenseReport,
          bucket: ImageBuckets.OffenseReport,
          description: (item) => `image of ${item.description}`,
          assignSrc: (i, url) => { this.gameState.crime.offenseReport[i].imgSrc = url; },
        },
      ];

      for (const category of categories) {
        console.log(`\n creating images for ${category.type} \n`);
        for (let i = 0; i < category.items.length; i++) {
          const item = category.items[i];
          const prompt = `${basePrompt} ${category.description(item)}`;
          const image = await this.llmImageService.createImage(prompt);
          const publicUrl = await StorageService.uploadImage(image, category.bucket, `${this.roomId}_${item.id}.png`);
          category.assignSrc(i, publicUrl);
          this.emit(SocketEvents.GAME_LOAD_UPDATED, { progress: this.loadProgress += 5 });
        }
      }
    } catch (error) {
      console.log(error);
    }
    // fake loading time for testing
  //   await new Promise((resolve) => {
  //     setTimeout(() => {
  //       this.emit(SocketEvents.GAME_LOAD_UPDATED, { progress: this.loadProgress += 50 });
  //       resolve();
  //     }, 5000);
  // });
  }

  async endGame() {
    try {
    console.log("Ending game...");
    this.gameState.status = "finished";
    
    await GameRoomService.updateGameRoom(this.roomId, {
      game_state: GameRoomService.encryptGameState(this.gameState),
      status: "finished",
    });
    this.emit("game:updated", this.gameState);
    this.calculateGameResults();
  } catch (error) {
    console.error("Error ending game:", error);
    this.emit("error", error);
  }
  }



  async calculateGameResults() {
    try {
    if (this.gameState.status === "finished") {
      this.emit("game:finished", {});
      this.emit("leaderboard:started", {});
      console.log("Game finished, calculating ELO changes...");
      if (this.clearRoundTimer) this.clearRoundTimer();

      const playerStats = await LeaderboardService.getLeaderboardStatsForPlayer(
        this.playerId
      );

      console.log("Player stats:", playerStats);

      await this.llmEloService.addPlayerEloToThread(this.threadId, playerStats, this.gameState.outcome);
      const leaderboardUpdates = await this.llmEloService.processGameThread(
        this.threadId
      );

      // update the leaderboard table
      console.log("Leaderboard updates:", leaderboardUpdates);

      leaderboardUpdates.playerResults =
        leaderboardUpdates.playerResults.filter((result) => {
          // check if the result.playerId is a valid uuid
          console.log(
            "Checking player ID:",
            result.playerId,
            uuidValidate(result.playerId)
          );
          return uuidValidate(result.playerId);
        });
      console.log("Updating player stats:", leaderboardUpdates.playerResults);
      await LeaderboardService.updatePlayerStats(
        leaderboardUpdates.playerResults,
        this.roomId
      );

      const { oldRating, newRating, badges } =
        leaderboardUpdates.playerResults.find(
          (result) => result.playerId === this.playerId
        );

      console.log(oldRating, newRating, badges);

      // emit the leaderboard updates to the client
      this.emit(SocketEvents.LEADERBOARD_FINISHED, {
        oldRating,
        newRating,
        badges,
      });

      console.log("Game results and ELO changes processed successfully");
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error calculating game results:", error);
    this.emit("error", error);
  }
  }

  assignVoiceToSuspect(suspect) {
    const maleVoices = ["ash", "ballad", "echo", "verse"];
    const femaleVoices = ["coral", "alloy", "echo", "shimmer", "sage"];
    if(suspect.gender === 'male') {
      return maleVoices[Math.floor(Math.random() * maleVoices.length)];
    } else {
      return femaleVoices[Math.floor(Math.random() * femaleVoices.length)];
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
