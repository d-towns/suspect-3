import OpenaiGameService from "../services/openai-game-service.js";
import OpenAIEloService from "../services/openai-elo.service.js";

export async function createAssistants() {
    await OpenaiGameService.createMultiPlayerGameMasterAssistant();
    await OpenAIEloService.createEloAssistant();
}

createAssistants();