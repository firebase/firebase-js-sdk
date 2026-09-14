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

import type { Annotation, CodeExecutionCallArguments, FileSearchResult, GoogleMapsCallArguments, GoogleMapsResult, GoogleSearchCallArguments, GoogleSearchResult, MediaProcessing, RetrievalCallArguments, URLContextCallArguments, URLContextResult, VideoProcessingOption } from './interaction';
import type { MediaResolution } from './enums';
import type { FunctionResultPayload, StepDeltaData } from './step';


/**
 * The content of the response.
 */
export type Content =
  | AudioContent
  | DocumentContent
  | ImageContent
  | TextContent
  | VideoContent
;

/**
 * ThoughtSummaryContent
 */
export type ThoughtSummaryContent =
  | ImageContent
  | TextContent
;


/**
 * ArgumentsDelta
 */
export interface ArgumentsDelta {
  type: 'arguments_delta';
  /**
   * arguments
   */
  arguments?: string;
}

/**
 * An audio content block.
 */
export interface AudioContent {
  type: 'audio';
  /**
   * The number of audio channels.
   */
  channels?: number;
  /**
   * The audio content.
   */
  data?: string;
  /**
   * The mime type of the audio.
   */
  mime_type?: string;
  /**
   * The sample rate of the audio.
   */
  sample_rate?: number;
  /**
   * The URI of the audio.
   */
  uri?: string;
}

/**
 * AudioDelta
 */
export interface AudioDelta {
  type: 'audio';
  /**
   * The number of audio channels.
   */
  channels?: number;
  /**
   * data
   */
  data?: string;
  /**
   * mimeType
   */
  mime_type?: string;
  /**
   * Deprecated. Use sample_rate instead. The value is ignored.
   */
  rate?: number;
  /**
   * The sample rate of the audio.
   */
  sample_rate?: number;
  /**
   * uri
   */
  uri?: string;
}

/**
 * CodeExecutionCallDelta
 */
export interface CodeExecutionCallDelta {
  type: 'code_execution_call';
  /**
   * arguments
   */
  arguments: CodeExecutionCallArguments;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * CodeExecutionResultDelta
 */
export interface CodeExecutionResultDelta {
  type: 'code_execution_result';
  /**
   * isError
   */
  is_error?: boolean;
  /**
   * result
   */
  result: string;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * A document content block.
 */
export interface DocumentContent {
  type: 'document';
  /**
   * The document content.
   */
  data?: string;
  /**
   * The mime type of the document.
   */
  mime_type?: string;
  /**
   * The URI of the document.
   */
  uri?: string;
}

/**
 * DocumentDelta
 */
export interface DocumentDelta {
  type: 'document';
  /**
   * data
   */
  data?: string;
  /**
   * mimeType
   */
  mime_type?: string;
  /**
   * uri
   */
  uri?: string;
}

/**
 * Content of a single file in the codebase.
 */
export interface FileContent {
  /**
   * The UTF-8 encoded text content of the file.
   */
  content?: string;
  /**
   * The relative path of the file from the project root.
   */
  path?: string;
}

/**
 * FileSearchCallDelta
 */
export interface FileSearchCallDelta {
  type: 'file_search_call';
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * FileSearchResultDelta
 */
export interface FileSearchResultDelta {
  type: 'file_search_result';
  /**
   * result
   */
  result: FileSearchResult[];
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * FunctionResultDelta
 */
export interface FunctionResultDelta {
  type: 'function_result';
  /**
   * Required. ID to match the ID from the function call block.
   */
  call_id: string;
  /**
   * isError
   */
  is_error?: boolean;
  /**
   * name
   */
  name?: string;
  /**
   * result
   */
  result: FunctionResultPayload;
}

/**
 * GoogleMapsCallDelta
 */
export interface GoogleMapsCallDelta {
  type: 'google_maps_call';
  /**
   * The arguments to pass to the Google Maps tool.
   */
  arguments?: GoogleMapsCallArguments;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * GoogleMapsResultDelta
 */
export interface GoogleMapsResultDelta {
  type: 'google_maps_result';
  /**
   * The results of the Google Maps.
   */
  result?: GoogleMapsResult[];
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * GoogleSearchCallDelta
 */
export interface GoogleSearchCallDelta {
  type: 'google_search_call';
  /**
   * arguments
   */
  arguments: GoogleSearchCallArguments;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * GoogleSearchResultDelta
 */
export interface GoogleSearchResultDelta {
  type: 'google_search_result';
  /**
   * isError
   */
  is_error?: boolean;
  /**
   * result
   */
  result: GoogleSearchResult[];
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * An image content block.
 */
export interface ImageContent {
  type: 'image';
  /**
   * The image content.
   */
  data?: string;
  /**
   * The mime type of the image.
   */
  mime_type?: string;
  /**
   * The resolution of the media.
   */
  resolution?: MediaResolution;
  /**
   * The URI of the image.
   */
  uri?: string;
}

/**
 * ImageDelta
 */
export interface ImageDelta {
  type: 'image';
  /**
   * data
   */
  data?: string;
  /**
   * mimeType
   */
  mime_type?: string;
  /**
   * The resolution of the media.
   */
  resolution?: MediaResolution;
  /**
   * uri
   */
  uri?: string;
}

/**
 * MCPServerToolCallDelta
 */
export interface MCPServerToolCallDelta {
  type: 'mcp_server_tool_call';
  /**
   * arguments
   */
  arguments: Record<string, unknown>;
  /**
   * name
   */
  name: string;
  /**
   * serverName
   */
  server_name: string;
}

/**
 * MCPServerToolResultDelta
 */
export interface MCPServerToolResultDelta {
  type: 'mcp_server_tool_result';
  /**
   * name
   */
  name?: string;
  /**
   * result
   */
  result: FunctionResultPayload;
  /**
   * serverName
   */
  server_name?: string;
}

/**
 * Used by Vertex Retrieval tools such as Parallel AI, Exa AI, Vertex AI Search,
etc. RetrievalType decides which tool is used.
 */
export interface RetrievalCallDelta {
  type: 'retrieval_call';
  /**
   * Required. The arguments to pass to the Retrieval tool.
   */
  arguments: RetrievalCallArguments;
  /**
   * The type of retrieval tools.
   */
  retrieval_type?: string;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * Used by Vertex Retrieval tools such as Parallel AI, Exa AI, Vertex AI Search,
etc.
ToolResultDelta.type
 */
export interface RetrievalResultDelta {
  type: 'retrieval_result';
  /**
   * Whether the retrieval resulted in an error.
   */
  is_error?: boolean;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * TextAnnotationDelta
 */
export interface TextAnnotationDelta {
  type: 'text_annotation_delta';
  /**
   * Citation information for model-generated content.
   */
  annotations?: Annotation[];
}

/**
 * A text content block.
 */
export interface TextContent {
  type: 'text';
  /**
   * Citation information for model-generated content.
   */
  annotations?: Annotation[];
  /**
   * Required. The text content.
   */
  text: string;
}

/**
 * TextDelta
 */
export interface TextDelta {
  type: 'text';
  /**
   * text
   */
  text: string;
}

/**
 * ThoughtSignatureDelta
 */
export interface ThoughtSignatureDelta {
  type: 'thought_signature';
  /**
   * Signature to match the backend source to be part of the generation.
   */
  signature?: string;
}

/**
 * ThoughtSummaryDelta
 */
export interface ThoughtSummaryDelta {
  type: 'thought_summary';
  /**
   * A new summary item to be added to the thought.
   */
  content?: Content;
}

/**
 * URLContextCallDelta
 */
export interface URLContextCallDelta {
  type: 'url_context_call';
  /**
   * arguments
   */
  arguments: URLContextCallArguments;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * URLContextResultDelta
 */
export interface URLContextResultDelta {
  type: 'url_context_result';
  /**
   * isError
   */
  is_error?: boolean;
  /**
   * result
   */
  result: URLContextResult[];
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * A video content block.
 */
export interface VideoContent {
  type: 'video';
  /**
   * The video content.
   */
  data?: string;
  /**
   * The mime type of the video.
   */
  mime_type?: string;
  /**
   * How the model processes this video for understanding.
   */
  processing?: VideoProcessingOption;
  /**
   * The resolution of the media.
   */
  resolution?: MediaResolution;
  /**
   * The URI of the video.
   */
  uri?: string;
}

/**
 * VideoDelta
 */
export interface VideoDelta {
  type: 'video';
  /**
   * data
   */
  data?: string;
  /**
   * mimeType
   */
  mime_type?: string;
  /**
   * The resolution of the media.
   */
  resolution?: MediaResolution;
  /**
   * uri
   */
  uri?: string;
}

