/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// AUTO-GENERATED CODE - DO NOT MODIFY BY HAND
// Generated from Firebase AI Interactions API OpenAPI specification.

/**
 * The agent to interact with.
 */
export const AgentOption = {
  DeepResearchProPreview122025: 'deep-research-pro-preview-12-2025',
  DeepResearchPreview042026: 'deep-research-preview-04-2026',
  DeepResearchMaxPreview042026: 'deep-research-max-preview-04-2026',
  AntigravityPreview052026: 'antigravity-preview-05-2026',
} as const;

export type AgentOption = (typeof AgentOption)[keyof typeof AgentOption] | (string & {});

/**
 * HarmCategory
 */
export const HarmCategory = {
  HateSpeech: 'hate_speech',
  DangerousContent: 'dangerous_content',
  Harassment: 'harassment',
  SexuallyExplicit: 'sexually_explicit',
  CivicIntegrity: 'civic_integrity',
  ImageHate: 'image_hate',
  ImageDangerousContent: 'image_dangerous_content',
  ImageHarassment: 'image_harassment',
  ImageSexuallyExplicit: 'image_sexually_explicit',
  Jailbreak: 'jailbreak',
} as const;

export type HarmCategory = (typeof HarmCategory)[keyof typeof HarmCategory];

/**
 * MediaResolution
 */
export const MediaResolution = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  UltraHigh: 'ultra_high',
} as const;

export type MediaResolution = (typeof MediaResolution)[keyof typeof MediaResolution];

/**
 * The model that will complete your prompt.\n\nSee [models](https://ai.google.dev/gemini-api/docs/models) for additional details.
 */
export const Model = {
  Gemini25Flash: 'gemini-2.5-flash',
  Gemini25Pro: 'gemini-2.5-pro',
  Gemma426bA4bIt: 'gemma-4-26b-a4b-it',
  Gemma431bIt: 'gemma-4-31b-it',
  GeminiFlashLatest: 'gemini-flash-latest',
  GeminiFlashLiteLatest: 'gemini-flash-lite-latest',
  GeminiProLatest: 'gemini-pro-latest',
  Gemini25FlashLite: 'gemini-2.5-flash-lite',
  Gemini25FlashImage: 'gemini-2.5-flash-image',
  Gemini3FlashPreview: 'gemini-3-flash-preview',
  Gemini31ProPreview: 'gemini-3.1-pro-preview',
  Gemini31ProPreviewCustomtools: 'gemini-3.1-pro-preview-customtools',
  Gemini31FlashLite: 'gemini-3.1-flash-lite',
  Gemini3ProImage: 'gemini-3-pro-image',
  NanoBananaProPreview: 'nano-banana-pro-preview',
  Gemini31FlashImage: 'gemini-3.1-flash-image',
  Gemini35Flash: 'gemini-3.5-flash',
  Gemini36Flash: 'gemini-3.6-flash',
  Gemini37Flash: 'gemini-3.7-flash',
  Lyria3ClipPreview: 'lyria-3-clip-preview',
  Lyria3ProPreview: 'lyria-3-pro-preview',
  GeminiRoboticsEr16Preview: 'gemini-robotics-er-1.6-preview',
  GeminiRoboticsEr2Preview: 'gemini-robotics-er-2-preview',
} as const;

export type Model = (typeof Model)[keyof typeof Model] | (string & {});

/**
 * ResponseModality
 */
export const ResponseModality = {
  Text: 'text',
  Image: 'image',
  Audio: 'audio',
  Video: 'video',
  Document: 'document',
} as const;

export type ResponseModality = (typeof ResponseModality)[keyof typeof ResponseModality];

/**
 * ServiceTier
 */
export const ServiceTier = {
  Flex: 'flex',
  Standard: 'standard',
  Priority: 'priority',
  Deferred: 'deferred',
} as const;

export type ServiceTier = (typeof ServiceTier)[keyof typeof ServiceTier];

/**
 * ThinkingLevel
 */
export const ThinkingLevel = {
  Minimal: 'minimal',
  Low: 'low',
  Medium: 'medium',
  High: 'high',
} as const;

export type ThinkingLevel = (typeof ThinkingLevel)[keyof typeof ThinkingLevel];

/**
 * ThinkingSummaries
 */
export const ThinkingSummaries = {
  Auto: 'auto',
  None: 'none',
} as const;

export type ThinkingSummaries = (typeof ThinkingSummaries)[keyof typeof ThinkingSummaries];



/**
 * The `Status` type defines a logical error model that is suitable for
different programming environments, including REST APIs and RPC APIs. It is
used by [gRPC](https://github.com/grpc). Each `Status` message contains
three pieces of data: error code, error message, and error details.

You can find out more about this error model and how to work with it in the
[API Design Guide](https://cloud.google.com/apis/design/errors).
 */
export interface Status {
  /**
   * The status code, which should be an enum value of google.rpc.Code.
   */
  code?: number;
  /**
   * A list of messages that carry the error details.  There is a common set of
message types for APIs to use.
   */
  details?: Record<string, unknown>[];
  /**
   * A developer-facing error message, which should be in English. Any
user-facing error message should be localized and sent in the
google.rpc.Status.details field, or localized by the client.
   */
  message?: string;
}

