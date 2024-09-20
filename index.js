import express from "express";
import dotenv from 'dotenv'
import { usersRouter } from "./routes/users.router.js";
import { gameRoomRouter } from "./routes/game-room.router.js";
import { GameRoomSocketServer } from "./socket/io.js";

dotenv.config()



const main = async () => {
    const app = express();
    app.use(express.json());


    app.use('/api/users', usersRouter)
    app.use('/api/game-room', gameRoomRouter)
    const gameServer = GameRoomSocketServer.getInstance(app);
    gameServer.initServer();

}


main();

export { app };





