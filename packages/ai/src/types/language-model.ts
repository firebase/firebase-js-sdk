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
 * (see {@link https://github.com/webmachinelearning/prompt-api#full-api-surface-in-web-idl }
 * required for hybrid functionality.
 *
 * @internal
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
 * @internal
 */
export enum Availability {
  'UNAVAILABLE' = 'unavailable',
  'DOWNLOADABLE' = 'downloadable',
  'DOWNLOADING' = 'downloading',
  'AVAILABLE' = 'available'
}

/**
 * <b>(EXPERIMENTAL)</b>
 * Configures the creation of an on-device language model session.
 * @public
 */
export interface LanguageModelCreateCoreOptions {
  topK?: number;
  temperature?: number;
  expectedInputs?: LanguageModelExpected[];
}

/**
 * <b>(EXPERIMENTAL)</b>
 * Configures the creation of an on-device language model session.
 * @public
 */
export interface LanguageModelCreateOptions
  extends LanguageModelCreateCoreOptions {
  signal?: AbortSignal;
  initialPrompts?: LanguageModelMessage[];
}

/**
 * <b>(EXPERIMENTAL)</b>
 * Options for an on-device language model prompt.
 * @public
 */
export interface LanguageModelPromptOptions {
  responseConstraint?: object;
  // TODO: Restore AbortSignal once the API is defined.
}

/**
 * <b>(EXPERIMENTAL)</b>
 * Options for the expected inputs for an on-device language model.
 * @public
 */ export interface LanguageModelExpected {
  type: LanguageModelMessageType;
  languages?: string[];
}

/**
 * <b>(EXPERIMENTAL)</b>
 * An on-device language model prompt.
 * @public
 */
export type LanguageModelPrompt = LanguageModelMessage[];

/**
 * <b>(EXPERIMENTAL)</b>
 * An on-device language model message.
 * @public
 */
export interface LanguageModelMessage {
  role: LanguageModelMessageRole;
  content: LanguageModelMessageContent[];
}

/**
 * <b>(EXPERIMENTAL)</b>
 * An on-device language model content object.
 * @public
 */
export interface LanguageModelMessageContent {
  type: LanguageModelMessageType;
  value: LanguageModelMessageContentValue;
}

/**
 * <b>(EXPERIMENTAL)</b>
 * Allowable roles for on-device language model usage.
 * @public
 */
export type LanguageModelMessageRole = 'system' | 'user' | 'assistant';

/**
 * <b>(EXPERIMENTAL)</b>
 * Allowable types for on-device language model messages.
 * @public
 */
export type LanguageModelMessageType = 'text' | 'image' | 'audio';

/**
 * <b>(EXPERIMENTAL)</b>
 * Content formats that can be provided as on-device message content.
 * @public
 */
export type LanguageModelMessageContentValue =
  | ImageBitmapSource
  | AudioBuffer
  | BufferSource
  | string;
