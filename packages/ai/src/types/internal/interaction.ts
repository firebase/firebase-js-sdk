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

import type { AgentConfig, AllowedTools, AntigravityAgentConfig, CodeMenderAgentConfig, DeepResearchAgentConfig, DynamicAgentConfig } from './agents';
import type { AudioContent, Content, FileContent, ImageContent, VideoContent } from './content';
import type { AgentOption, HarmCategory, Model, ResponseModality, ServiceTier, ThinkingLevel, ThinkingSummaries } from './enums';
import type { Step, StepDelta, StepStart, StepStop } from './step';
import type { Tool, ToolChoice } from './tools';


/**
 * Citation information for model-generated content.
 */
export type Annotation =
  | FileCitation
  | PlaceCitation
  | URLCitation
  | WordInfo
;

/**
 * Outbound networking configuration for the sandbox. Accepts an object with an 'allowlist' array to restrict traffic, or the string 'disabled' to turn off all network access. Omit entirely to allow all outbound traffic with no header injection.
 */
export type EnvironmentNetworkEgressAllowlist =
  | Record<string, unknown>
  | string
;

/**
 * The environment configuration for the agent.
 */
export type EnvironmentOption =
  | Environment
  | string
;

/**
 * InteractionSSEEvent
 */
export type InteractionSSEEvent =
  | ErrorEvent
  | InteractionCompletedEvent
  | InteractionCreatedEvent
  | InteractionStatusUpdate
  | StepDelta
  | StepStart
  | StepStop
;

/**
 * The input for the interaction.
 */
export type InteractionsInput =
  | Content
  | Step[]
  | Content[]
  | string
;

/**
 * MediaProcessing
 */
export type MediaProcessing =
  | StaticMediaProcessing
;

/**
 * Network configuration for the environment.
 */
export type NetworkOption =
  | EnvironmentNetworkEgressAllowlist
  | string
;

/**
 * ResponseFormat
 */
export type ResponseFormat =
  | AudioResponseFormat
  | ImageResponseFormat
  | TextResponseFormat
  | VideoResponseFormat
  | Record<string, unknown>
;

/**
 * Optional. Speech and multi-speaker configuration.
 */
export type SpeechConfigUnion =
  | SpeakerConfig
  | SpeechConfig[]
;

/**
 * Headers to inject on all outbound requests matching this domain. Accepts a single dict or a list of dicts. The egress proxy injects these automatically.
 */
export type TransformOption =
  | Record<string, unknown>[]
  | Record<string, unknown>
;

/**
 * How the model processes this video for understanding.
 */
export type VideoProcessingOption =
  | MediaProcessing
  | string
;


/**
 * Configuration for audio output format.
 */
export interface AudioResponseFormat {
  /**
   * Bit rate in bits per second (bps). Only applicable for compressed formats
(MP3, Opus).
   */
  bit_rate?: number;
  /**
   * The delivery mode for the audio output.
   */
  delivery?: string;
  /**
   * The MIME type of the audio output.
   */
  mime_type?: string;
  /**
   * Sample rate in Hz.
   */
  sample_rate?: number;
  /**
   * type
   */
  'type': string;
}

/**
 * The arguments to pass to the code execution.
 */
export interface CodeExecutionCallArguments {
  /**
   * The code to be executed.
   */
  code?: string;
  /**
   * Programming language of the `code`.
   */
  language?: string;
}

/**
 * Parameters for creating agent interactions
 */
export interface CreateAgentInteraction {
  /**
   * The name of the `Agent` used for generating the interaction.
   */
  agent: AgentOption;
  /**
   * Configuration parameters for the agent interaction.
   */
  agent_config?: AgentConfig;
  /**
   * Input only. Whether to run the model interaction in the background.
   */
  background?: boolean;
  /**
   * Required. Output only. The time at which the response was created in ISO 8601 format
(YYYY-MM-DDThh:mm:ssZ).
   */
  created?: string;
  /**
   * The environment configuration for the interaction. Can be an object specifying remote environment sources or a string referencing an existing environment ID.
   */
  environment?: EnvironmentOption;
  /**
   * Output only. The environment ID for the interaction. Only populated if environment
config is set in the request.
   */
  environment_id?: string;
  /**
   * Required. Output only. A unique identifier for the interaction completion.
   */
  id?: string;
  /**
   * input
   */
  input: InteractionsInput;
  /**
   * The labels with user-defined metadata for the request.
   */
  labels?: Record<string, unknown>;
  /**
   * The ID of the previous interaction, if any.
   */
  previous_interaction_id?: string;
  /**
   * Enforces that the generated response is a JSON object that complies with the JSON schema specified in this field.
   */
  response_format?: ResponseFormat;
  /**
   * The mime type of the response. This is required if response_format is set.
   */
  response_mime_type?: string;
  /**
   * The requested modalities of the response (TEXT, IMAGE, AUDIO).
   */
  response_modalities?: ResponseModality[];
  /**
   * Safety settings for the interaction.
   */
  safety_settings?: SafetySetting[];
  /**
   * The service tier for the interaction.
   */
  service_tier?: ServiceTier;
  /**
   * Required. Output only. The status of the interaction.
   */
  status?: string;
  /**
   * Input only. Whether to store the response and request for later retrieval.
   */
  store?: boolean;
  /**
   * Input only. Whether the interaction will be streamed.
   */
  stream?: boolean;
  /**
   * System instruction for the interaction.
   */
  system_instruction?: string;
  /**
   * A list of tool declarations the model may call during interaction.
   */
  tools?: Tool[];
  /**
   * Required. Output only. The time at which the response was last updated in ISO 8601 format
(YYYY-MM-DDThh:mm:ssZ).
   */
  updated?: string;
  /**
   * Optional. Webhook configuration for receiving notifications when the
interaction completes.
   */
  webhook_config?: WebhookConfig;
}

/**
 * Parameters for creating model interactions
 */
export interface CreateModelInteraction {
  /**
   * Input only. Whether to run the model interaction in the background.
   */
  background?: boolean;
  /**
   * Required. Output only. The time at which the response was created in ISO 8601 format
(YYYY-MM-DDThh:mm:ssZ).
   */
  created?: string;
  /**
   * The environment configuration for the interaction. Can be an object specifying remote environment sources or a string referencing an existing environment ID.
   */
  environment?: EnvironmentOption;
  /**
   * Output only. The environment ID for the interaction. Only populated if environment
config is set in the request.
   */
  environment_id?: string;
  /**
   * Input only. Configuration parameters for the model interaction.
   */
  generation_config?: GenerationConfig;
  /**
   * Required. Output only. A unique identifier for the interaction completion.
   */
  id?: string;
  /**
   * input
   */
  input: InteractionsInput;
  /**
   * The labels with user-defined metadata for the request.
   */
  labels?: Record<string, unknown>;
  /**
   * The name of the `Model` used for generating the interaction.
   */
  model: Model;
  /**
   * The ID of the previous interaction, if any.
   */
  previous_interaction_id?: string;
  /**
   * Enforces that the generated response is a JSON object that complies with the JSON schema specified in this field.
   */
  response_format?: ResponseFormat;
  /**
   * The mime type of the response. This is required if response_format is set.
   */
  response_mime_type?: string;
  /**
   * The requested modalities of the response (TEXT, IMAGE, AUDIO).
   */
  response_modalities?: ResponseModality[];
  /**
   * Safety settings for the interaction.
   */
  safety_settings?: SafetySetting[];
  /**
   * The service tier for the interaction.
   */
  service_tier?: ServiceTier;
  /**
   * Required. Output only. The status of the interaction.
   */
  status?: string;
  /**
   * Input only. Whether to store the response and request for later retrieval.
   */
  store?: boolean;
  /**
   * Input only. Whether the interaction will be streamed.
   */
  stream?: boolean;
  /**
   * System instruction for the interaction.
   */
  system_instruction?: string;
  /**
   * A list of tool declarations the model may call during interaction.
   */
  tools?: Tool[];
  /**
   * Required. Output only. The time at which the response was last updated in ISO 8601 format
(YYYY-MM-DDThh:mm:ssZ).
   */
  updated?: string;
  /**
   * Optional. Webhook configuration for receiving notifications when the
interaction completes.
   */
  webhook_config?: WebhookConfig;
}

/**
 * Configuration for a custom environment.
 */
export interface Environment {
  /**
   * Optional. The environment ID for the interaction. If specified, the request will
update the existing environment instead of creating a new one.
   */
  environment_id?: string;
  /**
   * Network configuration for the environment.
   */
  network?: NetworkOption;
  /**
   * sources
   */
  sources?: Source[];
  /**
   * type
   */
  'type': string;
}

/**
 * Error message from an interaction.
 */
export interface Error {
  /**
   * A URI that identifies the error type.
   */
  code?: string;
  /**
   * A human-readable error message.
   */
  message?: string;
}

/**
 * ErrorEvent
 */
export interface ErrorEvent {
  event_type: 'error';
  /**
   * error
   */
  error?: Error;
  /**
   * The event_id token to be used to resume the interaction stream, from
this event.
   */
  event_id?: string;
}

/**
 * Used to specify configuration for ExaAISearch.
 */
export interface ExaAISearchConfig {
  /**
   * Required. The API key for ExaAiSearch.
   */
  api_key: string;
  /**
   * Optional. This field can be used to pass any parameter from the Exa.ai Search API.
   */
  custom_config?: Record<string, unknown>;
}

/**
 * A file citation annotation.
 */
export interface FileCitation {
  type: 'file_citation';
  /**
   * User provided metadata about the retrieved context.
   */
  custom_metadata?: Record<string, unknown>;
  /**
   * The URI of the file.
   */
  document_uri?: string;
  /**
   * End of the attributed segment, exclusive.
   */
  end_index?: number;
  /**
   * The name of the file.
   */
  file_name?: string;
  /**
   * Media ID in-case of image citations, if applicable.
   */
  media_id?: string;
  /**
   * Page number of the cited document, if applicable.
   */
  page_number?: number;
  /**
   * Source attributed for a portion of the text.
   */
  source?: string;
  /**
   * Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
   */
  start_index?: number;
}

/**
 * The result of the File Search.
 */
export interface FileSearchResult {
}

/**
 * Config for filters.
 */
export interface Filter {
  /**
   * Optional. String for metadata filtering.
   */
  metadata_filter?: string;
  /**
   * Optional. Only returns contexts with vector distance smaller than the
threshold.
   */
  vector_distance_threshold?: number;
  /**
   * Optional. Only returns contexts with vector similarity larger than the
threshold.
   */
  vector_similarity_threshold?: number;
}

/**
 * Request parameters specific to FIND sessions, used for discovering
vulnerabilities in a codebase.
 */
export interface FindRequest {
  /**
   * Additional context or custom instructions provided by the user to guide
the vulnerability analysis.
   */
  description?: string;
  /**
   * The identifier of a specific finding to verify. This is primarily used in
VERIFY mode to focus the agent's execution-based validation on a single
vulnerability.
   */
  finding_id?: string;
  /**
   * The mode of the find session.
   */
  mode?: string;
  /**
   * A list of source files to provide as context for the scan.
   */
  source_files?: FileContent[];
}

/**
 * Request parameters specific to FIX sessions, used for generating and
validating security patches.
 */
export interface FixRequest {
  /**
   * Additional context or custom instructions provided by the user to guide
the patch generation process.
   */
  description?: string;
  /**
   * The identifier of the specific security finding to be remediated. This ID
maps to a previously discovered vulnerability.
   */
  finding_id?: string;
  /**
   * A list of source files providing context for the remediation. These files
are typically the ones containing the identified vulnerability.
   */
  source_files?: FileContent[];
}

/**
 * A tool that can be used by the model.
 */
export interface Function {
  type: 'function';
  /**
   * A description of the function.
   */
  description?: string;
  /**
   * The name of the function.
   */
  name?: string;
  /**
   * The JSON Schema for the function's parameters.
   */
  parameters?: Record<string, unknown>;
}

/**
 * Configuration parameters for model interactions.
 */
export interface GenerationConfig {
  /**
   * Configuration for image interaction.
   */
  image_config?: ImageConfig;
  /**
   * The maximum number of tokens to include in the response.
   */
  max_output_tokens?: number;
  /**
   * Seed used in decoding for reproducibility.
   */
  seed?: number;
  /**
   * Optional. Speech and multi-speaker configuration.
   */
  speech_config?: SpeechConfigUnion;
  /**
   * A list of character sequences that will stop output interaction.
   */
  stop_sequences?: string[];
  /**
   * The level of thought tokens that the model should generate.
   */
  thinking_level?: ThinkingLevel;
  /**
   * Whether to include thought summaries in the response.
   */
  thinking_summaries?: ThinkingSummaries;
  /**
   * The tool choice configuration.
   */
  tool_choice?: ToolChoice;
  /**
   * Optional. Configuration for speech recognition (transcription). If present, ASR is
enabled.
   */
  transcription_config?: TranscriptionConfig;
  /**
   * Configuration for video generation.
   */
  video_config?: VideoConfig;
}

/**
 * The arguments to pass to the Google Maps tool.
 */
export interface GoogleMapsCallArguments {
  /**
   * The queries to be executed.
   */
  queries?: string[];
}

/**
 * The result of the Google Maps.
 */
export interface GoogleMapsResult {
  /**
   * places
   */
  places?: GoogleMapsResultPlaces[];
  /**
   * widgetContextToken
   */
  widget_context_token?: string;
}

/**
 * GoogleMapsResultPlaces
 */
export interface GoogleMapsResultPlaces {
  /**
   * name
   */
  name?: string;
  /**
   * placeId
   */
  place_id?: string;
  /**
   * reviewSnippets
   */
  review_snippets?: ReviewSnippet[];
  /**
   * url
   */
  url?: string;
}

/**
 * The arguments to pass to Google Search.
 */
export interface GoogleSearchCallArguments {
  /**
   * Web search queries for the following-up web search.
   */
  queries?: string[];
}

/**
 * The result of the Google Search.
 */
export interface GoogleSearchResult {
  /**
   * Web content snippet that can be embedded in a web page or an app webview.
   */
  search_suggestions?: string;
}

/**
 * The number of grounding tool counts.
 */
export interface GroundingToolCount {
  /**
   * The number of grounding tool counts.
   */
  count?: number;
  /**
   * The grounding tool type associated with the count.
   */
  'type'?: string;
}

/**
 * Config for Hybrid Search.
 */
export interface HybridSearch {
  /**
   * Optional. Alpha value controls the weight between dense and sparse vector search
results.
   */
  alpha?: number;
}

/**
 * The configuration for image interaction.
 */
export interface ImageConfig {
  /**
   * aspectRatio
   */
  aspect_ratio?: string;
  /**
   * imageSize
   */
  image_size?: string;
}

/**
 * Configuration for image output format.
 */
export interface ImageResponseFormat {
  /**
   * The aspect ratio for the image output.
   */
  aspect_ratio?: string;
  /**
   * The delivery mode for the image output.
   */
  delivery?: string;
  /**
   * The size of the image output.
   */
  image_size?: string;
  /**
   * The MIME type of the image output.
   */
  mime_type?: string;
  /**
   * type
   */
  'type': string;
}

/**
 * The Interaction resource.
 */
export interface Interaction {
  /**
   * The name of the `Agent` used for generating the interaction.
   */
  agent?: AgentOption;
  /**
   * Configuration parameters for the agent interaction.
   */
  agent_config?: AgentConfig;
  /**
   * Output only. The time at which the response was created in ISO 8601 format
(YYYY-MM-DDThh:mm:ssZ).
   */
  created?: string;
  /**
   * The environment configuration for the interaction. Can be an object specifying remote environment sources or a string referencing an existing environment ID.
   */
  environment?: EnvironmentOption;
  /**
   * Output only. The environment ID for the interaction. Only populated if environment
config is set in the request.
   */
  environment_id?: string;
  /**
   * Output only. Diagnostic faults / platform errors recorded on the interaction.
   */
  errors?: Error[];
  /**
   * Input only. Configuration parameters for the model interaction.
   */
  generation_config?: GenerationConfig;
  /**
   * Required. Output only. A unique identifier for the interaction completion.
   */
  id?: string;
  /**
   * input
   */
  input?: InteractionsInput;
  /**
   * The labels with user-defined metadata for the request.
   */
  labels?: Record<string, unknown>;
  /**
   * The name of the `Model` used for generating the interaction.
   */
  model?: Model;
  /**
   * The last audio generated by the model in response to the current request.

Note: this is added by the SDK.
   */
  output_audio?: AudioContent;
  /**
   * The last image generated by the model in response to the current request.

Note: this is added by the SDK.
   */
  output_image?: ImageContent;
  /**
   * Concatenated text from the last model output in response to the current request.

Note: this is added by the SDK.
   */
  output_text?: string;
  /**
   * The last video generated by the model in response to the current request.

Note: this is added by the SDK.
   */
  output_video?: VideoContent;
  /**
   * The ID of the previous interaction, if any.
   */
  previous_interaction_id?: string;
  /**
   * Enforces that the generated response is a JSON object that complies with the JSON schema specified in this field.
   */
  response_format?: ResponseFormat;
  /**
   * The mime type of the response. This is required if response_format is set.
   */
  response_mime_type?: string;
  /**
   * The requested modalities of the response (TEXT, IMAGE, AUDIO).
   */
  response_modalities?: ResponseModality[];
  /**
   * Safety settings for the interaction.
   */
  safety_settings?: SafetySetting[];
  /**
   * The service tier for the interaction.
   */
  service_tier?: ServiceTier;
  /**
   * Required. Output only. The status of the interaction.
   */
  status: string;
  /**
   * Output only. The steps that make up the interaction, when included in the response.
   */
  steps?: Step[];
  /**
   * System instruction for the interaction.
   */
  system_instruction?: string;
  /**
   * A list of tool declarations the model may call during interaction.
   */
  tools?: Tool[];
  /**
   * Output only. The time at which the response was last updated in ISO 8601 format
(YYYY-MM-DDThh:mm:ssZ).
   */
  updated?: string;
  /**
   * Output only. Statistics on the interaction request's token usage.
   */
  usage?: Usage;
  /**
   * Optional. Webhook configuration for receiving notifications when the
interaction completes.
   */
  webhook_config?: WebhookConfig;
}

/**
 * InteractionCompletedEvent
 */
export interface InteractionCompletedEvent {
  event_type: 'interaction.completed';
  /**
   * The event_id token to be used to resume the interaction stream, from
this event.
   */
  event_id?: string;
  /**
   * Partial completed interaction resource emitted at the end of the stream.
   */
  interaction: InteractionSseEventInteraction;
}

/**
 * InteractionCreatedEvent
 */
export interface InteractionCreatedEvent {
  event_type: 'interaction.created';
  /**
   * The event_id token to be used to resume the interaction stream, from
this event.
   */
  event_id?: string;
  /**
   * Partial interaction resource emitted when the stream is created.
   */
  interaction: InteractionSseEventInteraction;
}

/**
 * Partial interaction resource emitted by interaction lifecycle SSE events.
Streaming lifecycle payloads may omit fields that are only available on
full non-streaming Interaction responses.
 */
export interface InteractionSseEventInteraction {
  /**
   * The agent to interact with.
   */
  agent?: string;
  /**
   * Output only. The time at which the response was created in ISO 8601 format.
   */
  created?: string;
  /**
   * Required. Output only. A unique identifier for the interaction completion.
   */
  id: string;
  /**
   * The model that will complete your prompt.
   */
  model?: string;
  /**
   * Output only. The resource type.
   */
  object?: string;
  /**
   * The service tier for the interaction.
   */
  service_tier?: ServiceTier;
  /**
   * Required. Output only. The status of the interaction.
   */
  status: string;
  /**
   * Output only. The steps that make up the interaction, if included in this event.
   */
  steps?: Step[];
  /**
   * Output only. The time at which the response was last updated in ISO 8601 format.
   */
  updated?: string;
  /**
   * Output only. Statistics on the interaction request's token usage.
   */
  usage?: Usage;
}

/**
 * InteractionStatusUpdate
 */
export interface InteractionStatusUpdate {
  event_type: 'interaction.status_update';
  /**
   * The event_id token to be used to resume the interaction stream, from
this event.
   */
  event_id?: string;
  /**
   * interactionId
   */
  interaction_id: string;
  /**
   * status
   */
  status: string;
}

/**
 * A MCPServer is a server that can be called by the model to perform actions.
 */
export interface MCPServer {
  type: 'mcp_server';
  /**
   * The allowed tools.
   */
  allowed_tools?: AllowedTools[];
  /**
   * Optional: Fields for authentication headers, timeouts, etc., if needed.
   */
  headers?: Record<string, unknown>;
  /**
   * The name of the MCPServer.
   */
  name?: string;
  /**
   * The full URL for the MCPServer endpoint.
Example: "https://api.example.com/mcp"
   */
  url?: string;
}

/**
 * The token count for a single response modality.
 */
export interface ModalityTokens {
  /**
   * The modality associated with the token count.
   */
  modality?: ResponseModality;
  /**
   * Number of tokens for the modality.
   */
  tokens?: number;
}

/**
 * Used to specify configuration for ParallelAISearch.
 */
export interface ParallelAISearchConfig {
  /**
   * Optional. The API key for ParallelAiSearch.
   */
  api_key?: string;
  /**
   * Optional. Custom configs for ParallelAiSearch.
   */
  custom_config?: Record<string, unknown>;
}

/**
 * A place citation annotation.
 */
export interface PlaceCitation {
  type: 'place_citation';
  /**
   * End of the attributed segment, exclusive.
   */
  end_index?: number;
  /**
   * Title of the place.
   */
  name?: string;
  /**
   * The ID of the place, in `places/{place_id}` format.
   */
  place_id?: string;
  /**
   * Snippets of reviews that are used to generate answers about the
features of a given place in Google Maps.
   */
  review_snippets?: ReviewSnippet[];
  /**
   * Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
   */
  start_index?: number;
  /**
   * URI reference of the place.
   */
  url?: string;
}

/**
 * Places
 */
export interface Places {
  /**
   * Title of the place.
   */
  name?: string;
  /**
   * The ID of the place, in `places/{place_id}` format.
   */
  place_id?: string;
  /**
   * Snippets of reviews that are used to generate answers about the
features of a given place in Google Maps.
   */
  review_snippets?: ReviewSnippet[];
  /**
   * URI reference of the place.
   */
  url?: string;
}

/**
 * The definition of the Rag resource.
 */
export interface RagResource {
  /**
   * Optional. RagCorpora resource name.
   */
  rag_corpus?: string;
  /**
   * Optional. rag_file_id. The files should be in the same rag_corpus set in
rag_corpus field.
   */
  rag_file_ids?: string[];
}

/**
 * Specifies the context retrieval config.
 */
export interface RagRetrievalConfig {
  /**
   * Optional. Config for filters.
   */
  filter?: Filter;
  /**
   * Optional. Config for Hybrid Search.
   */
  hybrid_search?: HybridSearch;
  /**
   * Optional. Config for ranking and reranking.
   */
  ranking?: Ranking;
  /**
   * Optional. The number of contexts to retrieve.
   */
  top_k?: number;
}

/**
 * Use to specify configuration for RAG Store.
 */
export interface RagStoreConfig {
  /**
   * Optional. The representation of the rag source.
   */
  rag_resources?: RagResource[];
  /**
   * Optional. The retrieval config for the Rag query.
   */
  rag_retrieval_config?: RagRetrievalConfig;
  /**
   * Optional. Number of top k results to return from the selected corpora.
   */
  similarity_top_k?: number;
  /**
   * Optional. Only return results with vector distance smaller than the threshold.
   */
  vector_distance_threshold?: number;
}

/**
 * Config for Rank Service.
 */
export interface RankService {
  /**
   * Optional. The model name of the rank service.
   */
  model_name?: string;
  /**
   * rankingConfig
   */
  ranking_config: string;
}

/**
 * Config for ranking and reranking.
 */
export interface Ranking {
}

/**
 * A tool that can be used by the model to retrieve files.
 */
export interface Retrieval {
  type: 'retrieval';
  /**
   * Used to specify configuration for ExaAISearch.
   */
  exa_ai_search_config?: ExaAISearchConfig;
  /**
   * Used to specify configuration for ParallelAISearch.
   */
  parallel_ai_search_config?: ParallelAISearchConfig;
  /**
   * Used to specify configuration for RagStore.
   */
  rag_store_config?: RagStoreConfig;
  /**
   * The types of file retrieval to enable.
   */
  retrieval_types?: string[];
  /**
   * Used to specify configuration for VertexAISearch.
   */
  vertex_ai_search_config?: VertexAISearchConfig;
}

/**
 * The arguments to pass to Retrieval tools.
 */
export interface RetrievalCallArguments {
  /**
   * Queries for Retrieval information.
   */
  queries?: string[];
}

/**
 * Encapsulates a snippet of a user review that answers a question about
the features of a specific place in Google Maps.
 */
export interface ReviewSnippet {
  /**
   * The ID of the review snippet.
   */
  review_id?: string;
  /**
   * Title of the review.
   */
  title?: string;
  /**
   * A link that corresponds to the user review on Google Maps.
   */
  url?: string;
}

/**
 * A safety setting that affects the safety-blocking behavior.

A SafetySetting consists of a
harm category and a
threshold for that
category.
 */
export interface SafetySetting {
  /**
   * Optional. The method for blocking content. If not specified, the default
behavior is to use the probability score.
   */
  method?: string;
  /**
   * Required. The threshold for blocking content. If the harm probability
exceeds this threshold, the content will be blocked.
   */
  threshold: string;
  /**
   * Required. The type of harm category to be blocked.
   */
  'type': HarmCategory;
}

/**
 * The configuration of CodeMender sessions.
 */
export interface SessionConfig {
  /**
   * The maximum number of interaction rounds the agent is allowed to perform
before reaching a timeout.
   */
  max_rounds?: number;
}

/**
 * A source to be mounted into the environment.
 */
export interface Source {
  /**
   * The inline content if `type` is `INLINE`.
   */
  content?: string;
  /**
   * Optional encoding for inline content (e.g. `base64`).
   */
  encoding?: string;
  /**
   * The source of the environment.
For Cloud Storage, this is the Cloud Storage path.
For GitHub, this is the GitHub path.
   */
  source?: string;
  /**
   * Where the source should appear in the environment.
   */
  target?: string;
  /**
   * type
   */
  'type'?: string;
}

/**
 * Configuration for multi-speaker and speech generation.
 */
export interface SpeakerConfig {
  /**
   * Individual speaker configurations.
   */
  speakers?: SpeechConfig[];
}

/**
 * The configuration for speech interaction.
 */
export interface SpeechConfig {
  /**
   * The language of the speech.
   */
  language?: string;
  /**
   * The speaker's name, it should match the speaker name given in the prompt.
   */
  speaker?: string;
  /**
   * The voice of the speaker.
   */
  voice?: string;
}

/**
 * StaticMediaProcessing
 */
export interface StaticMediaProcessing {
  type: 'static';
  /**
   * Optional. Segment end time. Specified as a decimal number of seconds followed
by an 's' suffix, e.g., "30s". Must be non-negative and greater than
`start_offset` if `start_offset` is set.
   */
  end_offset?: string;
  /**
   * Optional. Video frame-rate sampling density.
   */
  fps?: number;
  /**
   * Optional. Segment start time. Specified as a decimal number of seconds followed
by an 's' suffix, e.g., "10.5s". Must be non-negative.
   */
  start_offset?: string;
}

/**
 * Configuration for text output format.
 */
export interface TextResponseFormat {
  /**
   * The MIME type of the text output.
   */
  mime_type?: string;
  /**
   * The JSON schema that the output should conform to. Only applicable when
mime_type is application/json.
   */
  schema?: Record<string, unknown>;
  /**
   * type
   */
  'type': string;
}

/**
 * The tool choice configuration containing allowed tools.
 */
export interface ToolChoiceConfig {
  /**
   * The allowed tools.
   */
  allowed_tools?: AllowedTools;
}

/**
 * Configuration for speech recognition (transcription).
 */
export interface TranscriptionConfig {
  /**
   * Optional. A list of phrases to bias the ASR model towards.
   */
  adaptation_phrases?: string[];
  /**
   * Optional. A list of custom vocabulary phrases to bias the speech recognition model
toward recognizing specific terms.
   */
  custom_vocabulary?: string[];
  /**
   * Optional. Configures speaker diarization. Supported values: "speaker".
   */
  diarization_mode?: string;
  /**
   * Optional. BCP-47 language codes providing hints about the languages present in the
audio. If omitted or empty, defaults to automatic language detection.
   */
  language_codes?: string[];
  /**
   * Optional. The granularity of timestamps to include in the transcription output.
Supported values: "word". If empty, no timestamps are generated.
   */
  timestamp_granularities?: string[];
}

/**
 * A URL citation annotation.
 */
export interface URLCitation {
  type: 'url_citation';
  /**
   * End of the attributed segment, exclusive.
   */
  end_index?: number;
  /**
   * Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
   */
  start_index?: number;
  /**
   * The title of the URL.
   */
  title?: string;
  /**
   * The URL.
   */
  url?: string;
}

/**
 * A tool that can be used by the model to fetch URL context.
 */
export interface URLContext {
  type: 'url_context';
}

/**
 * The arguments to pass to the URL context.
 */
export interface URLContextCallArguments {
  /**
   * The URLs to fetch.
   */
  urls?: string[];
}

/**
 * The result of the URL context.
 */
export interface URLContextResult {
  /**
   * The status of the URL retrieval.
   */
  status?: string;
  /**
   * The URL that was fetched.
   */
  url?: string;
}

/**
 * Statistics on the interaction request's token usage.
 */
export interface Usage {
  /**
   * A breakdown of cached token usage by modality.
   */
  cached_tokens_by_modality?: ModalityTokens[];
  /**
   * Grounding tool count.
   */
  grounding_tool_count?: GroundingToolCount[];
  /**
   * A breakdown of input token usage by modality.
   */
  input_tokens_by_modality?: ModalityTokens[];
  /**
   * A breakdown of output token usage by modality.
   */
  output_tokens_by_modality?: ModalityTokens[];
  /**
   * A breakdown of tool-use token usage by modality.
   */
  tool_use_tokens_by_modality?: ModalityTokens[];
  /**
   * Number of tokens in the cached part of the prompt (the cached content).
   */
  total_cached_tokens?: number;
  /**
   * Number of tokens in the prompt (context).
   */
  total_input_tokens?: number;
  /**
   * Total number of tokens across all the generated responses.
   */
  total_output_tokens?: number;
  /**
   * Number of tokens of thoughts for thinking models.
   */
  total_thought_tokens?: number;
  /**
   * Total token count for the interaction request (prompt + responses + other
internal tokens).
   */
  total_tokens?: number;
  /**
   * Number of tokens present in tool-use prompt(s).
   */
  total_tool_use_tokens?: number;
}

/**
 * Used to specify configuration for VertexAISearch.
 */
export interface VertexAISearchConfig {
  /**
   * Optional. Used to specify Vertex AI Search datastores.
   */
  datastores?: string[];
  /**
   * Optional. Used to specify Vertex AI Search engine.
   */
  engine?: string;
}

/**
 * Configuration options for video generation.
 */
export interface VideoConfig {
  /**
   * Optional task mode for video generation. If not specified, the model
automatically determines the appropriate mode based on the provided text
prompt and input media.
   */
  task?: string;
}

/**
 * Configuration for video output format.
 */
export interface VideoResponseFormat {
  /**
   * The aspect ratio for the video output.
   */
  aspect_ratio?: string;
  /**
   * The delivery mode for the video output.
   */
  delivery?: string;
  /**
   * The duration for the video output.
   */
  duration?: string;
  /**
   * The Cloud Storage URI to store the video output. Required for Vertex if
delivery mode is URI.
   */
  gcs_uri?: string;
  /**
   * The video output resolution. Defaults to 720p.
   */
  resolution?: string;
  /**
   * type
   */
  'type': string;
}

/**
 * Message for configuring webhook events for a request.
 */
export interface WebhookConfig {
  /**
   * Optional. If set, these webhook URIs will be used for webhook events instead of the
registered webhooks.
   */
  uris?: string[];
  /**
   * Optional. The user metadata that will be returned on each event emission to the
webhooks.
   */
  user_metadata?: Record<string, unknown>;
}

/**
 * Word-level ASR annotation for transcription output.
Carries the word text, optional timing, and optional speaker attribution.
 */
export interface WordInfo {
  type: 'word_info';
  /**
   * End of the attributed segment, exclusive.
   */
  end_index?: number;
  /**
   * End offset in time of the word relative to the start of the audio.
Present when timestamp_granularities contains "word".
   */
  end_offset?: string;
  /**
   * Optional. Speaker label for this word (e.g. "spk_1", "spk_2").
Present when diarization_mode is set in TranscriptionConfig.
   */
  speaker?: string;
  /**
   * Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
   */
  start_index?: number;
  /**
   * Start offset in time of the word relative to the start of the audio.
Present when timestamp_granularities contains "word".
   */
  start_offset?: string;
  /**
   * The transcribed word.
   */
  text?: string;
}

