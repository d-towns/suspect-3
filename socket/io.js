import { app as expressApp } from "../index.js";
import { createServer } from "node:http";
import { Server } from "socket.io";


// build a module that will initialize the socket and return the io object for use in other parts of the application
// GameRoomService.js



export class GameRoomSocketServer  {
	static instance = null;

	constructor(httpServer) {
		if (GameRoomServer.instance) {
			return GameRoomServer.instance;
		}

		this.io = new Server(httpServer);
		this.io.on("connection", (socket) => {
			console.log("a user connected");
			// Add more connection handling logic here
		});

		GameRoomServer.instance = this;
	}

	static getInstance(httpServer) {
		if (!GameRoomServer.instance) {
			new GameRoomServer(httpServer);
		}
		return GameRoomServer.instance;
	}

	emit(event, data) {
		this.io.emit(event, data);
	}

	on(event, callback) {
		this.io.on(event, callback);
	}

	close() {
		this.io.close();
	}

	initServer(port = 3000) {
		this.io.listen(port);
		console.log(`Socket.IO server listening on port ${port}`);
	}
}



