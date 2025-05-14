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
export enum Availability {
  'unavailable' = 'unavailable',
  'downloadable' = 'downloadable',
  'downloading' = 'downloading',
  'available' = 'available'
}
export interface LanguageModelCreateCoreOptions {
  topK?: number;
  temperature?: number;
  expectedInputs?: LanguageModelExpectedInput[];
}
export interface LanguageModelCreateOptions
  extends LanguageModelCreateCoreOptions {
  signal?: AbortSignal;
  systemPrompt?: string;
  initialPrompts?: LanguageModelInitialPrompts;
}
export interface LanguageModelPromptOptions {
  responseConstraint?: object;
  // TODO: Restore AbortSignal once the API is defined.
}
export interface LanguageModelExpectedInput {
  type: LanguageModelMessageType;
  languages?: string[];
}
// TODO: revert to type from Prompt API explainer once it's supported.
export type LanguageModelPrompt = LanguageModelMessageContent[];
export type LanguageModelInitialPrompts =
  | LanguageModelMessage[]
  | LanguageModelMessageShorthand[];
export interface LanguageModelMessage {
  role: LanguageModelMessageRole;
  content: LanguageModelMessageContent[];
}
export interface LanguageModelMessageShorthand {
  role: LanguageModelMessageRole;
  content: string;
}
export interface LanguageModelMessageContent {
  type: LanguageModelMessageType;
  content: LanguageModelMessageContentValue;
}
export type LanguageModelMessageRole = 'system' | 'user' | 'assistant';
export type LanguageModelMessageType = 'text' | 'image' | 'audio';
export type LanguageModelMessageContentValue =
  | ImageBitmapSource
  | AudioBuffer
  | BufferSource
  | string;
