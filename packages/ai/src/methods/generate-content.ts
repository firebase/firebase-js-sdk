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
  SingleRequestOptions
} from '../types';
import {
  makeRequest,
  ServerPromptTemplateTask,
  Task
} from '../requests/request';
import { createEnhancedContentResponse } from '../requests/response-helpers';
import { processStream } from '../requests/stream-reader';
import { ApiSettings } from '../types/internal';
import * as GoogleAIMapper from '../googleai-mappers';
import { BackendType } from '../public-types';
import { ChromeAdapter } from '../types/chrome-adapter';
import { callCloudOrDevice } from '../requests/hybrid-helpers';

async function generateContentStreamOnCloud(
  apiSettings: ApiSettings,
  model: string,
  params: GenerateContentRequest,
  singleRequestOptions?: SingleRequestOptions
): Promise<Response> {
  if (apiSettings.backend.backendType === BackendType.GOOGLE_AI) {
    params = GoogleAIMapper.mapGenerateContentRequest(params);
  }
  return makeRequest(
    {
      task: Task.STREAM_GENERATE_CONTENT,
      model,
      apiSettings,
      stream: true,
      singleRequestOptions
    },
    JSON.stringify(params)
  );
}

export async function generateContentStream(
  apiSettings: ApiSettings,
  model: string,
  params: GenerateContentRequest,
  chromeAdapter?: ChromeAdapter,
  singleRequestOptions?: SingleRequestOptions
): Promise<
  GenerateContentStreamResult & { firstValue?: GenerateContentResponse }
> {
  const callResult = await callCloudOrDevice(
    params,
    chromeAdapter,
    () => chromeAdapter!.generateContentStream(params),
    () =>
      generateContentStreamOnCloud(
        apiSettings,
        model,
        params,
        singleRequestOptions
      )
  );
  return processStream(
    callResult.response,
    apiSettings,
    callResult.inferenceSource
  );
}

async function generateContentOnCloud(
  apiSettings: ApiSettings,
  model: string,
  params: GenerateContentRequest,
  singleRequestOptions?: SingleRequestOptions
): Promise<Response> {
  if (apiSettings.backend.backendType === BackendType.GOOGLE_AI) {
    params = GoogleAIMapper.mapGenerateContentRequest(params);
  }
  return makeRequest(
    {
      model,
      task: Task.GENERATE_CONTENT,
      apiSettings,
      stream: false,
      singleRequestOptions
    },
    JSON.stringify(params)
  );
}

export async function templateGenerateContent(
  apiSettings: ApiSettings,
  templateId: string,
  templateParams: object,
  singleRequestOptions?: SingleRequestOptions
): Promise<GenerateContentResult> {
  const response = await makeRequest(
    {
      task: ServerPromptTemplateTask.TEMPLATE_GENERATE_CONTENT,
      templateId,
      apiSettings,
      stream: false,
      singleRequestOptions
    },
    JSON.stringify(templateParams)
  );
  const generateContentResponse = await processGenerateContentResponse(
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

export async function templateGenerateContentStream(
  apiSettings: ApiSettings,
  templateId: string,
  templateParams: object,
  singleRequestOptions?: SingleRequestOptions
): Promise<GenerateContentStreamResult> {
  const response = await makeRequest(
    {
      task: ServerPromptTemplateTask.TEMPLATE_STREAM_GENERATE_CONTENT,
      templateId,
      apiSettings,
      stream: true,
      singleRequestOptions
    },
    JSON.stringify(templateParams)
  );
  return processStream(response, apiSettings);
}

export async function generateContent(
  apiSettings: ApiSettings,
  model: string,
  params: GenerateContentRequest,
  chromeAdapter?: ChromeAdapter,
  singleRequestOptions?: SingleRequestOptions
): Promise<GenerateContentResult> {
  const callResult = await callCloudOrDevice(
    params,
    chromeAdapter,
    () => chromeAdapter!.generateContent(params),
    () =>
      generateContentOnCloud(apiSettings, model, params, singleRequestOptions)
  );
  const generateContentResponse = await processGenerateContentResponse(
    callResult.response,
    apiSettings
  );
  const enhancedResponse = createEnhancedContentResponse(
    generateContentResponse,
    callResult.inferenceSource
  );
  return {
    response: enhancedResponse
  };
}

async function processGenerateContentResponse(
  response: Response,
  apiSettings: ApiSettings
): Promise<GenerateContentResponse> {
  const responseJson = await response.json();
  if (apiSettings.backend.backendType === BackendType.GOOGLE_AI) {
    return GoogleAIMapper.mapGenerateContentResponse(responseJson);
  } else {
    return responseJson;
  }
}
