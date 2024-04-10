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

import { Content } from './content';
import {
  FunctionCallingMode,
  HarmBlockMethod,
  HarmBlockThreshold,
  HarmCategory
} from './enums';

/**
 * Base parameters for a number of methods.
 * @public
 */
export interface BaseParams {
  safetySettings?: SafetySetting[];
  generationConfig?: GenerationConfig;
}

/**
 * Params passed to {@link GoogleGenerativeAI.getGenerativeModel}.
 * @public
 */
export interface ModelParams extends BaseParams {
  model: string;
  tools?: Tool[];
  toolConfig?: ToolConfig;
  systemInstruction?: Content;
}

/**
 * Request sent to `generateContent` endpoint.
 * @public
 */
export interface GenerateContentRequest extends BaseParams {
  contents: Content[];
  tools?: Tool[];
  toolConfig?: ToolConfig;
  systemInstruction?: Content;
}

/**
 * Safety setting that can be sent as part of request parameters.
 * @public
 */
export interface SafetySetting {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
  method: HarmBlockMethod;
}

/**
 * Config options for content-related requests
 * @public
 */
export interface GenerationConfig {
  candidateCount?: number;
  stopSequences?: string[];
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

/**
 * Params for {@link GenerativeModel.startChat}.
 * @public
 */
export interface StartChatParams extends BaseParams {
  history?: Content[];
  tools?: Tool[];
  toolConfig?: ToolConfig;
  systemInstruction?: Content;
}

/**
 * Params for calling {@link GenerativeModel.countTokens}
 * @public
 */
export interface CountTokensRequest {
  contents: Content[];
}

/**
 * Params passed to {@link getGenerativeModel}.
 * @public
 */
export interface RequestOptions {
  /**
   * Request timeout in milliseconds.
   */
  timeout?: number;
  /**
   * Base url for endpoint. Defaults to https://firebaseml.googleapis.com
   */
  baseUrl?: string;
}

/**
 * Defines a tool that model can call to access external knowledge.
 * @public
 */
export declare type Tool = FunctionDeclarationsTool;

/**
 * Structured representation of a function declaration as defined by the
 * [OpenAPI 3.0 specification](https://spec.openapis.org/oas/v3.0.3). Included
 * in this declaration are the function name and parameters. This
 * FunctionDeclaration is a representation of a block of code that can be used
 * as a Tool by the model and executed by the client.
 * @public
 */
export declare interface FunctionDeclaration {
  /**
   * The name of the function to call. Must start with a letter or an
   * underscore. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with
   * a max length of 64.
   */
  name: string;
  /**
   * Optional. Description and purpose of the function. Model uses it to decide
   * how and whether to call the function.
   */
  description?: string;
  /**
   * Optional. Describes the parameters to this function in JSON Schema Object
   * format. Reflects the Open API 3.03 Parameter Object. Parameter names are
   * case sensitive. For a function with no parameters, this can be left unset.
   */
  parameters?: FunctionDeclarationSchema;
}

/**
 * A FunctionDeclarationsTool is a piece of code that enables the system to
 * interact with external systems to perform an action, or set of actions,
 * outside of knowledge and scope of the model.
 * @public
 */
export declare interface FunctionDeclarationsTool {
  /**
   * Optional. One or more function declarations
   * to be passed to the model along with the current user query. Model may
   * decide to call a subset of these functions by populating
   * {@link FunctionCall} in the response. User should
   * provide a {@link FunctionResponse} for each
   * function call in the next turn. Based on the function responses, the model will
   * generate the final response back to the user. Maximum 64 function
   * declarations can be provided.
   */
  functionDeclarations?: FunctionDeclaration[];
}

/**
 * Contains the list of OpenAPI data types
 * as defined by https://swagger.io/docs/specification/data-models/data-types/
 * @public
 */
export enum FunctionDeclarationSchemaType {
  /** String type. */
  STRING = 'STRING',
  /** Number type. */
  NUMBER = 'NUMBER',
  /** Integer type. */
  INTEGER = 'INTEGER',
  /** Boolean type. */
  BOOLEAN = 'BOOLEAN',
  /** Array type. */
  ARRAY = 'ARRAY',
  /** Object type. */
  OBJECT = 'OBJECT'
}

/**
 * Schema for parameters passed to {@link FunctionDeclaration.parameters}.
 * @public
 */
export interface FunctionDeclarationSchema {
  /** The type of the parameter. */
  type: FunctionDeclarationSchemaType;
  /** The format of the parameter. */
  properties: { [k: string]: FunctionDeclarationSchemaProperty };
  /** Optional. Description of the parameter. */
  description?: string;
  /** Optional. Array of required parameters. */
  required?: string[];
}

/**
 * Schema is used to define the format of input/output data.
 * Represents a select subset of an OpenAPI 3.0 schema object.
 * More fields may be added in the future as needed.
 * @public
 */
export interface FunctionDeclarationSchemaProperty {
  /**
   * Optional. The type of the property. {@link
   * FunctionDeclarationSchemaType}.
   */
  type?: FunctionDeclarationSchemaType;
  /** Optional. The format of the property. */
  format?: string;
  /** Optional. The description of the property. */
  description?: string;
  /** Optional. Whether the property is nullable. */
  nullable?: boolean;
  /** Optional. The items of the property. {@link FunctionDeclarationSchema} */
  items?: FunctionDeclarationSchema;
  /** Optional. The enum of the property. */
  enum?: string[];
  /** Optional. Map of {@link FunctionDeclarationSchema}. */
  properties?: { [k: string]: FunctionDeclarationSchema };
  /** Optional. Array of required property. */
  required?: string[];
  /** Optional. The example of the property. */
  example?: unknown;
}

/**
 * Tool config. This config is shared for all tools provided in the request.
 * @public
 */
export interface ToolConfig {
  functionCallingConfig: FunctionCallingConfig;
}

/**
 * @public
 */
export interface FunctionCallingConfig {
  mode?: FunctionCallingMode;
  allowedFunctionNames?: string[];
}
