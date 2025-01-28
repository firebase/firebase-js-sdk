// sent in the first client message after establishing connection.
export interface LiveClientSetup {
  setup: {
    model: string;
    generation_config?: LiveGenerationConfig
  }
}

export interface LiveGenerationConfig {
  response_modalities: string[];
  speech_config: {
    voice_config: {
      prebuilt_voice_config: {
        voice_name: string;
      }
    }
  }
}

// response from the server after setup.
export interface LiveServerContent {
  serverContent: {
    // Defined if turn not complete
    modelTurn?: {
      parts: {
        inlineData: {
          mimeType: string,
          data: string
        }
      }[]
    };
    // Defined if turn complete
    turnComplete?: boolean
  };
}

// user input sent in real time.
export interface LiveClientRealtimeInput {
  mediaChunks: {
    mime_type: string;
    data: Uint8Array,
  }
}

export interface LiveClientContent {
  client_content: {
    turns: {
      role: string;
      parts: {
        text: string
      }[];
    }[];
    turn_complete: boolean;
  }
}