import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";

const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const HEARTBEAT_TIMEOUT = 10000; // 10 seconds
import { GameRoomService } from "../services/game_room/game_room.service.js";
import { GameRoomManagerFactory } from "../services/game_manager/game_manager_factory.js";
import { SocketEvents } from "./events_schema.js";

export class GameRoomSocketServer {
  static instance = null;

  constructor(httpServer) {
    if (GameRoomSocketServer.instance) {
      return GameRoomSocketServer.instance;
    }

    // this.openaiGameService = new OpenaiGameService();
    if (!httpServer) {
      this.io = new Server(3001, {
        cors: {
          origin: "*", // Allow all origins
          methods: ["GET", "POST"],
        },
      });
    }
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


      // keeps track of all the round timers for each room in this socket server
    this.roomGameManagers = new Map();
    // set up the socket event listeners
    this.io.on("connection", (socket) => {
      socket.on(SocketEvents.USER_SET, this.handleSetUserDetails.bind(this, socket));
      socket.on(SocketEvents.DISCONNECT, this.handleDisconnect.bind(this, socket));
      socket.on(SocketEvents.ROOM_JOIN, this.handleJoinRoom.bind(this, socket));
      socket.on(SocketEvents.ROOM_LEAVE, this.handleLeaveRoom.bind(this, socket));

      // TODO: this should move the game into the deduction phase
      // socket.on(
      //   "start-next-round",
      //   this.handleStartNextRound.bind(this, socket)
      // );

      socket.on(SocketEvents.REALTIME_START, this.handleStartInterrogation.bind(this, socket));

      socket.on(SocketEvents.CHAT_MESSAGE, this.handleChatMessage.bind(this, socket));

      socket.on(
        SocketEvents.PLAYER_LIST,
        this.handleOnlinePlayersList.bind(this, socket)
      );
      
      socket.on(
        SocketEvents.REALTIME_AUDIO_DELTA_USER,
        this.handleRealtimeAudioResponse.bind(this, socket)
      );

      socket.on(SocketEvents.REALTIME_END, this.handleEndInterrogation.bind(this, socket));
      socket.on(SocketEvents.DEDUCTION_LEAD_CREATED, this.handleDeductionLeadCreated.bind(this, socket));
      socket.on(SocketEvents.DEDUCTION_NODE_CREATED, this.handleDeductionNodeCreated.bind(this, socket));
      socket.on(SocketEvents.DEDUCTION_LEAD_REMOVED, this.handleDeductionLeadRemoved.bind(this, socket));
      socket.on(SocketEvents.DEDUCTION_SUBMIT, this.handleSubmitDeduction.bind(this, socket));
      socket.on(SocketEvents.LEADERBOARD_UPDATED, this.handleLeaderboardUpdate.bind(this, socket));

      // Multiplayer only
      // socket.on(
      //   "voting-round-vote",
      //   this.handleVotingRoundVote.bind(this, socket)
      // );

      // Single player only

      // heartbeat lister for client sockets connected to this server
      socket.on(SocketEvents.HEARTBEAT, this.handleHeartbeat.bind(this, socket));

      // called when the host of a game starts the game from the looby

      socket.on(SocketEvents.GAME_CREATE, this.handleCreateInitialGameState.bind(this, socket));
      socket.on(SocketEvents.GAME_START, this.handleStartGame.bind(this, socket));
      // called when a player navigates to the game page
      socket.on(SocketEvents.GAME_JOINED, this.handleJoinedGame.bind(this, socket));
      // called when a player readies up in the game lobby
      socket.on(SocketEvents.PLAYER_READY, this.handlePlayerReady.bind(this, socket));

      // Initialize lastHeartbeat for the socket that just connected
      socket.lastHeartbeat = Date.now();

      // Start the heartbeat check interval for the socket that just connected
      setInterval(() => this.checkHeartbeats(), HEARTBEAT_INTERVAL);
    });

    GameRoomSocketServer.instance = this;
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
      new GameRoomSocketServer();
    }
    return GameRoomSocketServer.instance;
  }

  // TODO: these attributes should be set on the socket.data object
  handleSetUserDetails(socket, userEmail, userName, userId, roomId) {
    console.log(`User details: ${userEmail}, ${userName}, ${userId}, ${roomId}`);
    socket.userEmail = userEmail;
    socket.userName = userName;
    socket.isReady = false;
    socket.userId = userId;
    socket.roomId = roomId;
  }

  // this could be moved to a 
  handleDisconnect(socket) {
    console.log(`User ${socket.userEmail} disconnected`);
    const room = this.io.sockets.adapter.rooms.get(socket.roomId);
    console.log(
      `User ${socket.userEmail} disconnected from room ${socket.roomId} : ${room}`
    );
    if (room) {
      const playerLeftData = {
        email: socket.userEmail,
        id: socket.userId, // this shouldnt be sent to the client
        userName: socket.userName,
      };
      socket.to(socket.roomId).emit(SocketEvents.PLAYER_LEFT, playerLeftData);
      socket.leave(socket.roomId);
      console.log(`Player left event sent to room ${JSON.stringify(room)}`);
    }
  }

  handleJoinRoom(socket, params, callback) {
    console.log("room:join called with params:", params);
    console.log("Socket:", socket.id + "\n\n");
    const { roomId, userId, userEmail, userName } = params;
    if (!socket.rooms.has(roomId)) {
      socket.join(roomId);
    }
    this.handleSetUserDetails(socket, userEmail, userName, userId, roomId);
    console.log(`User ${userEmail} joined room ${roomId}`);
    socket.to(roomId).emit(SocketEvents.PLAYER_JOINED, {
      email: userEmail,
      id: userId, // this shouldnt be sent to the client
      username: userName,
    });
    if (callback) callback({ success: true });
  }

  handleLeaveRoom(socket, roomId, userEmail, userName) {
    socket.leave(roomId);
    console.log(`User ${userEmail} left room ${roomId}`);
    socket.to(roomId).emit(SocketEvents.PLAYER_LEFT, { userEmail, userName });
  }

  handleStartGame(socket, roomId) {
    try {
      this.roomGameManagers.get(roomId).startGame();
    } catch (error) {
      console.error(`Error in handleStartGame: ${error.message}`);
      this.emitToRoom(socket.roomId, SocketEvents.ERROR, { message: error.message });
    }
  }

  /**
   * Handles the submission of a deduction by a user.
   *
   * @param {Socket} socket - The socket instance of the user.
   * @param {string} roomId - The ID of the room.
   * @param {Object} deduction - The deduction submitted by the user.
   */
  async handleSubmitDeduction(socket, roomId, deduction) {
    try {
      this.roomGameManagers.get(socket.roomId).runDeductionAnalysis(deduction);
    } catch (error) {
      console.error(`Error in handleSubmitDeduction: ${error.message}`);
      this.emitToRoom(socket.roomId, SocketEvents.ERROR, { message: error.message });
    }
  }

  async handleStartInterrogation(socket, suspectId) {
    try {
      if(!socket.roomId) {
    console.log("Socket room id is undefined");
    return;
      }
      console.log("Starting interrogation for suspect:", suspectId);
      this.roomGameManagers.get(socket.roomId).startInterrogation(suspectId);
    } catch (error) {
      console.error(`Error in handleStartInterrogation: ${error.message}`);
      this.emitToRoom(socket.roomId, SocketEvents.ERROR, { message: error.message });
    }
  }

  async handleEndInterrogation(socket) {
    try {
      console.log("Ending interrogation...");
      this.roomGameManagers.get(socket.roomId).endInterrogation();
    } catch (error) {
      console.error(`Error in handleEndInterrogation: ${error.message}`);
      this.emitToRoom(socket.roomId, SocketEvents.ERROR, { message: error.message });
    }
  }

  async handleStartNextRound(socket, roomId) {
    try {
      this.roomGameManagers.get(socket.roomId).startNextPhase();
    } catch (error) {
      console.error(`Error in handleStartNextRound: ${error.message}`);
      this.emitToRoom(socket.roomId, SocketEvents.ERROR, { message: error.message });
    }
  }

  async handleDeductionLeadCreated(socket, nodes) {
    try {
      const { sourceNode, targetNode, type } = nodes;
      this.roomGameManagers.get(socket.roomId).createNewLead(sourceNode, targetNode, type);
    } catch (error) {
      console.error(`Error in handleDeductionLeadCreated: ${error.message}`);
      this.emitToRoom(socket.roomId, SocketEvents.ERROR, { message: error.message });
    }
  }

  async handleDeductionNodeCreated(socket, node) {
    try {
      this.roomGameManagers.get(socket.roomId).createNewDeductionNode(node);
    } catch (error) {
      console.error(`Error in handleDeductionNodeCreated: ${error.message}`);
      this.emitToRoom(socket.roomId, SocketEvents.ERROR, { message: error.message });
    }
  }

  async handleDeductionLeadRemoved(socket, leadId) {
    try {
      this.roomGameManagers.get(socket.roomId).removeLead(leadId);
    } catch (error) {
      console.error(`Error in handleDeductionLeadRemoved: ${error.message}`);
      this.emitToRoom(socket.roomId, SocketEvents.ERROR, { message: error.message });
    }
  }

  async handleLeaderboardUpdate(socket, leaderboard) {
    try {
      this.roomGameManagers.get(socket.roomId).calculateGameResults(leaderboard);
    } catch (error) {
      console.error(`Error in handleLeaderboardUpdate: ${error.message}`);
      this.emitToRoom(socket.roomId, SocketEvents.ERROR, { message: error.message });
    }
  }

  // async handleVotingRoundVote(socket, vote) {
  //   console.log("Voting round vote received:", vote);
  //   try {
  //     await OpenaiGameService.addVotingRoundVote(socket.roomId, vote);

  //     // check to see if all players have voted

  //     const currentRoundVotes =
  //       (this.roomGameManagers.get(socket.roomId).currentRoundVotes || 0) + 1;

  //     this.roomGameManagers.set(socket.roomId, {
  //       ...this.roomGameManagers.get(socket.roomId),
  //       currentRoundVotes,
  //     });
  //     const numberOfPlayers = this.getPlayersInRoom(socket.roomId).length;

  //     // if all players have voted, clear the round timer and start the next round

  //     if (currentRoundVotes === numberOfPlayers) {
  //       this.roomGameManagers.get(socket.roomId).clearRoundTimer();
  //     }
  //   } catch (error) {
  //     console.error("Error adding voting round vote:", error);
  //   }
  // }

  async handleRealtimeAudioResponse(socket, audioData) {
    const manager = this.roomGameManagers.get(socket.roomId);
    if (!manager) {
      console.error("Game manager not found for room:", socket.roomId);
      return;
    }
    manager.addUserAudioToInputBuffer(audioData.audioBuffer);
  }

  handleChatMessage(socket, roomId, userEmail, userName, message) {
    console.log(`New message in room ${roomId}: ${message}`);
    const room = this.io.sockets.adapter.rooms.get(roomId);
    const numReceivers = room ? room.size : 0;
    console.log(`${numReceivers} sockets are going to receive this message`);
    socket.to(roomId).emit(SocketEvents.CHAT_MESSAGE, { userEmail, message, userName });
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
    console.log("player:list called with roomId:", roomId);
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

      this.io.to(recipientSocket.id).emit(SocketEvents.INVITE_RECEIVED, {
        recipient_user_email,
        game_id,
        invite_code,
      });
    }
  }

  async handleCreateInitialGameState(socket, roomId, mode) {
    console.log(`Starting game in room ${roomId}`);
    this.emitToRoom(roomId, SocketEvents.GAME_CREATING);
    try {

      //TODO: use a built in socket.io function for getting all sockets in a room
      const room = this.io.sockets.adapter.rooms.get(roomId);
      const playerIds = Array.from(room).map((socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        return {
          id: socket.userId,
          email: socket.userEmail,
          username: socket.userName,
        };
      });
      console.log("Player IDs: ", playerIds + '\n\n\n');
      const gameRoom = await GameRoomService.getGameRoom(roomId);
      const manager =  GameRoomManagerFactory.createGameRoomManager(gameRoom, playerIds, null);

      this.attachGameManagerListeners(manager,roomId);
      
      this.roomGameManagers.set(roomId, manager);

      manager.createInitialGameState(roomId, playerIds);
      console.log(`Game started in room ${roomId}`);
    } catch (error) {
      console.error(`Error starting game in room ${roomId}:`, error);
      this.emitToRoom(roomId, SocketEvents.GAME_ERROR, {
        message: "Failed to start the game. Please try again.",
      });
    }
  }

    /**
   * Attaches listeners to the game manager's events and forwards them to the client sockets.
   *
   * @param {GameRoomManager} manager - The game manager instance.
   * @param {string} roomId - The ID of the room.
   */
    attachGameManagerListeners(manager, roomId) {
      manager.on(SocketEvents.GAME_ERROR, (data) => {
        this.emitToRoom(roomId, SocketEvents.GAME_ERROR, data);
      });
      manager.on(SocketEvents.GAME_CREATED, (data) => {
        this.emitToRoom(roomId, SocketEvents.GAME_CREATED, data);
      });

      manager.on(SocketEvents.GAME_STARTED, (data) => {
        this.emitToRoom(roomId, SocketEvents.GAME_STARTED, data);
      });

      manager.on(SocketEvents.GAME_UPDATED, (data) => {
        this.emitToRoom(roomId, SocketEvents.GAME_UPDATED, data);
      });

      manager.on(SocketEvents.ROUND_TICK, (data) => {
        this.emitToRoom(roomId, SocketEvents.ROUND_TICK, data);
      });

      manager.on(SocketEvents.PHASE_STARTED, (data) => {
        this.emitToRoom(roomId, SocketEvents.PHASE_STARTED, data);
      });

      manager.on(SocketEvents.PHASE_ENDED, (data) => {
        this.emitToRoom(roomId, SocketEvents.PHASE_ENDED, data);
      });
      manager.on(SocketEvents.LEADERBOARD_STARTED, (data) => {
        this.emitToRoom(roomId, SocketEvents.LEADERBOARD_STARTED, data);
      });
      manager.on(SocketEvents.LEADERBOARD_FINISHED, (data) => {
        this.emitToRoom(roomId, SocketEvents.LEADERBOARD_FINISHED, data);
      });

      manager.on(SocketEvents.DEDUCTION_STARTED, (data) => {
        this.emitToRoom(roomId, SocketEvents.DEDUCTION_STARTED, data);
      });
      manager.on(SocketEvents.DEDUCTION_COMPLETED, (data) => {
        this.emitToRoom(roomId, SocketEvents.DEDUCTION_COMPLETED, data);
      });
      manager.on(SocketEvents.DEDUCTION_ERROR, (data) => {
        this.emitToRoom(roomId, SocketEvents.DEDUCTION_ERROR, data);
      });

      manager.on(SocketEvents.REALTIME_CONNECTED, (data) => {
        this.emitToRoom(roomId, SocketEvents.REALTIME_CONNECTED, data);
      });
      manager.on(SocketEvents.REALTIME_DISCONNECTED, (data) => {
        this.emitToRoom(roomId, SocketEvents.REALTIME_DISCONNECTED, data);
      });
      manager.on(SocketEvents.REALTIME_STARTED, (data) => {
        this.emitToRoom(roomId, SocketEvents.REALTIME_STARTED, data);
      });
      manager.on(SocketEvents.REALTIME_MESSAGE, (data) => {
        this.emitToRoom(roomId, SocketEvents.REALTIME_MESSAGE, data);
      });
      manager.on(SocketEvents.REALTIME_TRANSCRIPT_DONE_USER, (data) => {
        this.emitToRoom(roomId, SocketEvents.REALTIME_TRANSCRIPT_DONE_USER, data);
      });
      manager.on(SocketEvents.REALTIME_AUDIO_DELTA_ASSISTANT, (data) => {
        this.emitToRoom(roomId, SocketEvents.REALTIME_AUDIO_DELTA_ASSISTANT, data);
      });
      manager.on(SocketEvents.REALTIME_TRANSCRIPT_DELTA_ASSISTANT, (data) => {
        this.emitToRoom(roomId, SocketEvents.REALTIME_TRANSCRIPT_DELTA_ASSISTANT, data);
      });
  
      // Add more listeners as needed based on game manager events
    }

  async handleJoinedGame(socket, roomId, userId) {
    if (socket.inGame === undefined) {
      socket.inGame = true;
      console.log(
        `User ${socket.userEmail} joined the game in room ${socket.roomId || roomId}`
      );
      const room = this.io.sockets.adapter.rooms.get(socket.roomId || roomId);
      if (room) {
        const allInGame = Array.from(room).every((socketId) => {
          const s = this.io.sockets.sockets.get(socketId);
          return s.inGame;
        });
        const gameRoom = await GameRoomService.getGameRoom(socket.roomId || roomId);
        const game_state = GameRoomService.decryptGameState(
          gameRoom.game_state
        );

        // console log all the variables being checked

        let gameManager = this.roomGameManagers.get(socket.roomId);
        console.log("All in game:", allInGame);
        console.log("Host ID:", gameRoom.host_id === socket.userId);
        console.log(
          "Has GameManager:",
          gameManager !== undefined
        );
        console.log("Game State Status:", game_state.status !== "finished");
        if(!gameManager) {
          const playerIds = Array.from(room).map((socketId) => {
            const socket = this.io.sockets.sockets.get(socketId);
            return {
              id: socket.userId,
              email: socket.userEmail,
              username: socket.userName,
            };
          });
          
          gameManager = GameRoomManagerFactory.createGameRoomManager(gameRoom, playerIds, game_state);
          this.attachGameManagerListeners(gameManager,roomId);
        
          this.roomGameManagers.set(roomId, gameManager);
        }
        console.log("All in game:", allInGame);
        console.log("Host ID:", gameRoom.host_id === socket.userId);
        console.log(
          "Has GameManager:",
          gameManager !== undefined
        );
        console.log("Game State Status:", game_state.status !== "finished");
        if (
          allInGame &&
          gameRoom.host_id === socket.userId &&
          gameManager !== undefined &&
          game_state.status === 'active'
        ) {
          console.log(  "asdfasdf" + game_state.status);
          gameManager.startGame();
          console.log(
            `All players in room ${socket.roomId} have joined the game. Game is eligible to start...`
          );  

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
      .emit(SocketEvents.PLAYER_READY, { email: userEmail, username: userName, isReady });

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

      this.io.to(roomId).emit(SocketEvents.PLAYER_LIST, playerData);
    }
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
        this.io.to(roomId).emit(SocketEvents.PLAYER_ALL_READY);
      }
    }
  }
}
