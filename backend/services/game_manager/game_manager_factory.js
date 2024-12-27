import { SinglePlayerGameManager } from "./single_player_game_manager.js";
export class GameRoomManagerFactory {
    static createGameRoomManager(gameMode, roomId, playerIds, gameState) {
        switch (gameMode) {
            case 'single':
                return new SinglePlayerGameManager(roomId, playerIds[0], gameState);
            case 'multi':
                return new MultiPlayerGameManager();
            default:
                throw new Error('Invalid game mode');
        }
    }
}