/**
 * @license
 * Copyright 2024 Google LLC
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
 * Role is the producer of the content.
 *
 * @remarks
 * <b>user:</b> The user is the one making the request.
 * <br/>
 * <b>model:</b> The model is the one generating the response.
 * <br/>
 * <b>function:</b> The role for a response from a function call.
 * <br/>
 * <b>system:</b> The role for a system instruction.
 *
 * @public
 */
export type Role = (typeof POSSIBLE_ROLES)[number];

/**
 * Possible roles.
 *
 * @remarks
 * <b>user:</b> The user is the one making the request.
 * <br/>
 * <b>model:</b> The model is the one generating the response.
 * <br/>
 * <b>function:</b> The role for a response from a function call.
 * <br/>
 * <b>system:</b> The role for a system instruction.
 *
 * @public
 */
export const POSSIBLE_ROLES = ['user', 'model', 'function', 'system'] as const;

/**
 * Harm categories that would cause prompts or candidates to be blocked.
 *
 * @remarks
 * <b>HARM_CATEGORY_HATE_SPEECH:</b> Category for hate speech.
 * <br/>
 * <b>HARM_CATEGORY_SEXUALLY_EXPLICIT:</b> Category for sexually explicit content.
 * <br/>
 * <b>HARM_CATEGORY_HARASSMENT:</b> Category for harassment.
 * <br/>
 * <b>HARM_CATEGORY_DANGEROUS_CONTENT:</b> Category for dangerous content.
 *
 * @public
 */
export const HarmCategory = {
  HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
  HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
  HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT'
} as const;

/**
 * Harm categories that would cause prompts or candidates to be blocked.
 *
 * @public
 */
export type HarmCategory = (typeof HarmCategory)[keyof typeof HarmCategory];

/**
 * Threshold above which a prompt or candidate will be blocked.
 *
 * @remarks
 * <b>BLOCK_LOW_AND_ABOVE:</b> Content with `NEGLIGIBLE` will be allowed.
 * <br/>
 * <b>BLOCK_MEDIUM_AND_ABOVE:</b> Content with `NEGLIGIBLE` and `LOW` will be allowed.
 * <br/>
 * <b>BLOCK_ONLY_HIGH:</b> Content with `NEGLIGIBLE`, `LOW`, and `MEDIUM` will be allowed.
 * <br/>
 * <b>BLOCK_NONE:</b> All content will be allowed.
 * <br/>
 * <b>OFF:</b> All content will be allowed. This is the same as `BLOCK_NONE`, but the metadata corresponding
 * to the `HarmCategory` will not be present in the response.
 *
 * @public
 */
export const HarmBlockThreshold = {
  BLOCK_LOW_AND_ABOVE: 'BLOCK_LOW_AND_ABOVE',
  BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
  BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
  BLOCK_NONE: 'BLOCK_NONE',
  OFF: 'OFF'
} as const;

/**
 * Threshold above which a prompt or candidate will be blocked.
 *
 * @public
 */
export type HarmBlockThreshold =
  (typeof HarmBlockThreshold)[keyof typeof HarmBlockThreshold];

/**
 * This property is not supported in the Gemini Developer API ({@link GoogleAIBackend}).
 *
 * @remarks
 * <b>SEVERITY:</b> The harm block method uses both probability and severity scores.
 * <br/>
 * <b>PROBABILITY:</b> The harm block method uses the probability score.
 *
 * @public
 */
export const HarmBlockMethod = {
  SEVERITY: 'SEVERITY',
  PROBABILITY: 'PROBABILITY'
} as const;

/**
 * This property is not supported in the Gemini Developer API ({@link GoogleAIBackend}).
 *
 * @public
 */
export type HarmBlockMethod =
  (typeof HarmBlockMethod)[keyof typeof HarmBlockMethod];

/**
 * Probability that a prompt or candidate matches a harm category.
 *
 * @remarks
 * <b>NEGLIGIBLE:</b> Content has a negligible chance of being unsafe.
 * <br/>
 * <b>LOW:</b> Content has a low chance of being unsafe.
 * <br/>
 * <b>MEDIUM:</b> Content has a medium chance of being unsafe.
 * <br/>
 * <b>HIGH:</b> Content has a high chance of being unsafe.
 *
 * @public
 */
export const HarmProbability = {
  NEGLIGIBLE: 'NEGLIGIBLE',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
} as const;

/**
 * Probability that a prompt or candidate matches a harm category.
 *
 * @public
 */
export type HarmProbability =
  (typeof HarmProbability)[keyof typeof HarmProbability];

/**
 * Harm severity levels.
 *
 * @remarks
 * <b>HARM_SEVERITY_NEGLIGIBLE:</b> Negligible level of harm severity.
 * <br/>
 * <b>HARM_SEVERITY_LOW:</b> Low level of harm severity.
 * <br/>
 * <b>HARM_SEVERITY_MEDIUM:</b> Medium level of harm severity.
 * <br/>
 * <b>HARM_SEVERITY_HIGH:</b> High level of harm severity.
 * <br/>
 * <b>HARM_SEVERITY_UNSUPPORTED:</b> Harm severity is not supported. The GoogleAI backend does not support `HarmSeverity`, so this value is used as a fallback.
 *
 * @public
 */
export const HarmSeverity = {
  HARM_SEVERITY_NEGLIGIBLE: 'HARM_SEVERITY_NEGLIGIBLE',
  HARM_SEVERITY_LOW: 'HARM_SEVERITY_LOW',
  HARM_SEVERITY_MEDIUM: 'HARM_SEVERITY_MEDIUM',
  HARM_SEVERITY_HIGH: 'HARM_SEVERITY_HIGH',
  HARM_SEVERITY_UNSUPPORTED: 'HARM_SEVERITY_UNSUPPORTED'
} as const;

/**
 * Harm severity levels.
 *
 * @public
 */
export type HarmSeverity = (typeof HarmSeverity)[keyof typeof HarmSeverity];

/**
 * Reason that a prompt was blocked.
 *
 * @remarks
 * <b>SAFETY:</b> Content was blocked by safety settings.
 * <br/>
 * <b>OTHER:</b> Content was blocked, but the reason is uncategorized.
 * <br/>
 * <b>BLOCKLIST:</b> Content was blocked because it contained terms from the terminology blocklist.
 * <br/>
 * <b>PROHIBITED_CONTENT:</b> Content was blocked due to prohibited content.
 *
 * @public
 */
export const BlockReason = {
  SAFETY: 'SAFETY',
  OTHER: 'OTHER',
  BLOCKLIST: 'BLOCKLIST',
  PROHIBITED_CONTENT: 'PROHIBITED_CONTENT'
} as const;

/**
 * Reason that a prompt was blocked.
 *
 * @public
 */
export type BlockReason = (typeof BlockReason)[keyof typeof BlockReason];

/**
 * Reason that a candidate finished.
 *
 * @remarks
 * <b>STOP:</b> Natural stop point of the model or provided stop sequence.
 * <br/>
 * <b>MAX_TOKENS:</b> The maximum number of tokens as specified in the request was reached.
 * <br/>
 * <b>SAFETY:</b> The candidate content was flagged for safety reasons.
 * <br/>
 * <b>RECITATION:</b> The candidate content was flagged for recitation reasons.
 * <br/>
 * <b>OTHER:</b> Unknown reason.
 * <br/>
 * <b>BLOCKLIST:</b> The candidate content contained forbidden terms.
 * <br/>
 * <b>PROHIBITED_CONTENT:</b> The candidate content potentially contained prohibited content.
 * <br/>
 * <b>SPII:</b> The candidate content potentially contained Sensitive Personally Identifiable Information (SPII).
 * <br/>
 * <b>MALFORMED_FUNCTION_CALL:</b> The function call generated by the model was invalid.
 *
 * @public
 */
export const FinishReason = {
  STOP: 'STOP',
  MAX_TOKENS: 'MAX_TOKENS',
  SAFETY: 'SAFETY',
  RECITATION: 'RECITATION',
  OTHER: 'OTHER',
  BLOCKLIST: 'BLOCKLIST',
  PROHIBITED_CONTENT: 'PROHIBITED_CONTENT',
  SPII: 'SPII',
  MALFORMED_FUNCTION_CALL: 'MALFORMED_FUNCTION_CALL'
} as const;

/**
 * Reason that a candidate finished.
 *
 * @public
 */
export type FinishReason = (typeof FinishReason)[keyof typeof FinishReason];

/**
 * @remarks
 * - AUTO: Default model behavior; model decides to predict either a function call
 * or a natural language response.
 * - <b>ANY:</b> Model is constrained to always predicting a function call only.
 * If `allowed_function_names` is set, the predicted function call will be
 * limited to any one of `allowed_function_names`, else the predicted
 * function call will be any one of the provided `function_declarations`.
 * <br/>
 * <b>NONE:</b> Model will not predict any function call. Model behavior is same as when
 * not passing any function declarations.
 *
 * @public
 */
export const FunctionCallingMode = {
  AUTO: 'AUTO',
  ANY: 'ANY',
  NONE: 'NONE'
} as const;

/**
 * @public
 */
export type FunctionCallingMode =
  (typeof FunctionCallingMode)[keyof typeof FunctionCallingMode];

/**
 * Content part modality.
 *
 * @remarks
 * <b>MODALITY_UNSPECIFIED:</b> Unspecified modality.
 * <br/>
 * <b>TEXT:</b> Plain text.
 * <br/>
 * <b>IMAGE:</b> Image.
 * <br/>
 * <b>VIDEO:</b> Video.
 * <br/>
 * <b>AUDIO:</b> Audio.
 * <br/>
 * <b>DOCUMENT:</b> Document (for example, PDF).
 *
 * @public
 */
export const Modality = {
  MODALITY_UNSPECIFIED: 'MODALITY_UNSPECIFIED',
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  DOCUMENT: 'DOCUMENT'
} as const;

/**
 * Content part modality.
 *
 * @public
 */
export type Modality = (typeof Modality)[keyof typeof Modality];

/**
 * Generation modalities to be returned in generation responses.
 *
 * @remarks
 * <b>TEXT:</b> Text.
 * <br/>
 * <b>IMAGE:</b> Image.
 * <br/>
 * <b>AUDIO:</b> Audio.
 *
 * @beta
 */
export const ResponseModality = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  AUDIO: 'AUDIO'
} as const;

/**
 * Generation modalities to be returned in generation responses.
 *
 * @beta
 */
export type ResponseModality =
  (typeof ResponseModality)[keyof typeof ResponseModality];

/**
 * Determines whether inference happens on-device or in-cloud.
 *
 * @remarks
 * <b>PREFER_ON_DEVICE:</b> Attempt to make inference calls using an
 * on-device model. If on-device inference is not available, the SDK
 * will fall back to using a cloud-hosted model.
 * <br/>
 * <b>ONLY_ON_DEVICE:</b> Only attempt to make inference calls using an
 * on-device model. The SDK will not fall back to a cloud-hosted model.
 * If on-device inference is not available, inference methods will throw.
 * <br/>
 * <b>ONLY_IN_CLOUD:</b> Only attempt to make inference calls using a
 * cloud-hosted model. The SDK will not fall back to an on-device model.
 * <br/>
 * <b>PREFER_IN_CLOUD:</b> Attempt to make inference calls to a
 * cloud-hosted model. If not available, the SDK will fall back to an
 * on-device model.
 *
 * @beta
 */
export const InferenceMode = {
  'PREFER_ON_DEVICE': 'prefer_on_device',
  'ONLY_ON_DEVICE': 'only_on_device',
  'ONLY_IN_CLOUD': 'only_in_cloud',
  'PREFER_IN_CLOUD': 'prefer_in_cloud'
} as const;

/**
 * Determines whether inference happens on-device or in-cloud.
 *
 * @beta
 */
export type InferenceMode = (typeof InferenceMode)[keyof typeof InferenceMode];

/**
 * Represents the result of the code execution.
 *
 * @beta
 */
export const Outcome = {
  UNSPECIFIED: 'OUTCOME_UNSPECIFIED',
  OK: 'OUTCOME_OK',
  FAILED: 'OUTCOME_FAILED',
  DEADLINE_EXCEEDED: 'OUTCOME_DEADLINE_EXCEEDED'
};

/**
 * Represents the result of the code execution.
 *
 * @beta
 */
export type Outcome = (typeof Outcome)[keyof typeof Outcome];

/**
 * The programming language of the code.
 *
 * @beta
 */
export const Language = {
  UNSPECIFIED: 'LANGUAGE_UNSPECIFIED',
  PYTHON: 'PYTHON'
};

/**
 * The programming language of the code.
 *
 * @beta
 */
export type Language = (typeof Language)[keyof typeof Language];
