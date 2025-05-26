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

import { Content, FunctionCall, InlineDataPart } from './content';
import {
  BlockReason,
  FinishReason,
  HarmCategory,
  HarmProbability,
  HarmSeverity,
  Modality
} from './enums';

/**
 * Result object returned from {@link GenerativeModel.generateContent} call.
 *
 * @public
 */
export interface GenerateContentResult {
  response: EnhancedGenerateContentResponse;
}

/**
 * Result object returned from {@link GenerativeModel.generateContentStream} call.
 * Iterate over `stream` to get chunks as they come in and/or
 * use the `response` promise to get the aggregated response when
 * the stream is done.
 *
 * @public
 */
export interface GenerateContentStreamResult {
  stream: AsyncGenerator<EnhancedGenerateContentResponse>;
  response: Promise<EnhancedGenerateContentResponse>;
}

/**
 * Response object wrapped with helper methods.
 *
 * @public
 */
export interface EnhancedGenerateContentResponse
  extends GenerateContentResponse {
  /**
   * Returns the text string from the response, if available.
   * Throws if the prompt or candidate was blocked.
   */
  text: () => string;
  /**
   * Aggregates and returns all {@link InlineDataPart}s from the {@link GenerateContentResponse}'s
   * first candidate.
   *
   * @returns An array of {@link InlineDataPart}s containing data from the response, if available.
   *
   * @throws If the prompt or candidate was blocked.
   */
  inlineDataParts: () => InlineDataPart[] | undefined;
  functionCalls: () => FunctionCall[] | undefined;
}

/**
 * Individual response from {@link GenerativeModel.generateContent} and
 * {@link GenerativeModel.generateContentStream}.
 * `generateContentStream()` will return one in each chunk until
 * the stream is done.
 * @public
 */
export interface GenerateContentResponse {
  candidates?: GenerateContentCandidate[];
  promptFeedback?: PromptFeedback;
  usageMetadata?: UsageMetadata;
}

/**
 * Usage metadata about a {@link GenerateContentResponse}.
 *
 * @public
 */
export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  promptTokensDetails?: ModalityTokenCount[];
  candidatesTokensDetails?: ModalityTokenCount[];
}

/**
 * Represents token counting info for a single modality.
 *
 * @public
 */
export interface ModalityTokenCount {
  /** The modality associated with this token count. */
  modality: Modality;
  /** The number of tokens counted. */
  tokenCount: number;
}

/**
 * If the prompt was blocked, this will be populated with `blockReason` and
 * the relevant `safetyRatings`.
 * @public
 */
export interface PromptFeedback {
  blockReason?: BlockReason;
  safetyRatings: SafetyRating[];
  /**
   * A human-readable description of the `blockReason`.
   *
   * This property is only supported in the Vertex AI Gemini API ({@link VertexAIBackend}).
   */
  blockReasonMessage?: string;
}

/**
 * A candidate returned as part of a {@link GenerateContentResponse}.
 * @public
 */
export interface GenerateContentCandidate {
  index: number;
  content: Content;
  finishReason?: FinishReason;
  finishMessage?: string;
  safetyRatings?: SafetyRating[];
  citationMetadata?: CitationMetadata;
  groundingMetadata?: GroundingMetadata;
}

/**
 * Citation metadata that may be found on a {@link GenerateContentCandidate}.
 * @public
 */
export interface CitationMetadata {
  citations: Citation[];
}

/**
 * A single citation.
 * @public
 */
export interface Citation {
  startIndex?: number;
  endIndex?: number;
  uri?: string;
  license?: string;
  /**
   * The title of the cited source, if available.
   *
   * This property is only supported in the Vertex AI Gemini API ({@link VertexAIBackend}).
   */
  title?: string;
  /**
   * The publication date of the cited source, if available.
   *
   * This property is only supported in the Vertex AI Gemini API ({@link VertexAIBackend}).
   */
  publicationDate?: Date;
}

/**
 * Metadata returned to client when grounding is enabled.
 *
 * @public
 */
export interface GroundingMetadata {
  /**
   * Google search entry for the following web searches.
   */
  searchEntryPoint?: SearchEntrypoint;
  /**
   * List of supporting references retrieved from the specified grounding source.
   */
  groundingChunks?: GroundingChunk[];
  /**
   * List of grounding support.
   */
  groundingSupports?: GroundingSupport[];
  /**
   * Web search queries for the following-up web search.
   */
  webSearchQueries?: string[];

  // deprecated
  retrievalQueries?: string[];
  /**
   * @deprecated
   */
  groundingAttributions: GroundingAttribution[];
}

let x: HTMLDivElement = document.createElement('div');
let s: ShadowRoot = x.attachShadow({ mode: 'open' })

/**
 * Google search entry point.
 *
 * @public
 */
export interface SearchEntrypoint {
  /**
   * Web content snippet that can be embedded in a web page.
   */
  renderedContent: string;
  /**
   * attachShadow({mode: 'open'}).innerHTML = renderedContent
   * https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM
   * - prevents CSS conflicts
   * - "black box" structure that can't be modified by accident (very good in this context)
   * 
   * this could be a helper method createEncapsulatedElement(htmlContent): HTMLDivElement
   */
  renderedContentElement: HTMLDivElement; // 
  /**
   * Base64-encoded JSON array of <search term, search url>
   * 
   * This seems to always come back as undefined when using the Gemini Developer API.
   */
  sdkBlob?: string; // can be an empty string which is omitted since it's a default
}

/**
 * A grounding chunk.
 *
 * @public
 */
export interface GroundingChunk {
  /**
   * A grounding chunk from the web.
   */
  web?: WebGroundingChunk;
}

/**
 * A grounding reference from the web.
 *
 * @public
 */
export interface WebGroundingChunk {
  /**
   * The URI of the reference. Always contains the `vertexaisearch` subdomain, for example;
   * `https://vertexaisearch.cloud.google.com/grounding-api-redirect/AWhgh4y9L4oeNGWCat...`.
   *
   * The URI remains accessible for 30 days after the grounding result is generated.
   */
  uri?: string;
  /**
   * The title of the web page.
   */
  title?: string;
  /**
   * Domain of the original URI, before the `vertexaisearch` subdomain was added.
   * 
   * This property is only supported in the Vertex AI Gemini API ({@link VertexAIBackend}).
   * When using the Gemini Developer API ({@link GoogleAIBackend}), this property will be undefined. 
   */
  domain?: string;
}

/**
 * Grounding support.
 *
 * @public
 */
export interface GroundingSupport {
  /**
   * Segment of the content that this support is associated with.
   */
  segment?: Segment;
  /**
   * A list of indices into `groundingChunk` specifying the citations associated with the claim.
   * For example, `[1,3,4]` means that `groundingChunk[1]`, `groundingChunk[3]`, and `groundingChunk[4]`
   * are the retrieved content to the attributed claim.
   */
  groundingChunkIndices?: number[];
  /**
   * Confidence score of the supporting references. Ranges from 0 to 1, where 1 is the most confident.
   * This list must have the same size has the `groundingChunkIndices`.
   */
  confidenceScores?: number[];
}

/**
 * Segment of the content
 *
 * @public
 */
export interface Segment {
  /**
   * The index of a part object within its parent `Content` object.
   */
  partIndex: number;
  /**
   * Start index in the given part, measured in bytes. Offset from the start of the part, inclusive
   * starting at 0.
   */
  startIndex: number;
  /**
   * End index in the given part, measured in bytes. Offset from the start of the part, inclusive
   * starting at 0.
   */
  endIndex: number;
  /**
   * The text corresponding to the segment from the response.
   */
  text: string;
}

/**
 * @deprecated
 * @public
 */
export interface GroundingAttribution {
  segment: Segment;
  confidenceScore?: number;
  web?: WebAttribution;
  retrievedContext?: RetrievedContextAttribution;
}

/**
 * @public
 */
export interface Segment {
  partIndex: number;
  startIndex: number;
  endIndex: number;
}

/**
 * @public
 */
export interface WebAttribution {
  uri: string;
  title: string;
}

/**
 * @public
 */
export interface RetrievedContextAttribution {
  uri: string;
  title: string;
}

/**
 * Protobuf google.type.Date
 * @public
 */
export interface Date {
  year: number;
  month: number;
  day: number;
}

/**
 * A safety rating associated with a {@link GenerateContentCandidate}
 * @public
 */
export interface SafetyRating {
  category: HarmCategory;
  probability: HarmProbability;
  /**
   * The harm severity level.
   *
   * This property is only supported when using the Vertex AI Gemini API ({@link VertexAIBackend}).
   * When using the Gemini Developer API ({@link GoogleAIBackend}), this property is not supported and will default to `HarmSeverity.UNSUPPORTED`.
   */
  severity: HarmSeverity;
  /**
   * The probability score of the harm category.
   *
   * This property is only supported when using the Vertex AI Gemini API ({@link VertexAIBackend}).
   * When using the Gemini Developer API ({@link GoogleAIBackend}), this property is not supported and will default to 0.
   */
  probabilityScore: number;
  /**
   * The severity score of the harm category.
   *
   * This property is only supported when using the Vertex AI Gemini API ({@link VertexAIBackend}).
   * When using the Gemini Developer API ({@link GoogleAIBackend}), this property is not supported and will default to 0.
   */
  severityScore: number;
  blocked: boolean;
}

/**
 * Response from calling {@link GenerativeModel.countTokens}.
 * @public
 */
export interface CountTokensResponse {
  /**
   * The total number of tokens counted across all instances from the request.
   */
  totalTokens: number;
  /**
   * The total number of billable characters counted across all instances
   * from the request.
   *
   * This property is only supported when using the Vertex AI Gemini API ({@link VertexAIBackend}).
   * When using the Gemini Developer API ({@link GoogleAIBackend}), this property is not supported and will default to 0.
   */
  totalBillableCharacters?: number;
  /**
   * The breakdown, by modality, of how many tokens are consumed by the prompt.
   */
  promptTokensDetails?: ModalityTokenCount[];
}
