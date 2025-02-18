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

import {
  GenerateContentRequest,
  GenerateContentResponse,
  GenerateContentResult,
  GenerateContentStreamResult,
  RequestOptions
} from '../types';
import { Task, makeRequest } from '../requests/request';
import { createEnhancedContentResponse } from '../requests/response-helpers';
import { processStream } from '../requests/stream-reader';
import { ApiSettings } from '../types/internal';
import * as DeveloperAPIMapper from '../developerAPI'; // FIXME: (code smell) Is there a better way to namespace this?

export async function generateContentStream(
  apiSettings: ApiSettings,
  model: string,
  params: GenerateContentRequest,
  requestOptions?: RequestOptions
): Promise<GenerateContentStreamResult> {
  if (apiSettings.backend.backendType === "GOOGLE_AI") {
    params = DeveloperAPIMapper.mapGenerateContentRequest(params);
  }
  const response = await makeRequest(
    model,
    Task.STREAM_GENERATE_CONTENT,
    apiSettings,
    /* stream */ true,
    JSON.stringify(params),
    requestOptions
  );
  return processStream(response, apiSettings); // TODO: Map streaming responses
}

export async function generateContent(
  apiSettings: ApiSettings,
  model: string,
  params: GenerateContentRequest,
  requestOptions?: RequestOptions
): Promise<GenerateContentResult> {
  if (apiSettings.backend.backendType === "GOOGLE_AI") {
    params = DeveloperAPIMapper.mapGenerateContentRequest(params);
  }
  const response = await makeRequest(
    model,
    Task.GENERATE_CONTENT,
    apiSettings,
    /* stream */ false,
    JSON.stringify(params),
    requestOptions
  );
  const generateContentResponse = await handleGenerateContentResponse(
    response,
    apiSettings
  );
  const enhancedResponse = createEnhancedContentResponse(
    generateContentResponse
  );
  return {
    response: enhancedResponse
  };
}

async function handleGenerateContentResponse(
  response: Response,
  apiSettings: ApiSettings
): Promise<GenerateContentResponse> {
  const responseJson = await response.json();
  if (apiSettings.backend.backendType === "GOOGLE_AI") {
    return DeveloperAPIMapper.mapGenerateContentResponse(responseJson);
  } else {
    return responseJson;
  }
}
