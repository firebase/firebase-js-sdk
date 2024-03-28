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
export const POSSIBLE_ROLES = ['user', 'model', 'function'] as const;

/**
 * Harm categories that would cause prompts or candidates to be blocked.
 * @public
 */
export enum HarmCategory {
  HARM_CATEGORY_UNSPECIFIED = 'HARM_CATEGORY_UNSPECIFIED',
  HARM_CATEGORY_HATE_SPEECH = 'HARM_CATEGORY_HATE_SPEECH',
  HARM_CATEGORY_SEXUALLY_EXPLICIT = 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  HARM_CATEGORY_HARASSMENT = 'HARM_CATEGORY_HARASSMENT',
  HARM_CATEGORY_DANGEROUS_CONTENT = 'HARM_CATEGORY_DANGEROUS_CONTENT'
}

/**
 * Threshold above which a prompt or candidate will be blocked.
 * @public
 */
export enum HarmBlockThreshold {
  // Threshold is unspecified.
  HARM_BLOCK_THRESHOLD_UNSPECIFIED = 'HARM_BLOCK_THRESHOLD_UNSPECIFIED',
  // Content with NEGLIGIBLE will be allowed.
  BLOCK_LOW_AND_ABOVE = 'BLOCK_LOW_AND_ABOVE',
  // Content with NEGLIGIBLE and LOW will be allowed.
  BLOCK_MEDIUM_AND_ABOVE = 'BLOCK_MEDIUM_AND_ABOVE',
  // Content with NEGLIGIBLE, LOW, and MEDIUM will be allowed.
  BLOCK_ONLY_HIGH = 'BLOCK_ONLY_HIGH',
  // All content will be allowed.
  BLOCK_NONE = 'BLOCK_NONE'
}

/**
 * Probability that a prompt or candidate matches a harm category.
 * @public
 */
export enum HarmProbability {
  // Probability is unspecified.
  HARM_PROBABILITY_UNSPECIFIED = 'HARM_PROBABILITY_UNSPECIFIED',
  // Content has a negligible chance of being unsafe.
  NEGLIGIBLE = 'NEGLIGIBLE',
  // Content has a low chance of being unsafe.
  LOW = 'LOW',
  // Content has a medium chance of being unsafe.
  MEDIUM = 'MEDIUM',
  // Content has a high chance of being unsafe.
  HIGH = 'HIGH'
}

/**
 * Reason that a prompt was blocked.
 * @public
 */
export enum BlockReason {
  // A blocked reason was not specified.
  BLOCKED_REASON_UNSPECIFIED = 'BLOCKED_REASON_UNSPECIFIED',
  // Content was blocked by safety settings.
  SAFETY = 'SAFETY',
  // Content was blocked, but the reason is uncategorized.
  OTHER = 'OTHER'
}

/**
 * Reason that a candidate finished.
 * @public
 */
export enum FinishReason {
  // Default value. This value is unused.
  FINISH_REASON_UNSPECIFIED = 'FINISH_REASON_UNSPECIFIED',
  // Natural stop point of the model or provided stop sequence.
  STOP = 'STOP',
  // The maximum number of tokens as specified in the request was reached.
  MAX_TOKENS = 'MAX_TOKENS',
  // The candidate content was flagged for safety reasons.
  SAFETY = 'SAFETY',
  // The candidate content was flagged for recitation reasons.
  RECITATION = 'RECITATION',
  // Unknown reason.
  OTHER = 'OTHER'
}
