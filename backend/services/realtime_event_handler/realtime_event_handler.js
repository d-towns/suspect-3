import fs from "fs";
import { convertAudioMessageDeltasToAudio } from "../utils/convertAudio.js";

export default class RealtimeEventHandler {
  constructor(ws, gameManager, responder) {
    super();
    this.ws = ws;
    this.gameManager = gameManager;
    this.responder = responder
    this.lastAudioMessageDeltas = [];
    this.lastAudioMessageTranscript = [];

    this.ws.on("message", async (data) => {
      this.handleMessage(data, responder);
    });
    this.ws.on("open", () => {
      this.handleOpen();
    });
    this.ws.on("disconnect", () => {
      this.handleDisconnect();
    });
  }

  handleOpen() {
    this.gameManager.emit("realtime-connected", {  });
  }

  handleDisconnect() {
    this.gameManager.emit("realtime-disconnected", {  });
  }

  async handleMessage(data, responder) {

    try {
      const event = JSON.parse(data);
      switch (event.type) {
        case "error":
          this.handleError(event);
          break;

        case "session.created":
          this.handleSessionCreated(event, responder);
          break;

        case "session.updated":
          this.handleSessionUpdated(event);
          break;

        case "conversation.item.input_audio_transcription.completed":
          await this.handleAudioTranscriptionCompleted(
            event,
            activeSuspect
          );
          break;

        case "response.audio.done":
          await this.handleResponseAudioDone(event);
          break;

        case "response.done":
          this.handleResponseDone(event);
          break;

        case "response.audio_transcript.done":
          await this.handleAudioTranscriptDone(event, activeSuspect);
          break;

        case "response.audio.delta":
          this.audioDeltaListener(event);
          break;

        case "response.audio_transcript.delta":
          this.audioTranscriptDetlaListener(event);
          break;

        default:
          console.warn("Unhandled event type:", event.type);
          break;
      }
    } catch (e) {
      console.error("Error handling realtime message:", e);
    }
  }

  handleError(event) {
    console.error("Error from OpenAI Realtime API:", event);
  }

  handleSessionCreated(event, responder) {
    const session = event.session;
    session.instructions = this.gameManager.realtimeInstructions;
    session.input_audio_transcription = { model: "whisper-1" };
    session.voice = this.gameManager.assignVoiceToSuspect(responder);
    session.turn_detection = null;
    delete session.id;
    delete session.object;
    delete session.expires_at;
    delete session.client_secret;
    this.ws.send(JSON.stringify({ type: "session.update", session }));
  }

  handleSessionUpdated(event) {
    console.log("Session updated:", event);
  }

  async handleAudioTranscriptionCompleted(event) {
    console.log("Audio transcription completed", event.transcript);
    this.lastAudioMessageDeltas = [];

    const playerConversationItem = {
      audioTranscript: event.transcript,
      speaker: "user",
      currentRoundTime: this.gameManager.roundTimer,
    };

    await this.gameManager.llmGameService.addMessageToThread(this.gameManager.theadId, {
      role: "user",
      content: `Detective: ${event.transcript}`,
    });

    this.gameManager.emit("user-audio-transcript", playerConversationItem);

    this.ws.send(JSON.stringify({ type: "response.create" }));
  }

  async handleResponseAudioDone(event) {
    console.log("Audio response received from OpenAI Realtime API");
    const audioBuffer = await convertAudioMessageDeltasToAudio([
      ...this.lastAudioMessageDeltas
    ]);
    const audioTranscript =  this.lastAudioMessageTranscript.join(" ")
    const conversationItem = {
      audioBuffer,
      audioTranscript
    };
    fs.writeFileSync(
      `./test_response_data/${event.response_id}_audio`,
      audioBuffer
    );
    fs.writeFileSync(
      `./test_response_data/${event.response_id}_audio_transcript.txt`,
      audioTranscript
    );
    this.gameManager.emit(
      "realtime-audio-message",
      conversationItem
    );
    this.lastAudioMessageDeltas = [];
    this.lastAudioMessageTranscript = [];
  }

  handleResponseDone(event) {
    console.log("Response done:", event);
    if (event.response.status_details?.type === "failed") {
      console.error(
        "Response failed:",
        JSON.stringify(event.response.status_details.error)
      );
    }
  }



  async handleAudioTranscriptDone(event, activeSuspect) {
    const interrogatorTranscript = event.transcript;
    await this.gameManager.llmGameService.addMessageToThread(this.gameManager.threadId, {
      role: "assistant",
      content: `${activeSuspect.name}: ${interrogatorTranscript}`,
    });
    console.log("Added assistant transcript to game thread");
  }

  audioDeltaListener(event) {
    console.log("Realtime audio delta received");
    this.gameManager.emit("realtime-audio-delta", {
      audio: base64ToPCM(event.delta),
      speaker: "assistant",
      currentRoundTime:
        this.gameManager.roundTimer,
    });
  }

  audioTranscriptDetlaListener(event) {
    console.log("Realtime audio transcript delta received");
    this.gameManager.emit("realtime-audio-transcript-delta", {
      transcript: event.delta,
      speaker: "assistant",
      currentRoundTime: this.gameManager.roun,
    });
  }

  addCustomMessageListener(callback) {
    this.ws.on("message", callback);
  }

  removeCustomMessageListener(callback) {
    this.ws.off("message", callback);
  }

  sendMessage(message) {
    this.ws.send(JSON.stringify(message));
  }

    /**
   * Adds audio to the input buffer.
   * @param {ArrayBuffer} audio
   * @returns {Promise<any>}
   */
    async addAudioToInputBuffer(audio) {
      try {
        if (!this.ws) {
          console.error("addAudioToInputBuffer error: websocket is required.");
          return null;
        }
        if (!audio) {
          console.error("addAudioToInputBuffer error: audio is required.");
          return null;
        }
        this.ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio }));
        return { status: "audio_appended" };
      } catch (error) {
        console.error("Error in addAudioToInputBuffer:", error);
        return null;
      }
    }

      /**
   * TODO: this may not be needed once we are using turn detection
   * Commits the audio buffer to produce a response.
   * @returns {Promise<any>}
   */
  async createRealtimeResponse() {
    try {
      if (!this.ws) {
        console.error("createRealtimeResponse error: no connection found.");
        return null;
      }
      this.ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      return { status: "response_created" };
    } catch (error) {
      console.error("Error in createRealtimeResponse:", error);
      return null;
    }
  }

    /**
   * Closes a real-time conversation by closing the provided WebSocket connection.
   *
   * @param {WebSocket} ws - The WebSocket connection to be closed.
   * @returns {{ status: 'realtime-closed' } | null} An object with a status message if the WebSocket is successfully closed, or null if an error occurs or the WebSocket is not provided.
   */
    closeRealtimeConversation() {
      try {
        if (!this.ws) {
          console.error(
            "closeRealtimeConversation error: websocket is required."
          );
          return null;
        }
        this.ws.close();
        return { status: "realtime_closed" };
      } catch (error) {
        console.error("Error sin closeRealtimeConversation:", error);
        return null;
      }
    }
  
}
