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
/**
 * The subset of the Prompt API
 * (see {@link https://github.com/webmachinelearning/prompt-api#full-api-surface-in-web-idl })
 * required for hybrid functionality.
 * 
 * @public
 */
export interface LanguageModel extends EventTarget {
  create(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
  availability(options?: LanguageModelCreateCoreOptions): Promise<Availability>;
  prompt(
    input: LanguageModelPrompt,
    options?: LanguageModelPromptOptions
  ): Promise<string>;
  promptStreaming(
    input: LanguageModelPrompt,
    options?: LanguageModelPromptOptions
  ): ReadableStream;
  measureInputUsage(
    input: LanguageModelPrompt,
    options?: LanguageModelPromptOptions
  ): Promise<number>;
  destroy(): undefined;
}

/**
 * @public
 */
export enum Availability {
  'unavailable' = 'unavailable',
  'downloadable' = 'downloadable',
  'downloading' = 'downloading',
  'available' = 'available'
}

/**
 * @public
 */
export interface LanguageModelCreateCoreOptions {
  topK?: number;
  temperature?: number;
  expectedInputs?: LanguageModelExpected[];
}

/**
 * @public
 */
export interface LanguageModelCreateOptions
  extends LanguageModelCreateCoreOptions {
  signal?: AbortSignal;
  initialPrompts?: LanguageModelMessage[];
}

/**
 * @public
 */
export interface LanguageModelPromptOptions {
  responseConstraint?: object;
  // TODO: Restore AbortSignal once the API is defined.
}

/**
 * @public
 */export interface LanguageModelExpected {
  type: LanguageModelMessageType;
  languages?: string[];
}

/**
 * @public
 */
export type LanguageModelPrompt = LanguageModelMessage[];

/**
 * @public
 */
export interface LanguageModelMessage {
  role: LanguageModelMessageRole;
  content: LanguageModelMessageContent[];
}

/**
 * @public
 */
export interface LanguageModelMessageContent {
  type: LanguageModelMessageType;
  value: LanguageModelMessageContentValue;
}

/**
 * @public
 */
export type LanguageModelMessageRole = 'system' | 'user' | 'assistant';

/**
 * @public
 */
export type LanguageModelMessageType = 'text' | 'image' | 'audio';

/**
 * @public
 */
export type LanguageModelMessageContentValue =
  | ImageBitmapSource
  | AudioBuffer
  | BufferSource
  | string;
