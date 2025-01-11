import Replicate from "replicate";
import dotenv from "dotenv";
import LLMImageService from "./llm_image.service.js";
import fs from "fs";

dotenv.config({ path: "../../../.env" });

export const ImageModels = {
    Flux : "black-forest-labs/flux-1.1-pro-ultra",
}

export default class ReplicateImageService extends LLMImageService {
  constructor() {
    super();
    this.client = new Replicate({
      auth: process.env.REPLICATE_API_KEY,
    });
  }

async createImage(prompt, aspect_ratio) {
    try {
        if (!prompt) {
            throw new Error("prompt is required.");
        }

        const input = {
            raw: false,
            prompt,
            aspect_ratio: aspect_ratio || "1:1",
            output_format: "png",
            safety_tolerance: 6,
            image_prompt_strength: 0.1,
        };

        const output = await this.client.run(ImageModels.Flux, { input });
        // turn output, a readable stream, into a buffer that can be saved as a file

        const chunks = [];
        for await (const chunk of output) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        return buffer;
    } catch (error) {
        console.log(error);
    }
}
}
