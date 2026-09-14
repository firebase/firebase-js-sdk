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

import type { CodeExecutionCallArguments, GoogleMapsCallArguments, GoogleMapsResult, GoogleSearchCallArguments, GoogleSearchResult, InteractionSSEEvent, URLContextCallArguments, URLContextResult, Usage } from './interaction';
import type { ArgumentsDelta, AudioDelta, CodeExecutionCallDelta, CodeExecutionResultDelta, Content, DocumentDelta, FileSearchCallDelta, FileSearchResultDelta, FunctionResultDelta, GoogleMapsCallDelta, GoogleMapsResultDelta, GoogleSearchCallDelta, GoogleSearchResultDelta, ImageDelta, MCPServerToolCallDelta, MCPServerToolResultDelta, RetrievalCallDelta, RetrievalResultDelta, TextAnnotationDelta, TextDelta, ThoughtSignatureDelta, ThoughtSummaryContent, ThoughtSummaryDelta, URLContextCallDelta, URLContextResultDelta, VideoDelta } from './content';
import type { Status } from './enums';


/**
 * Polymorphic union for result.
 */
export type FunctionResultPayload =
  | string[]
  | Record<string, unknown>
  | string
;

/**
 * A step in the interaction.
 */
export type Step =
  | UserInputStep
  | ThoughtStep
  | ModelOutputStep
  | FunctionCallStep
  | FunctionResultStep
  | CodeExecutionCallStep
  | CodeExecutionResultStep
  | GoogleSearchCallStep
  | GoogleSearchResultStep
  | GoogleMapsCallStep
  | GoogleMapsResultStep
  | FileSearchCallStep
  | FileSearchResultStep
  | URLContextCallStep
  | URLContextResultStep
  | MCPServerToolCallStep
  | MCPServerToolResultStep
;

/**
 * StepDeltaData
 */
export type StepDeltaData =
  | ArgumentsDelta
  | AudioDelta
  | CodeExecutionCallDelta
  | CodeExecutionResultDelta
  | DocumentDelta
  | FileSearchCallDelta
  | FileSearchResultDelta
  | FunctionResultDelta
  | GoogleMapsCallDelta
  | GoogleMapsResultDelta
  | GoogleSearchCallDelta
  | GoogleSearchResultDelta
  | ImageDelta
  | MCPServerToolCallDelta
  | MCPServerToolResultDelta
  | RetrievalCallDelta
  | RetrievalResultDelta
  | TextAnnotationDelta
  | TextDelta
  | ThoughtSignatureDelta
  | ThoughtSummaryDelta
  | URLContextCallDelta
  | URLContextResultDelta
  | VideoDelta
;


/**
 * Code execution call step.
 */
export interface CodeExecutionCallStep {
  type: 'code_execution_call';
  /**
   * Required. The arguments to pass to the code execution.
   */
  arguments: CodeExecutionCallArguments;
  /**
   * Required. A unique ID for this specific tool call.
   */
  id: string;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * Code execution result step.
 */
export interface CodeExecutionResultStep {
  type: 'code_execution_result';
  /**
   * Required. ID to match the ID from the function call block.
   */
  call_id: string;
  /**
   * Whether the code execution resulted in an error.
   */
  is_error?: boolean;
  /**
   * Required. The output of the code execution.
   */
  result: string;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * File Search call step.
 */
export interface FileSearchCallStep {
  type: 'file_search_call';
  /**
   * Required. A unique ID for this specific tool call.
   */
  id: string;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * File Search result step.
 */
export interface FileSearchResultStep {
  type: 'file_search_result';
  /**
   * Required. ID to match the ID from the function call block.
   */
  call_id: string;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * A function tool call step.
 */
export interface FunctionCallStep {
  type: 'function_call';
  /**
   * Required. The arguments to pass to the function.
   */
  arguments: Record<string, unknown>;
  /**
   * Required. A unique ID for this specific tool call.
   */
  id: string;
  /**
   * Required. The name of the tool to call.
   */
  name: string;
}

/**
 * Result of a function tool call.
 */
export interface FunctionResultStep {
  type: 'function_result';
  /**
   * Required. ID to match the ID from the function call block.
   */
  call_id: string;
  /**
   * Whether the tool call resulted in an error.
   */
  is_error?: boolean;
  /**
   * The name of the tool that was called.
   */
  name?: string;
  /**
   * Required. The result of the tool call.
   */
  result: FunctionResultPayload;
}

/**
 * Google Maps call step.
 */
export interface GoogleMapsCallStep {
  type: 'google_maps_call';
  /**
   * The arguments to pass to the Google Maps tool.
   */
  arguments?: GoogleMapsCallArguments;
  /**
   * Required. A unique ID for this specific tool call.
   */
  id: string;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * Google Maps result step.
 */
export interface GoogleMapsResultStep {
  type: 'google_maps_result';
  /**
   * Required. ID to match the ID from the function call block.
   */
  call_id: string;
  /**
   * result
   */
  result: GoogleMapsResult[];
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * Google Search call step.
 */
export interface GoogleSearchCallStep {
  type: 'google_search_call';
  /**
   * Required. The arguments to pass to Google Search.
   */
  arguments: GoogleSearchCallArguments;
  /**
   * Required. A unique ID for this specific tool call.
   */
  id: string;
  /**
   * The type of search grounding enabled.
   */
  search_type?: string;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * Google Search result step.
 */
export interface GoogleSearchResultStep {
  type: 'google_search_result';
  /**
   * Required. ID to match the ID from the function call block.
   */
  call_id: string;
  /**
   * Whether the Google Search resulted in an error.
   */
  is_error?: boolean;
  /**
   * Required. The results of the Google Search.
   */
  result: GoogleSearchResult[];
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * MCPServer tool call step.
 */
export interface MCPServerToolCallStep {
  type: 'mcp_server_tool_call';
  /**
   * Required. The JSON object of arguments for the function.
   */
  arguments: Record<string, unknown>;
  /**
   * Required. A unique ID for this specific tool call.
   */
  id: string;
  /**
   * Required. The name of the tool which was called.
   */
  name: string;
  /**
   * Required. The name of the used MCP server.
   */
  server_name: string;
}

/**
 * MCPServer tool result step.
 */
export interface MCPServerToolResultStep {
  type: 'mcp_server_tool_result';
  /**
   * Required. ID to match the ID from the function call block.
   */
  call_id: string;
  /**
   * Name of the tool which is called for this specific tool call.
   */
  name?: string;
  /**
   * Required. The output from the MCP server call. Can be simple text or rich content.
   */
  result: FunctionResultPayload;
  /**
   * The name of the used MCP server.
   */
  server_name?: string;
}

/**
 * Output generated by the model.
 */
export interface ModelOutputStep {
  type: 'model_output';
  /**
   * content
   */
  content?: Content[];
  /**
   * The error result of the operation in case of failure or cancellation.
   */
  error?: Status;
}

/**
 * StepDelta
 */
export interface StepDelta {
  event_type: 'step.delta';
  /**
   * delta
   */
  delta: StepDeltaData;
  /**
   * The event_id token to be used to resume the interaction stream, from
this event.
   */
  event_id?: string;
  /**
   * index
   */
  index: number;
  /**
   * metadata
   */
  metadata?: StepDeltaMetadata;
}

/**
 * Optional metadata accompanying ANY streamed event.
 */
export interface StepDeltaMetadata {
  /**
   * Statistics on the interaction request's token usage.
   */
  total_usage?: Usage;
}

/**
 * StepStart
 */
export interface StepStart {
  event_type: 'step.start';
  /**
   * The event_id token to be used to resume the interaction stream, from
this event.
   */
  event_id?: string;
  /**
   * index
   */
  index: number;
  /**
   * step
   */
  step: Step;
}

/**
 * StepStop
 */
export interface StepStop {
  event_type: 'step.stop';
  /**
   * The event_id token to be used to resume the interaction stream, from
this event.
   */
  event_id?: string;
  /**
   * index
   */
  index: number;
  /**
   * Model usage stats for this specific step.
   */
  step_usage?: Usage;
  /**
   * Cumulative model usage stats from the start of the session.
   */
  usage?: Usage;
}

/**
 * A thought step.
 */
export interface ThoughtStep {
  type: 'thought';
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
  /**
   * A summary of the thought.
   */
  summary?: ThoughtSummaryContent[];
}

/**
 * URL context call step.
 */
export interface URLContextCallStep {
  type: 'url_context_call';
  /**
   * Required. The arguments to pass to the URL context.
   */
  arguments: URLContextCallArguments;
  /**
   * Required. A unique ID for this specific tool call.
   */
  id: string;
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * URL context result step.
 */
export interface URLContextResultStep {
  type: 'url_context_result';
  /**
   * Required. ID to match the ID from the function call block.
   */
  call_id: string;
  /**
   * Whether the URL context resulted in an error.
   */
  is_error?: boolean;
  /**
   * Required. The results of the URL context.
   */
  result: URLContextResult[];
  /**
   * A signature hash for backend validation.
   */
  signature?: string;
}

/**
 * Input provided by the user.
 */
export interface UserInputStep {
  type: 'user_input';
  /**
   * content
   */
  content?: Content[];
}

