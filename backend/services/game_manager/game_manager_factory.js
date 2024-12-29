import { SinglePlayerGameManager } from "./single_player_game_manager.js";
export class GameRoomManagerFactory {
    static createGameRoomManager(gameRoom, playerIds, gameState) {
        switch (gameRoom.mode) {
            case 'single':
                return new SinglePlayerGameManager(gameRoom, playerIds[0], gameState);
            case 'multi':
                return new MultiPlayerGameManager();
            default:
                throw new Error('Invalid game mode');
        }
    }
}