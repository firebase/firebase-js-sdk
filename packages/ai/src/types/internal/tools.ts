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

import type { Function, MCPServer, Retrieval, ToolChoiceConfig, URLContext } from './interaction';


/**
 * A tool that can be used by the model.
 */
export type Tool =
  | CodeExecution
  | ComputerUse
  | FileSearch
  | Function
  | GoogleMaps
  | GoogleSearch
  | MCPServer
  | Retrieval
  | URLContext
;

/**
 * The tool choice configuration.
 */
export type ToolChoice =
  | ToolChoiceConfig
  | string
;


/**
 * A tool that can be used by the model to execute code.
 */
export interface CodeExecution {
  type: 'code_execution';
}

/**
 * A tool that can be used by the model to interact with the computer.
 */
export interface ComputerUse {
  type: 'computer_use';
  /**
   * Optional. Disabled safety policies for computer use.
   */
  disabled_safety_policies?: string[];
  /**
   * Whether enable the prompt injection detection check on computer-use
request.
   */
  enable_prompt_injection_detection?: boolean;
  /**
   * The environment being operated.
   */
  environment?: string;
  /**
   * The list of predefined functions that are excluded from the model call.
   */
  excluded_predefined_functions?: string[];
}

/**
 * A tool that can be used by the model to search files.
 */
export interface FileSearch {
  type: 'file_search';
  /**
   * The file search store names to search.
   */
  file_search_store_names?: string[];
  /**
   * Metadata filter to apply to the semantic retrieval documents and chunks.
   */
  metadata_filter?: string;
  /**
   * The number of semantic retrieval chunks to retrieve.
   */
  top_k?: number;
}

/**
 * A tool that can be used by the model to call Google Maps.
 */
export interface GoogleMaps {
  type: 'google_maps';
  /**
   * Whether to return a widget context token in the tool call result of the
response.
   */
  enable_widget?: boolean;
  /**
   * The latitude of the user's location.
   */
  latitude?: number;
  /**
   * The longitude of the user's location.
   */
  longitude?: number;
}

/**
 * A tool that can be used by the model to search Google.
 */
export interface GoogleSearch {
  type: 'google_search';
  /**
   * The types of search grounding to enable.
   */
  search_types?: string[];
}

