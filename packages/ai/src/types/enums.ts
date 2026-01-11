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
 * @public
 */
export type Role = (typeof POSSIBLE_ROLES)[number];

/**
 * Possible roles.
 * @public
 */
export const POSSIBLE_ROLES = ['user', 'model', 'function', 'system'] as const;

/**
 * Harm categories that would cause prompts or candidates to be blocked.
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
 * @public
 */
export type HarmCategory = (typeof HarmCategory)[keyof typeof HarmCategory];

/**
 * Threshold above which a prompt or candidate will be blocked.
 * @public
 */
export const HarmBlockThreshold = {
  /**
   * Content with `NEGLIGIBLE` will be allowed.
   */
  BLOCK_LOW_AND_ABOVE: 'BLOCK_LOW_AND_ABOVE',
  /**
   * Content with `NEGLIGIBLE` and `LOW` will be allowed.
   */
  BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
  /**
   * Content with `NEGLIGIBLE`, `LOW`, and `MEDIUM` will be allowed.
   */
  BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
  /**
   * All content will be allowed.
   */
  BLOCK_NONE: 'BLOCK_NONE',
  /**
   * All content will be allowed. This is the same as `BLOCK_NONE`, but the metadata corresponding
   * to the {@link (HarmCategory:type)} will not be present in the response.
   */
  OFF: 'OFF'
} as const;

/**
 * Threshold above which a prompt or candidate will be blocked.
 * @public
 */
export type HarmBlockThreshold =
  (typeof HarmBlockThreshold)[keyof typeof HarmBlockThreshold];

/**
 * This property is not supported in the Gemini Developer API ({@link GoogleAIBackend}).
 *
 * @public
 */
export const HarmBlockMethod = {
  /**
   * The harm block method uses both probability and severity scores.
   */
  SEVERITY: 'SEVERITY',
  /**
   * The harm block method uses the probability score.
   */
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
 * @public
 */
export const HarmProbability = {
  /**
   * Content has a negligible chance of being unsafe.
   */
  NEGLIGIBLE: 'NEGLIGIBLE',
  /**
   * Content has a low chance of being unsafe.
   */
  LOW: 'LOW',
  /**
   * Content has a medium chance of being unsafe.
   */
  MEDIUM: 'MEDIUM',
  /**
   * Content has a high chance of being unsafe.
   */
  HIGH: 'HIGH'
} as const;

/**
 * Probability that a prompt or candidate matches a harm category.
 * @public
 */
export type HarmProbability =
  (typeof HarmProbability)[keyof typeof HarmProbability];

/**
 * Harm severity levels.
 * @public
 */
export const HarmSeverity = {
  /**
   * Negligible level of harm severity.
   */
  HARM_SEVERITY_NEGLIGIBLE: 'HARM_SEVERITY_NEGLIGIBLE',
  /**
   * Low level of harm severity.
   */
  HARM_SEVERITY_LOW: 'HARM_SEVERITY_LOW',
  /**
   * Medium level of harm severity.
   */
  HARM_SEVERITY_MEDIUM: 'HARM_SEVERITY_MEDIUM',
  /**
   * High level of harm severity.
   */
  HARM_SEVERITY_HIGH: 'HARM_SEVERITY_HIGH',
  /**
   * Harm severity is not supported.
   *
   * @remarks
   * The GoogleAI backend does not support `HarmSeverity`, so this value is used as a fallback.
   */
  HARM_SEVERITY_UNSUPPORTED: 'HARM_SEVERITY_UNSUPPORTED'
} as const;

/**
 * Harm severity levels.
 * @public
 */
export type HarmSeverity = (typeof HarmSeverity)[keyof typeof HarmSeverity];

/**
 * Reason that a prompt was blocked.
 * @public
 */
export const BlockReason = {
  /**
   * Content was blocked by safety settings.
   */
  SAFETY: 'SAFETY',
  /**
   * Content was blocked, but the reason is uncategorized.
   */
  OTHER: 'OTHER',
  /**
   * Content was blocked because it contained terms from the terminology blocklist.
   */
  BLOCKLIST: 'BLOCKLIST',
  /**
   * Content was blocked due to prohibited content.
   */
  PROHIBITED_CONTENT: 'PROHIBITED_CONTENT'
} as const;

/**
 * Reason that a prompt was blocked.
 * @public
 */
export type BlockReason = (typeof BlockReason)[keyof typeof BlockReason];

/**
 * Reason that a candidate finished.
 * @public
 */
export const FinishReason = {
  /**
   * Natural stop point of the model or provided stop sequence.
   */
  STOP: 'STOP',
  /**
   * The maximum number of tokens as specified in the request was reached.
   */
  MAX_TOKENS: 'MAX_TOKENS',
  /**
   * The candidate content was flagged for safety reasons.
   */
  SAFETY: 'SAFETY',
  /**
   * The candidate content was flagged for recitation reasons.
   */
  RECITATION: 'RECITATION',
  /**
   * Unknown reason.
   */
  OTHER: 'OTHER',
  /**
   * The candidate content contained forbidden terms.
   */
  BLOCKLIST: 'BLOCKLIST',
  /**
   * The candidate content potentially contained prohibited content.
   */
  PROHIBITED_CONTENT: 'PROHIBITED_CONTENT',
  /**
   * The candidate content potentially contained Sensitive Personally Identifiable Information (SPII).
   */
  SPII: 'SPII',
  /**
   * The function call generated by the model was invalid.
   */
  MALFORMED_FUNCTION_CALL: 'MALFORMED_FUNCTION_CALL',
  /**
   * Image generation stopped due to safety settings.
   */
  IMAGE_SAFETY: 'IMAGE_SAFETY',
  /**
   * Image generation stopped because generated images has other prohibited
   * content.
   */
  IMAGE_PROHIBITED_CONTENT: 'IMAGE_PROHIBITED_CONTENT',
  /**
   * Image generation stopped due to recitation.
   */
  IMAGE_RECITATION: 'IMAGE_RECITATION',
  /**
   * Image generation stopped because of other miscellaneous issue.
   */
  IMAGE_OTHER: 'IMAGE_OTHER',
  /**
   * The model was expected to generate an image, but none was generated.
   */
  NO_IMAGE: 'NO_IMAGE'
} as const;

/**
 * Reason that a candidate finished.
 * @public
 */
export type FinishReason = (typeof FinishReason)[keyof typeof FinishReason];

/**
 * @public
 */
export const FunctionCallingMode = {
  /**
   * Default model behavior; model decides to predict either a function call
   * or a natural language response.
   */
  AUTO: 'AUTO',
  /**
   * Model is constrained to always predicting a function call only.
   * If `allowed_function_names` is set, the predicted function call will be
   * limited to any one of `allowed_function_names`, else the predicted
   * function call will be any one of the provided `function_declarations`.
   */
  ANY: 'ANY',
  /**
   * Model will not predict any function call. Model behavior is same as when
   * not passing any function declarations.
   */
  NONE: 'NONE'
} as const;

/**
 * @public
 */
export type FunctionCallingMode =
  (typeof FunctionCallingMode)[keyof typeof FunctionCallingMode];

/**
 * Content part modality.
 * @public
 */
export const Modality = {
  /**
   * Unspecified modality.
   */
  MODALITY_UNSPECIFIED: 'MODALITY_UNSPECIFIED',
  /**
   * Plain text.
   */
  TEXT: 'TEXT',
  /**
   * Image.
   */
  IMAGE: 'IMAGE',
  /**
   * Video.
   */
  VIDEO: 'VIDEO',
  /**
   * Audio.
   */
  AUDIO: 'AUDIO',
  /**
   * Document (for example, PDF).
   */
  DOCUMENT: 'DOCUMENT'
} as const;

/**
 * Content part modality.
 * @public
 */
export type Modality = (typeof Modality)[keyof typeof Modality];

/**
 * Generation modalities to be returned in generation responses.
 *
 * @beta
 */
export const ResponseModality = {
  /**
   * Text.
   * @beta
   */
  TEXT: 'TEXT',
  /**
   * Image.
   * @beta
   */
  IMAGE: 'IMAGE',
  /**
   * Audio.
   * @beta
   */
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
 * Indicates whether inference happened on-device or in-cloud.
 *
 * @beta
 */
export const InferenceSource = {
  'ON_DEVICE': 'on_device',
  'IN_CLOUD': 'in_cloud'
} as const;

/**
 * Indicates whether inference happened on-device or in-cloud.
 *
 * @beta
 */
export type InferenceSource =
  (typeof InferenceSource)[keyof typeof InferenceSource];

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

/**
 * Aspect ratios for generated images.
 * @public
 */
export const AspectRatio = {
  /**
   * Square (1:1) aspect ratio.
   */
  'SQUARE_1x1': '1:1',
  /**
   * Portrait (2:3) aspect ratio.
   */
  'PORTRAIT_2x3': '2:3',
  /**
   * Landscape (3:2) aspect ratio.
   */
  'LANDSCAPE_3x2': '3:2',
  /**
   * Portrait (3:4) aspect ratio.
   */
  'PORTRAIT_3x4': '3:4',
  /**
   * Landscape (4:3) aspect ratio.
   */
  'LANDSCAPE_4x3': '4:3',
  /**
   * Portrait (4:5) aspect ratio.
   */
  'PORTRAIT_4x5': '4:5',
  /**
   * Landscape (5:4) aspect ratio.
   */
  'LANDSCAPE_5x4': '5:4',
  /**
   * Portrait (9:16) aspect ratio.
   */
  'PORTRAIT_9x16': '9:16',
  /**
   * Landscape (16:9) aspect ratio.
   */
  'LANDSCAPE_16x9': '16:9',
  /**
   * Landscape (21:9) aspect ratio.
   */
  'LANDSCAPE_21x9': '21:9'
} as const;

/**
 * Aspect ratios for generated images.
 * @public
 */
export type AspectRatio = (typeof AspectRatio)[keyof typeof AspectRatio];

/**
 * Specifies the size of generated images.
 * @public
 */
export const ImageSize = {
  'SIZE_1K': '1K',
  'SIZE_2K': '2K',
  'SIZE_4K': '4K',
} as const;

/**
 * Specifies the size of generated images.
 * @public
 */
export type ImageSize = (typeof ImageSize)[keyof typeof ImageSize];
