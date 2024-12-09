import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";

const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const HEARTBEAT_TIMEOUT = 10000; // 10 seconds
import OpenaiGameService from "../services/openai-game-service.js";
import { GameRoomService } from "../services/game-room.service.js";
import NodeCache from 'node-cache';

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

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    this.inviteChannel = supabase
      .channel("table-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invites",
        },
        (payload) => this.sendInvitePayload(payload)
      )
      .subscribe();

    this.roomRoundTimers = new Map();

    this.io.on("connection", (socket) => {
      console.log("A user connected");

      socket.on("set-user", this.handleSetUserDetails.bind(this, socket));
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
      socket.on(
        "realtime-audio-response",
        this.handleRealtimeAudioResponse.bind(this, socket)
      );
      socket.on(
        "realtime-audio-response-end",
        this.handleRealtimeAudioResponseEnd.bind(this, socket)
      );
      socket.on(
        "voting-round-vote",
        this.handleVotingRoundVote.bind(this, socket)
      );
      socket.on("heartbeat", this.handleHeartbeat.bind(this, socket));
      socket.on("start-game", this.handleStartGame.bind(this, socket));
      socket.on("joined-game", this.handleJoinedGame.bind(this, socket));
      socket.on("player-ready", this.handlePlayerReady.bind(this, socket));

      // Initialize lastHeartbeat
      socket.lastHeartbeat = Date.now();

      // Start the heartbeat check interval
      setInterval(() => this.checkHeartbeats(), HEARTBEAT_INTERVAL);
      this.setupInviteListener();
    });

    GameRoomSocketServer.instance = this;
  }

  setupInviteListener = () => {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  };

  handleSetUserDetails(socket, userEmail, userName, userId) {
    socket.userEmail = userEmail;
    socket.userName = userName;
    socket.isReady = false;
    socket.userId = userId;
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
        userName: socket.userName,
      };
      socket.to(socket.roomId).emit("player-left", playerLeftData);
      socket.leave(socket.roomId);
      console.log(`Player left event sent to room ${JSON.stringify(room)}`);
    }
  }

  handleJoinRoom(socket, params, callback) {
    console.log("join-room called with params:", params);
    console.log("Socket:", socket.id + "\n\n");
    const { roomId, userId, userEmail, userName } = params;
    if (!socket.rooms.has(roomId)) {
      socket.join(roomId);
    }
    socket.userEmail = userEmail;
    socket.userId = userId;
    socket.roomId = roomId;
    socket.userName = userName;
    console.log(`User ${userEmail} joined room ${roomId}`);
    socket
      .to(roomId)
      .emit("player-joined", {
        email: userEmail,
        id: userId,
        username: userName,
      });
    if (callback) callback({ success: true });
  }

  handleLeaveRoom(socket, roomId, userEmail, userName) {
    socket.leave(roomId);
    console.log(`User ${userEmail} left room ${roomId}`);
    socket.to(roomId).emit("user-left", { userEmail, userName });
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
    const game_state = GameRoomService.decryptGameState(room.game_state);
    await OpenaiGameService.startRealtimeInterregation(
      roomId,
      userId,
      game_state
    );
  }

  async handleVotingRoundVote(socket, vote) {
    console.log("Voting round vote received:", vote);
    try {
      await OpenaiGameService.addVotingRoundVote(socket.roomId, vote);

      // check to see if all players have voted

      const currentRoundVotes =
        (this.roomRoundTimers.get(socket.roomId).currentRoundVotes || 0) + 1;

      this.roomRoundTimers.set(socket.roomId, {
        ...this.roomRoundTimers.get(socket.roomId),
        currentRoundVotes,
      });
      const numberOfPlayers = this.getPlayersInRoom(socket.roomId).length;

       // if all players have voted, clear the round timer and start the next round

      if (currentRoundVotes === numberOfPlayers) {
        this.roomRoundTimers.get(socket.roomId).clearRoundTimer();
      }
    } catch (error) {
      console.error("Error adding voting round vote:", error);
    }
  }

  async handleRealtimeAudioResponse(socket, audioData) {
    await OpenaiGameService.addUserResponseToInputAudioBuffer(
      socket.roomId,
      socket.userId,
      audioData.audioBuffer
    );
  }

  async handleRealtimeAudioResponseEnd(socket) {
    await OpenaiGameService.createInterrogationResponse(socket.roomId);
  }

  handleChatMessage(socket, roomId, userEmail, userName, message) {
    console.log(`New message in room ${roomId}: ${message}`);
    const room = this.io.sockets.adapter.rooms.get(roomId);
    const numReceivers = room ? room.size : 0;
    console.log(`${numReceivers} sockets are going to receive this message`);
    socket.to(roomId).emit("chat-message", { userEmail, message, userName });
  }

  getPlayersInRoom(roomId) {
    const room = this.io.sockets.adapter.rooms.get(roomId);
    if (room) {
      const connectedSockets = Array.from(room);
      console.log("Connected sockets:", connectedSockets);
      const playerData = connectedSockets
        .map((socketId) => {
          const playerSocket = this.io.sockets.sockets.get(socketId);
          return {
            email: playerSocket.userEmail,
            id: playerSocket.userId,
            username: playerSocket.userName,
            isReady: playerSocket.isReady,
          };
        })
        .filter(Boolean);
      console.log("players in room" + JSON.stringify(playerData) + "\n");

      console.log(`Room ${roomId} has ${playerData.length} players online`);
      return playerData;
    } else {
      console.log(`Room ${roomId} not found`);
      return [];
    }
  }

  handleOnlinePlayersList(socket, roomId, callback) {
    console.log("online-players-list called with roomId:", roomId);
    const playerData = this.getPlayersInRoom(roomId);
    if (playerData) {
      if (callback) callback({ success: true, players: playerData });
    } else {
      console.log(`Room ${roomId} not found`);
      if (callback) callback({ success: false, message: "Room not found" });
    }
  }

  handleHeartbeat(socket, roomId) {
    console.log(`Heartbeat from user ${socket.userName} in room ${roomId}`);
    socket.lastHeartbeat = Date.now();
  }

  sendInvitePayload(payload) {
    console.log("Invite Payload Received \n", payload);
    const { new: invite } = payload;
    const { recipient_user_email, game_id, invite_code } = invite;
    // get the socket of the recipient user email
    const recipientSocket = this.getSocketForUser(recipient_user_email);

    if (recipientSocket) {
      console.log("Recipient Socket:", recipientSocket.id);
      console.log("Emitting invite to recipient");
      // emit to the recipient socket

      this.io
        .to(recipientSocket.id)
        .emit("invite-received", {
          recipient_user_email,
          game_id,
          invite_code,
        });
    }
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
          username: socket.userName,
        };
      });

      const thread = await OpenaiGameService.createGameThread(playerIds);
      console.log(`Thread created: ${thread.id}`);

      // save the thread id to the game room
      await GameRoomService.updateGameRoom(roomId, { thread_id: thread.id });

      const run = await OpenaiGameService.runThreadAndProcess(
        thread.id,
        roomId,
        false
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
   * the first round will have different time than the rest of the rounds
   * it will last 30 seconds and give the players time to read their cards
   * once that timer ends, we should call the startRealtimeInterrogation function in the openaiGameService
   * with the user who is the host of the room
   * all rounds after the first should have a 2 minute timer
   * Client Side:
   * - the client will send the audio data in chunks that will append to the input audio buffer
   * - once the response timer ends client side the createInterrogationResponse function in the openaiGameService will be called
   * Server Side: ( this is what we need to implement)
   * once the two minute timer ends for the round, we need to take the conversation and add it to the game thread so that it can be run and then a function call can be made to generate the new game state
   * that state will be encrypted and stored in the database via supabase
   * once that is done, we can emit the new state to the clients
   * then we start the next round
   *
   *
   */
  async startGameLoop(socket, roomId) {
    // function to emit the round tick event to the room

    let listenerFunc = null;
    const initialGameRoom = await GameRoomService.getGameRoom(roomId);
    const emitRoundTick = (number) => {
      this.emitToRoom(roomId, "round-timer-tick", { countdown: number });
      this.roomRoundTimers.set(socket.roomId, {
        ...this.roomRoundTimers.get(socket.roomId),
        currentRoundTime: number,
      });
    };
    // function to start the first round, this will be called after the first round timer ends
    // this will start the first round and then start the interval for the rest of the rounds
    const emitRoundStart = async () => {
      console.log("Starting round...");
      this.emitToRoom(roomId, "round-end");

      // get the room and its game state
      const room = this.io.sockets.adapter.rooms.get(roomId);
      if(!room) {
        return;
      }
      const gameRoom = await GameRoomService.getGameRoom(roomId);
      const gameState = GameRoomService.decryptGameState(gameRoom.game_state);
      console.log("Game state:", gameState);
      // get the next round player, if there is no inactive round, the game is over
      const nextRound = gameState.rounds.find(
        (round) => round.status === "active"
      );
      const nextRoundPlayerSocket = Array.from(room)
        .map((socketId) => {
          const s = this.io.sockets.sockets.get(socketId);
          console.log("Socket:", s.userId);
          if (s.userId === nextRound.player) {
            return s;
          }
        })
        .filter(Boolean)[0];

      // if there is a next round player, start the realtime session and the interrogation
      if (nextRoundPlayerSocket) {
        // check to see what type of round it is
        if (nextRound.type == "interrogation") {
          // if(true) {
          await OpenaiGameService.openRealtimeSession(
            roomId,
            gameState,
            gameRoom.thread_id
          );
          // run the game thread to update the round state
          // await OpenaiGameService.runThreadAndProcess(initialGameRoom.thread_id, roomId);

          await OpenaiGameService.startRealtimeInterregation(
            roomId,
            nextRoundPlayerSocket.userId,
            gameState,
            listenerFunc
          );
          // console.log("host socket", nextRoundPlayerSocket.userId);
          console.log("Starting interrogation round...");
          // OpenaiGameService.sendGeneratedAudio('resp_ANPFVm2Waf2cfB3dj0xMU',roomId, nextRoundPlayerSocket.userId )

          const { clear } = startInterval(90, emitRoundTick, handleRoundEnd);
          this.roomRoundTimers.set(socket.roomId, {
            ...this.roomRoundTimers.get(socket.roomId),
            clearRoundTimer: clear,
          });
        }
      } else {
        this.emitToRoom(roomId, "voting-round-start");

        const { clear } = startInterval(30, emitRoundTick, handleRoundEnd);
        this.roomRoundTimers.set(socket.roomId, {
          ...this.roomRoundTimers.get(socket.roomId),
          clearRoundTimer: clear,
        });
      }
    };

    const handleRoundEnd = async () => {
      // Process the conversation and update the game state by running the thread
      // conversation transcripts for both the player in the room and the AI are stored in the game thread in the openai game service upson
      // Realtime API server-sent events 'response.audio_transcript.done and 'conversation.item.input_audio_transcript.done'
      this.emitToRoom(roomId, "round-end");

      try {
        const gameRoom = await GameRoomService.getGameRoom(roomId);
        const gameState = GameRoomService.decryptGameState(gameRoom.game_state);

        // get the current active round
        let activeRound = gameState.rounds.find(
          (round) => round.status === "active"
        );

        if (activeRound.type == "interrogation") {

          await OpenaiGameService.endRealtimeInterrogation(gameRoom.id)
          await OpenaiGameService.endInterrogationRound(
            gameRoom.thread_id,
            gameState
          );

        } else if (activeRound.type == "voting") {
          await OpenaiGameService.endVotingRound(gameRoom.thread_id);
        }

        const updatedGameState = await OpenaiGameService.runThreadAndProcess(
          initialGameRoom.thread_id,
          roomId,
          false
        );

        // if the game is not over, start the next round
        if (updatedGameState.status == "finished") {
          this.emitToRoom(roomId, "game-end");
        }

        //get the next active round
        activeRound = updatedGameState.rounds.find(
          (round) => round.status === "active"
        );
        if (!activeRound) {
          this.emitToRoom(roomId, "game-end");
        }

        // if the player in the active round is not connected, skip the round 
        const playerSocket = Array.from(room).find((socketId) => {
          const s = this.io.sockets.sockets.get(socketId);
          return s.userId === activeRound.player;
        });
        if (!playerSocket) {
          await OpenaiGameService.skipInterrogationRound(roomId, activeRound.player);
          handleRoundEnd();
          return;
        }

        if (activeRound.type == "interrogation") {
          await OpenaiGameService.startRealtimeInterregation(
            roomId,
            activeRound.player,
            updatedGameState
          );
          // OpenaiGameService.sendGeneratedAudio('resp_ANPFVm2Waf2cfB3dj0xMU',roomId, activeRound.player )
          const { clear } = startInterval(120, emitRoundTick, handleRoundEnd);
          this.roomRoundTimers.set(socket.roomId, {
            ...this.roomRoundTimers.get(socket.roomId),
            clearRoundTimer: clear,
          });
        } else if (activeRound.type == "voting") {
            this.emitToRoom(roomId, "voting-round-start");
            const { clear } = startInterval(120, emitRoundTick, handleRoundEnd);
            this.roomRoundTimers.set(socket.roomId, {
              ...this.roomRoundTimers.get(socket.roomId),
              clearRoundTimer: clear,
            });
        }
      } catch (error) {
        console.error("Error handling round end:", error);
      }
    };

    const startFirstRound = (timer) => {
      const { clear } = startInterval(timer, emitRoundTick, emitRoundStart);
      this.roomRoundTimers.set(socket.roomId, {
        ...this.roomRoundTimers.get(socket.roomId),
        clearRoundTimer: clear,
      });
    };

    startFirstRound(20);
  }

  async handleJoinedGame(socket, roomId, userId) {
    if (socket.inGame === undefined) {
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
        const game_state = GameRoomService.decryptGameState(
          gameRoom.game_state
        );

        if (
          allInGame &&
          gameRoom.host_id === socket.userId &&
          this.roomRoundTimers.get(socket.roomId) === undefined &&
          game_state.status !== "finished"
        ) {
          console.log(
            `All players in room ${socket.roomId} have joined the game. Starting game...`
          );

          this.emitToRoom(socket.roomId, "game-starting");

          // Start the game loop
          this.startGameLoop(socket, socket.roomId);
        }
      }
    }
  }

  handlePlayerReady(socket, roomId, userEmail, userName, isReady) {
    console.log(
      `User ${userEmail} in room ${roomId} is ${
        isReady ? "ready" : "not ready"
      }`
    );
    socket
      .to(roomId)
      .emit("player-ready", { email: userEmail, username: userName, isReady });

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

  emitToSocket(socketId, event, data) {
    console.log(`Emitting event ${event} to socket ${socketId}`);
    this.io.to(socketId).emit(event, data);
  }

  joinRoom(socket, roomId, userId) {
    socket.join(roomId);
    this.emitToRoom(roomId, "user-joined", { userId });
  }

  getSocketForUser(userId) {
    const userSocket = Array.from(this.io.sockets.sockets.values()).find(
      (s) => s.userId === userId || s.userEmail === userId
    );
    return userSocket;
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
