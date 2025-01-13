import express from "express";
import dotenv from 'dotenv'
import { usersRouter } from "./routes/users.router.js";
import { gameRoomRouter } from "./routes/game-room.router.js";
import { invitesRouter } from "./routes/invties.router.js";
import { leaderboardRouter } from "./routes/leaderboard.router.js";
import { GameRoomSocketServer } from "./socket/io.js";
import { createServer } from "node:http";
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: './.env' })

const main = async () => {
    const app = express();
    const httpServer = createServer(app);
    app.use(express.json());
    app.use(cors({
       origin : process.env.NODE_ENV === 'dev' ?  process.env.FRONTEND_URL : process.env.PROD_FRONTEND_URL,
        credentials: true
    }));



    // API routes
    app.use('/api/users', usersRouter);
    app.use('/api/games', gameRoomRouter);
    app.use('/api/invites', invitesRouter);
    app.use('/api/leaderboard', leaderboardRouter);
    // Ping route to check if the server is running, return pong and ms of ping time
    app.get('/api/ping', (req, res) => {
        const pingTime = Date.now() - Number(req.headers['x-ping-time']);
        console.log(`Ping time: ${pingTime}ms`, req.headers);
        res.send(`pong ${pingTime}ms`);
    });

    // // Initialize socket server
    const gameServer = GameRoomSocketServer.getInstance(httpServer);
    

    httpServer.listen(8000, () => {
        console.log('Server is running on port 8000');
    });

}

main();


