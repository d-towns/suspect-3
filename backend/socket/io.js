import { Server } from "socket.io";

export class GameRoomSocketServer  {
	static instance = null;

	constructor(httpServer) {
		if (GameRoomSocketServer.instance) {
			return GameRoomSocketServer.instance;
		}

		this.io = new Server(httpServer);

		this.io.on('connection', (socket) => {
			console.log('A user connected');

			// Store userEmail in socket for easy access
			socket.on('set-user-email', (userEmail) => {
				socket.userEmail = userEmail;
			});

			socket.on('disconnect', () => {
				console.log('User disconnected');
			});

			socket.on('join-room', (roomId, userEmail, callback) => {
				socket.join(roomId);
				socket.userEmail = userEmail; // Store userEmail in socket
				console.log(`User ${userEmail} joined room ${roomId}`);
				socket.to(roomId).emit('user-joined', { userEmail });
				if (callback) callback({ success: true });
			});

			socket.on('leave-room', (roomId, userEmail) => {
				socket.leave(roomId);
				console.log(`User ${userEmail} left room ${roomId}`);
				socket.to(roomId).emit('user-left', { userEmail });
			});

			socket.on('chat-message', (roomId, userEmail, message) => {
				console.log(`New message in room ${roomId}: ${message}`);
				this.io.to(roomId).emit('chat-message', { userEmail, message });
			});

			socket.on('online-players-list', (roomId, callback) => {
				console.log('online-players-list called with roomId:', roomId);
				const room = this.io.sockets.adapter.rooms.get(roomId);
				if (room) {
					const connectedSockets = Array.from(room);
					const playerEmails = connectedSockets.map(socketId => {
						const playerSocket = this.io.sockets.sockets.get(socketId);
						return playerSocket.userEmail;
					}).filter(Boolean); // Remove any undefined values

					console.log(`Room ${roomId} has ${playerEmails.length} players online`);
					if (callback) callback({ success: true, players: playerEmails });
				} else {
					console.log(`Room ${roomId} not found`);
					if (callback) callback({ success: false, message: 'Room not found' });
				}
			});
		});

		GameRoomSocketServer.instance = this;
	}

	static getInstance(httpServer) {
		if (!GameRoomSocketServer.instance && httpServer) {
			new GameRoomSocketServer(httpServer);
      console.log('GameRoomSocketServer instance created');
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

}



