import OpenaiGameService from "../services/openai-game-service.js";

export async function createAssistants() {
    await OpenaiGameService.createGameMasterAssistant();
    await OpenaiGameService.createGameStateManager();
}

createAssistants();