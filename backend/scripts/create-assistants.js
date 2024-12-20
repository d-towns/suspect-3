import OpenaiGameService from "../services/openai-game-service.js";
import OpenAIEloService from "../services/openai-elo.service.js";

export async function createAssistants() {
    await OpenaiGameService.createMultiPlayerGameMasterAssistant();
    await OpenaiGameService.createSinglePlayerGameMasterAssistant();
    await OpenAIEloService.createEloAssistant();

}

createAssistants();