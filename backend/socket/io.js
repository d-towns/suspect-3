import { Server } from "socket.io";

const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const HEARTBEAT_TIMEOUT = 10000; // 10 seconds

export class GameRoomSocketServer {
	static instance = null;

	constructor(httpServer) {
		if (GameRoomSocketServer.instance) {
			return GameRoomSocketServer.instance;
		}

		this.io = new Server(httpServer, {
			cors: {
				origin: "*", // Allow all origins
				methods: ["GET", "POST"]
			}
		});

		this.io.on('connection', (socket) => {
			console.log('A user connected');

			// Store userEmail in socket for easy access
			socket.on('set-user-email', (userEmail) => {
				socket.userEmail = userEmail;
			});

			socket.on('disconnect', () => {
				// send a player left event to all of the other socket that are in the room of the disconnecting socket
				console.log(`User ${socket.userEmail} disconnected`);
				const room = this.io.sockets.adapter.rooms.get(socket.roomId);
				console.log(`User ${socket.userEmail} disconnected from room ${socket.roomId} : ${room}`);
				if (room) {
					const playerLeftData = {
						email: socket.userEmail,
						id: socket.userId
					};
					socket.to(room).emit('player-left', playerLeftData);
					console.log(`Player left event sent to room ${JSON.stringify(room)}`);
				}
			});

			socket.on('join-room', (params, callback) => {
				console.log('join-room called with params:', params);
				const {roomId, userId, userEmail} = params;
				socket.join(roomId);
				socket.userEmail = userEmail; // Store userEmail in socket
				socket.userId = userId; // Store userId in socket
				socket.roomId = roomId; // Store roomId in socket
				console.log(`User ${userEmail} joined room ${roomId}`);
				socket.to(roomId).emit('player-joined', { email: userEmail, id: userId });
				if (callback) callback({ success: true });
			});

			socket.on('leave-room', (roomId, userEmail) => {
				socket.leave(roomId);
				console.log(`User ${userEmail} left room ${roomId}`);
				socket.to(roomId).emit('user-left', { userEmail });
			});

			socket.on('chat-message', (roomId, userEmail, message) => {
				console.log(`New message in room ${roomId}: ${message}`);
				// how many socket are going to receive this message?
				const room = this.io.sockets.adapter.rooms.get(roomId);
				const numReceivers = room ? room.size : 0;
				console.log(`${numReceivers} sockets are going to receive this message`);
				socket.to(roomId).emit('chat-message', { userEmail, message });
			});

			socket.on('online-players-list', (roomId, callback) => {
				console.log('online-players-list called with roomId:', roomId);
				const room = this.io.sockets.adapter.rooms.get(roomId);
				if (room) {
					const connectedSockets = Array.from(room);
					const playerData = connectedSockets.map(socketId => {
						const playerSocket = this.io.sockets.sockets.get(socketId);
						return {
							email: playerSocket.userEmail,
							id: playerSocket.userId,
							isReady: playerSocket.isReady
						};
					}).filter(Boolean); // Remove any undefined values

					console.log(`Room ${roomId} has ${playerData.length} players online`);
					if (callback) callback({ success: true, players: playerData });
				} else {
					console.log(`Room ${roomId} not found`);
					if (callback) callback({ success: false, message: 'Room not found' });
				}
			});
			// heartbeat is used to see who is still in the room
			socket.on('heartbeat', (roomId) => {
				console.log(`Heartbeat from user ${socket.userEmail} in room ${roomId}`);
				socket.lastHeartbeat = Date.now();
			});

			socket.on('start-game', (roomId) => {
				console.log(`Starting game in room ${roomId}`);
				this.io.to(roomId).emit('game-started');
			});

			socket.on('player-ready', (roomId, userEmail, isReady) => {
				console.log(`User ${userEmail} in room ${roomId} is ${isReady ? 'ready' : 'not ready'}`);
				socket.to(roomId).emit('player-ready', { email: userEmail, isReady });
				
				// Update the player's ready status in the room
				const room = this.io.sockets.adapter.rooms.get(roomId);
				if (room) {
				  const playerSocket = Array.from(room).find(socketId => {
					const s = this.io.sockets.sockets.get(socketId);
					return s.userEmail === userEmail;
				  });
				  if (playerSocket) {
					const s = this.io.sockets.sockets.get(playerSocket);
					s.isReady = isReady;
				  }
				}
		
				// Check if all players are ready and start the game if so
				this.checkAllPlayersReady(roomId);
			});

			// Initialize lastHeartbeat
			socket.lastHeartbeat = Date.now();

			// Start the heartbeat check interval
			setInterval(() => this.checkHeartbeats(), HEARTBEAT_INTERVAL);

		});

		GameRoomSocketServer.instance = this;
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

	handleDisconnect(socket) {
		if (socket.roomId) {
			const playerLeftData = {
				email: socket.userEmail,
				id: socket.userId
			};
			socket.to(socket.roomId).emit('player-left', playerLeftData);
		}
	}

	updateRoomPlayerList(roomId) {
		const room = this.io.sockets.adapter.rooms.get(roomId);
		if (room) {
			const connectedSockets = Array.from(room);
			const playerData = connectedSockets.map(socketId => {
				const playerSocket = this.io.sockets.sockets.get(socketId);
				return {
					email: playerSocket.userEmail,
					id: playerSocket.userId,
					isReady: playerSocket.isReady
				};
			}).filter(Boolean);

			this.io.to(roomId).emit('player-list', playerData);
		}
	}

	static getInstance(httpServer) {
		if (!GameRoomSocketServer.instance && httpServer) {
			new GameRoomSocketServer(httpServer);
			console.log('GameRoomSocketServer instance created');
			// log the path that the socket.io server is running on
			console.log('Socket.IO server is running on path:', GameRoomSocketServer.instance.io.path());
		} else if (!GameRoomSocketServer.instance && !httpServer) {
			console.log('No HTTP server provided');
		}
		return GameRoomSocketServer.instance;
	}

	emit(event, data) {
		this.io.emit(event, data);
	}

	emitToRoom(roomId, event, data) {
		this.io.to(roomId).emit(event, data);
	}

	joinRoom(socket, roomId, userId) {
		socket.join(roomId);
		this.emitToRoom(roomId, 'user-joined', { userId });
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
		  const allReady = Array.from(room).every(socketId => {
			const s = this.io.sockets.sockets.get(socketId);
			return s.isReady;
		  });
	
		  if (allReady) {
			console.log(`All players in room ${roomId} are ready. Game will start soon!`);
			this.io.to(roomId).emit('all-players-ready');
			// Here you would implement the logic to start the game
		  }
		}
	  }

}



