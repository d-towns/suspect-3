import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import { GameRoomService } from "../services/game-room.service.js";

const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const HEARTBEAT_TIMEOUT = 10000; // 10 seconds
import OpenaiGameService from "../services/openai-game-service.js";

function startInterval(initialNumber, tickCallback, doneCallback) {
  (function () {
    let number = initialNumber;

    const intervalId = setInterval(() => {
      number--;
      if (tickCallback) {
        tickCallback(number);
      }
      if (number <= 0) {
        clearInterval(intervalId);
        if (doneCallback) {
          doneCallback();
        }
        console.log("Interval IIFE cleared.");
      }
    }, 1000);
  })();
}

class Countdown {
  constructor(initialNumber, tickCallback, doneCallback) {
    this.number = initialNumber;
    this.tickCallback = tickCallback;
    this.doneCallback = doneCallback;
    this.intervalId = setInterval(() => this.decrement(), 1000);
  }

  decrement() {
    this.number--;
    if (this.tickCallback) {
      this.tickCallback(this.number);
    }

    if (this.number <= 0) {
      this.stop();
      if (this.doneCallback) {
        this.doneCallback();
      }
    }
  }

  stop() {
    clearInterval(this.intervalId);
    console.log("Countdown stopped.");
  }
}

export class GameRoomSocketServer {
  static instance = null;

  constructor(httpServer) {
    if (GameRoomSocketServer.instance) {
      return GameRoomSocketServer.instance;
    }
    this.openaiGameService = new OpenaiGameService();
    this.io = new Server(httpServer, {
      cors: {
        origin: "*", // Allow all origins
        methods: ["GET", "POST"],
      },
    });

    this.rommRoundTimers = new Map();

    this.io.on("connection", (socket) => {
      console.log("A user connected");

      socket.on("set-user-email", this.handleSetUserEmail.bind(this, socket));
      socket.on("disconnect", this.handleDisconnect.bind(this, socket));
      socket.on("join-room", this.handleJoinRoom.bind(this, socket));
      socket.on("leave-room", this.handleLeaveRoom.bind(this, socket));
      socket.on(
        "start-next-round",
        this.handleStartNextRound.bind(this, socket)
      );
      socket.on("chat-message", this.handleChatMessage.bind(this, socket));
      socket.on(
        "online-players-list",
        this.handleOnlinePlayersList.bind(this, socket)
      );
      socket.on('realtime-audio-response', this.handleRealtimeAudioResponse.bind(this, socket));
      socket.on("heartbeat", this.handleHeartbeat.bind(this, socket));
      socket.on("start-game", this.handleStartGame.bind(this, socket));
      socket.on("joined-game", this.handleJoinedGame.bind(this, socket));
      socket.on("player-ready", this.handlePlayerReady.bind(this, socket));

      // Initialize lastHeartbeat
      socket.lastHeartbeat = Date.now();

      // Start the heartbeat check interval
      setInterval(() => this.checkHeartbeats(), HEARTBEAT_INTERVAL);
    });

    GameRoomSocketServer.instance = this;
  }

  handleSetUserEmail(socket, userEmail) {
    socket.userEmail = userEmail;
  }

  handleDisconnect(socket) {
    console.log(`User ${socket.userEmail} disconnected`);
    const room = this.io.sockets.adapter.rooms.get(socket.roomId);
    console.log(
      `User ${socket.userEmail} disconnected from room ${socket.roomId} : ${room}`
    );
    if (room) {
      const playerLeftData = {
        email: socket.userEmail,
        id: socket.userId,
      };
      socket.to(room).emit("player-left", playerLeftData);
      console.log(`Player left event sent to room ${JSON.stringify(room)}`);
    }
  }

  handleJoinRoom(socket, params, callback) {
    console.log("join-room called with params:", params);
    const { roomId, userId, userEmail } = params;
    if (!socket.rooms.has(roomId)) {
      socket.join(roomId);
    }
    socket.userEmail = userEmail;
    socket.userId = userId;
    socket.roomId = roomId;
    console.log(`User ${userEmail} joined room ${roomId}`);
    socket.to(roomId).emit("player-joined", { email: userEmail, id: userId });
    if (callback) callback({ success: true });
  }

  handleLeaveRoom(socket, roomId, userEmail) {
    socket.leave(roomId);
    console.log(`User ${userEmail} left room ${roomId}`);
    socket.to(roomId).emit("user-left", { userEmail });
  }

  async handleStartNextRound(socket, roomId) {
    const userId = socket.userId;
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    const { data, error } = await supabase
      .from("game_rooms")
      .select()
      .eq("id", roomId);
    if (error) {
      console.error("Error fetching game room:", error);
      return;
    }
    const room = data[0];
    const game_state = OpenaiGameService.decryptGameState(room.game_state);
    await OpenaiGameService.startRealtimeInterregation(
      roomId,
      userId,
      game_state
    );
  }

  async handleRealtimeAudioResponse(socket, audioData) {
    await OpenaiGameService.addUserResponseToInputAudioBuffer(socket.roomId, socket.userId, audioData);
  }

  async handleRealtimeAudioResponseEnd(socket) {
    await OpenaiGameService.createInterrogationResponse(socket.roomId);
  }

  handleChatMessage(socket, roomId, userEmail, message) {
    console.log(`New message in room ${roomId}: ${message}`);
    const room = this.io.sockets.adapter.rooms.get(roomId);
    const numReceivers = room ? room.size : 0;
    console.log(`${numReceivers} sockets are going to receive this message`);
    socket.to(roomId).emit("chat-message", { userEmail, message });
  }

  handleOnlinePlayersList(socket, roomId, callback) {
    console.log("online-players-list called with roomId:", roomId);
    const room = this.io.sockets.adapter.rooms.get(roomId);
    if (room) {
      const connectedSockets = Array.from(room);
      const playerData = connectedSockets
        .map((socketId) => {
          const playerSocket = this.io.sockets.sockets.get(socketId);
          return {
            email: playerSocket.userEmail,
            id: playerSocket.userId,
            isReady: playerSocket.isReady,
          };
        })
        .filter(Boolean);

      console.log(`Room ${roomId} has ${playerData.length} players online`);
      if (callback) callback({ success: true, players: playerData });
    } else {
      console.log(`Room ${roomId} not found`);
      if (callback) callback({ success: false, message: "Room not found" });
    }
  }

  handleHeartbeat(socket, roomId) {
    console.log(`Heartbeat from user ${socket.userEmail} in room ${roomId}`);
    socket.lastHeartbeat = Date.now();
  }

  async handleStartGame(socket, roomId) {
    console.log(`Starting game in room ${roomId}`);
    this.emitToRoom(roomId, "game-creating");
    try {
      const room = this.io.sockets.adapter.rooms.get(roomId);
      const playerIds = Array.from(room).map((socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        return {
          id: socket.userId,
          email: socket.userEmail,
        };
      });

      const thread = await OpenaiGameService.createGameThread(playerIds);
      console.log(`Thread created: ${thread.id}`);

      const run = await OpenaiGameService.runThreadAndProcess(
        thread.id,
        roomId
      );

      this.emitToRoom(roomId, "game-created");
      console.log(`Game started in room ${roomId}`);
    } catch (error) {
      console.error(`Error starting game in room ${roomId}:`, error);
      this.emitToRoom(roomId, "game-start-error", {
        message: "Failed to start the game. Please try again.",
      });
    }
  }
  /** the game loop  
   * the first round will have different time than the rest of the roudns
   * it will last 30 secodns and give the players time to read there cards
   * once that timer ends, we should call the startrealtimeinterrogation function in the openaigame service
   * with the user who is the host of the room
   * all rounds after the first should have a 2 minute timer
   * Client Side:
   * - the client will send the audio data in chunks that will appaned to the input audio buffer
   * - once the response timer ends client side the createInterrogationResponse function in the openaigame service will be called
   * Server Side: ( this is what we need to implement)
   * once the two minute timer ends for the round, we need to take the conversation and add it to the game thread so that it can be run and then a function call can be made to generate the new game state
   * that state will be encrypted and stored in the database via supabase
   * once that is done, we can emit the new state to the clients
   * then we start the next round 
   * 
   * 
   * it should start the first roundtimer,
  * once that time ends,
  * 
  * 
  * and start the next roundtimer
  */
  async startGameLoop(socket, roomId) { }


  async handleJoinedGame(socket, roomId, userId) {
    socket.inGame = true;
    console.log(
      `User ${socket.userEmail} joined the game in room ${socket.roomId}`
    );
    const room = this.io.sockets.adapter.rooms.get(socket.roomId);
    if (room) {
      const allInGame = Array.from(room).every((socketId) => {
        const s = this.io.sockets.sockets.get(socketId);
        return s.inGame;
      });
      const gameRoom = await GameRoomService.getGameRoom(socket.roomId);
      const game = OpenaiGameService.decryptGameState(gameRoom.game_state);

      if (allInGame && game.status === "setup" && gameRoom.host_id === socket.userId) {
        console.log(
          `All players in room ${socket.roomId} have joined the game. Starting game...`
        );

        /**
         * This should start the game loop
         * TODO: Implement the game loop function
         * it should start the first roundtimer,
         * once that time ends, update the game state
         * and start the next roundtimer
         */

        this.emitToRoom(socket.roomId, "game-starting");

        const emitRoundTick = (number) => {
          this.emitToRoom(socket.roomId, "round-timer-tick", {
            countdown: number,
          });
        };
        // const emitRoundStart = async () => {
        //   this.emitToRoom(socket.roomId, "round-start");
        //   await OpenaiGameService.startRealtimeInterregation(
        //     socket.roomId,
        //     socket.userId,
        //     game
        //   );
        // };
        console.log("Starting interval for round start");
        // startInterval(30, emitRoundTick, emitRoundStart);
		startInterval(30, emitRoundTick);
      }
    }
  }

  handlePlayerReady(socket, roomId, userEmail, isReady) {
    console.log(
      `User ${userEmail} in room ${roomId} is ${
        isReady ? "ready" : "not ready"
      }`
    );
    socket.to(roomId).emit("player-ready", { email: userEmail, isReady });

    const room = this.io.sockets.adapter.rooms.get(roomId);
    if (room) {
      const playerSocket = Array.from(room).find((socketId) => {
        const s = this.io.sockets.sockets.get(socketId);
        return s.userEmail === userEmail;
      });
      if (playerSocket) {
        const s = this.io.sockets.sockets.get(playerSocket);
        s.isReady = isReady;
      }
    }

    this.checkAllPlayersReady(roomId);
  }

  checkHeartbeats() {
    const now = Date.now();
    this.io.sockets.sockets.forEach((socket) => {
      if (now - socket.lastHeartbeat > HEARTBEAT_TIMEOUT) {
        console.log(`Disconnecting inactive socket: ${socket.userEmail}`);
        this.handleDisconnect(socket);
        socket.disconnect(true);
      }
    });
  }

  updateRoomPlayerList(roomId) {
    const room = this.io.sockets.adapter.rooms.get(roomId);
    if (room) {
      const connectedSockets = Array.from(room);
      const playerData = connectedSockets
        .map((socketId) => {
          const playerSocket = this.io.sockets.sockets.get(socketId);
          return {
            email: playerSocket.userEmail,
            id: playerSocket.userId,
            isReady: playerSocket.isReady,
          };
        })
        .filter(Boolean);

      this.io.to(roomId).emit("player-list", playerData);
    }
  }

  static getInstance(httpServer) {
    if (!GameRoomSocketServer.instance && httpServer) {
      new GameRoomSocketServer(httpServer);
      console.log("GameRoomSocketServer instance created");
      console.log(
        "Socket.IO server is running on path:",
        GameRoomSocketServer.instance.io.path()
      );
    } else if (!GameRoomSocketServer.instance && !httpServer) {
      console.log("No HTTP server provided");
    }
    return GameRoomSocketServer.instance;
  }

  emit(event, data) {
    this.io.emit(event, data);
  }

  emitToRoom(roomId, event, data) {
    console.log(`Emitting event ${event} to room ${roomId}`);
    this.io.to(roomId).emit(event, data);
  }

  joinRoom(socket, roomId, userId) {
    socket.join(roomId);
    this.emitToRoom(roomId, "user-joined", { userId });
  }

  on(event, callback) {
    this.io.on(event, callback);
  }

  close() {
    this.io.close();
  }

  checkAllPlayersReady(roomId) {
    const room = this.io.sockets.adapter.rooms.get(roomId);
    if (room) {
      const allReady = Array.from(room).every((socketId) => {
        const s = this.io.sockets.sockets.get(socketId);
        return s.isReady;
      });

      if (allReady) {
        console.log(
          `All players in room ${roomId} are ready. Game will start soon!`
        );
        this.io.to(roomId).emit("all-players-ready");
      }
    }
  }
}
