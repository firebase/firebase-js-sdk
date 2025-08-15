/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
