import { createMultiPlayerGameMasterAssistant, createSinglePlayerGameMasterAssistant } from "../utils/assistant_instructions.js";
import OpenAIEloService from "../services/llm/elo/openai-elo.service.js";

export async function createAssistants() {
    await createSinglePlayerGameMasterAssistant();
    await createMultiPlayerGameMasterAssistant();
    await OpenAIEloService.createEloAssistant();

}

createAssistants();