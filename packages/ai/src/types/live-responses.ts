import { Content, GenerativeContentBlob, Part } from './content';
import { LiveGenerationConfig, Tool, ToolConfig } from './requests';


/**
 * User input that is sent to the model.
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface _LiveClientContent {
  clientContent: {
    turns: [Content];
    turnComplete: boolean;
  };
}

/**
 * User input that is sent to the model in real time.
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface _LiveClientRealtimeInput {
  realtimeInput: {
    mediaChunks: GenerativeContentBlob[];
  };
}
/**
 * The first message in a Live session, used to configure generation options.
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface _LiveClientSetup {
  setup: {
    model: string;
    generationConfig?: LiveGenerationConfig;
    tools?: Tool[];
    toolConfig?: ToolConfig;
    systemInstruction?: string | Part | Content;
  };
}

