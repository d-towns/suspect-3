import { GameRoomService } from "../game-room.service.js";
import { GameManager } from "./game_manager.js";
import OpenAIGameService from "../llm/openai_game_service.js";
import RealtimeEventHandler from "../realtime_event_handler/realtime_event_handler.js";
import {SinglePlayerGameStateSchema, AnalysisSchema} from "../../models/game-state-schema.js";
import dotenv from 'dotenv'

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

  dotenv.config({path: '../../.env'});
  

export class SinglePlayerGameManager extends GameManager {
  constructor(socketServer, playerId) {
    super();
    this.socketServer = socketServer;
    this.llmGameService = new OpenAIGameService();
    this.currentPhase = null;
    this.interrogationTimer = 10 * 60; // 10 minutes in seconds
    this.deductionTimer = 5 * 60; // 5 minutes in seconds
    this.roundTimer = 0
    this.clearRoundTimer = null;
    this.realtimeInstructions = singlePlayerSessionInstructions;
    this.realtimeHandler = null
    // TODO: on construction, the game manager should try to pull the game state from the database
    this.gameState = null;
    this.threadId = null;
    this.playerId = playerId;
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

    // save the thread id to the game room
    await GameRoomService.updateGameRoom(roomId, { thread_id: thread.id });

    // run the thread to get the initial game state
    this.gameState = await this.llmGameService.runGameThread(process.env.OPENAI_SINGLEPLAYER_GAMEMASTER_ASSISTANT_ID, thread.id);
    if (!this.gameState) {
      console.error("Error creating initial game state");
      return null;
    } else {
      await GameRoomService.updateGameRoom(roomId, {
        game_state: GameRoomService.encryptGameState(this.gameState),
      });
      
      // tell the socket server that the game has been created
      // TODO #io.js: the socket server needs to listen for the game-created event and emit that event to the client so that it can route to the correct game screen
      this.emit('game-created', { gameState });
    }

  }

  emitRoundTick(number) {
    this.emit('round-tick', { countdown: number });
    this.roundTimer = number;
  }


  startGame(roomId) {
    this.emit('game-started', { roomId });
    this.startInterrogationPhase(roomId);
  }

  startInterrogationPhase(roomId) {
    this.currentPhase = 'interrogation';
    this.emit('phase-started', { phase: this.currentPhase, roomId });
    // ... set up a 10-minute timer. On expire, go to next phase ...
    const {clear} = startInterval(this.interrogationTimer, this.emitRoundTick, this.endInterrogationPhase);
    this.clearRoundTimer = clear;
  }

  addUserAudioToInputBuffer(audioBuffer) {
    this.llmGameService.addAudioToInputBuffer(this.threadId, audioBuffer);
  }




  /**
   * Open a realtime session using the llmService to start an interrogation with a suspect
   */
  startInterrogation(suspectId) {
    const realtimeSocket = this.llmGameService.openRealtimeConversation()
    const activeSuspect = this.gameState.suspects.find(suspect => suspect.id === suspectId);

    this.realtimeHandler = new RealtimeEventHandler(realtimeSocket, this, activeSuspect)
  }

  async endInterrogation() {
    if (!this.realtimeHandler) {
      console.log("No realtime session.");
      return;
    }

    return new Promise((resolve) => {
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
        if (parsed.type === "response.done") {
          console.log("Response done event received");
          await this.llmGameService.addMessageToThread(this.threadId, {
            role: "assistant",
            content: `The interrogation of ${this.realtimeHandler.responder.name}, ${this.realtimeHandler.responder.identity} has concluded.`,
          });
          setTimeout(() => {
            this.realtimeHandler.closeRealtimeSession();
            this.realtimeHandler = null;
          }, 10000);
    
          // Remove this listener so we only handle one final response
          this.realtimeHandler.removeCustomMessageListener(responseListener);
    
          // Emit that the realtime session ended
          this.emit("realtime-session-ended", { roomId, suspectId });
          
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

  async endInterrogationPhase(roomId) {
    this.emit('phase-ended', { phase: this.currentPhase, roomId });

    if(this.realtimeHandler) {
      this.endInterrogation();
    }
    // run the game thread to process the conversation and generate the next game state
    this.gameState = await this.llmGameService.runGameThread(process.env.OPENAI_SINGLEPLAYER_GAMEMASTER_ASSISTANT_ID, this.threadId);
    // save the game state to the database
    await GameRoomService.updateGameRoom(roomId, {
      game_state: GameRoomService.encryptGameState(this.gameState),
    });
    // if the game is not over, start the deduction phase
    if (this.gameState.status !== 'finished') {

    this.startDeductionPhase(roomId);
    } else {
      this.emit('game-finished', { roomId, result: 'win-or-lose' });
    }
  }

  startDeductionPhase(roomId) {
    this.currentPhase = 'deduction';
    this.emit('phase-started', { phase: this.currentPhase, roomId });
    // ... set up deduce window ...
    // start the round timer for the deduction phase

    const {clear} = startInterval(this.deductionTimer, this.emitRoundTick, this.endDeductionPhase);
    this.clearRoundTimer = clear;
  }

  endDeductionPhase(roomId) {
    this.emit('phase-ended', { phase: this.currentPhase, roomId });
    // run the thread to process the deduction and generate the next game state
    // save the game state to the database
    // check if the game is over
    this.checkWinCondition(roomId);
  }

  async runDeductionAnalysis( gameState) {
      try {
        const { crime, evidence, suspects, deduction } = gameState;
        // delete the isCulprit property from the suspects
        suspects.forEach((suspect) => delete suspect.isCulprit);

        const deductionMessage = {
          role: "user",
          content: `Crime Offense Report:\n${
            JSON.stringify(crime.offenseReport.map((report) => JSON.stringify(report)))
          }\n\nEvidence:\n${JSON.stringify(
            evidence
          )}\n\nSuspects:\n${JSON.stringify(
            suspects
          )}\n\nDetective's deduction${this.analyzeDeductionGraph(deduction)}
          \n\nPlease analyze the evidence like a seasoned police chief would and decide whether to accept the deduction as highly plausible. make your anaylsis based on the evidence and the suspect's responses to the detective's questions. repsond in a speaking language, like a police cheif would in a real conversation.`,
        }

  
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
        )
  
        const result = completion.choices[0].message.content;
  
        console.log("Deduction analysis completed:", result);
  
        this.emit("deduction-analysis-completed", result);
  
        // add the result to the game thread as an assistant message
        console.log(
          "Adding deduction analysis to game thread...",
          JSON.stringify(result)
        );
        await this.llmGameService.addMessageToThread(threadId, {
          role: "assistant",
          content: `Here is the police chief analysis of the current deduction: ${JSON.stringify(result)}`,
        });
  
        this.gameState = await this.llmGameService.runGameThread(process.env.OPENAI_SINGLEPLAYER_GAMEMASTER_ASSISTANT_ID, this.threadId)

        await GameRoomService.updateGameRoom(roomId, {
          game_state: GameRoomService.encryptGameState(this.gameState),
        });
        // check the win condition
        this.checkWinCondition();
  
      } catch (error) {
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
      edges.forEach(edge => {
        if (!adjacencyList[edge.source_node]) {
          adjacencyList[edge.source_node] = [];
        }
        adjacencyList[edge.source_node].push({ target: edge.target_node, type: edge.type });
      });

      const analysisResults = [];
      const visited = new Set();

      const dfs = (currentNode, path, edgeTypes) => {
        if (visited.has(currentNode)) return;
        visited.add(currentNode);
        path.push(currentNode);

        if (!adjacencyList[currentNode] || adjacencyList[currentNode].length === 0) {
          // Complete path
          const pathStrings = path.map(nodeId => {
            const node = nodes.find(n => n.id === nodeId);
            if (node.type === "statement" || node.type === "suspect") {
              return node.data.message || node.data.identity;
            }
            return node.data;
          });
          const edgeDescriptions = edgeTypes.map(type => {
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
            analysisString += `${pathStrings[i]} ${edgeDescriptions[i]} ${pathStrings[i + 1]}. `;
          }
          analysisResults.push(analysisString.trim());
        } else {
          adjacencyList[currentNode].forEach(edge => {
            dfs(edge.target, [...path], [...edgeTypes, edge.type]);
          });
        }

        visited.delete(currentNode);
      };

      // Start DFS from each statement node
      nodes.forEach(node => {
        if (node.type === "statement") {
          dfs(node.id, [], []);
        }
      });

      return analysisResults;
    }

  checkWinCondition() {
    // ... if deduction accepted -> check culprit 
    // if correct -> emit('game-won'), else -> emit('game-lost')
    if(this.gameState.status === 'finished') {
    this.emit('game-finished', { roomId, result: 'win-or-lose' });
    } else {
      return false
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
