import express from "express";
import dotenv from 'dotenv'
import { usersRouter } from "./backend/routes/users.router.js";
import { gameRoomRouter } from "./backend/routes/game-room.router.js";
import { GameRoomSocketServer } from "./socket/io.js";
import { createServer } from "node:http";
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: './.env' })

const main = async () => {
    const app = express();
    const httpServer = createServer(app);
    app.use(express.json());
    
    // Serve static files
    app.use(express.static(path.join(__dirname, 'frontend')));

    // Serve HTML files based on their names
    app.get('/:page', (req, res, next) => {
        const pageName = req.params.page;
        const filePath = path.join(__dirname, 'frontend', `${pageName}.html`);
        
        res.sendFile(filePath, (err) => {
            if (err) {
                next(); // Pass to the next middleware if file doesn't exist
            }
        });
    });
    // Serve lobby.html for the /lobby/:roomId route
    app.get('/lobby/:roomId', (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend', 'lobby.html'));
    });

    // Serve index.html for the root route
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
    });

    // 404 handler for any unmatched routes
    // API routes
    app.use('/api/users', usersRouter);
    app.use('/api/games', gameRoomRouter);
    // Ping route to check if the server is running, return pong and ms of ping time
    app.get('/api/ping', (req, res) => {
        const pingTime = Date.now() - Number(req.headers['x-ping-time']);
        console.log(`Ping time: ${pingTime}ms`, req.headers);
        res.send(`pong ${pingTime}ms`);
    });

    // // Initialize socket server
    const gameServer = GameRoomSocketServer.getInstance(httpServer);
    

    httpServer.listen(5000, () => {
        console.log('Server is running on port 3000');
    });

    

}

main();


