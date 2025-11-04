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

import { AIError } from '../errors';
import {
  CountTokensRequest,
  CountTokensResponse,
  SingleRequestOptions,
  InferenceMode,
  RequestOptions,
  AIErrorCode
} from '../types';
import { Task, makeRequest } from '../requests/request';
import { ApiSettings } from '../types/internal';
import * as GoogleAIMapper from '../googleai-mappers';
import { BackendType } from '../public-types';
import { ChromeAdapter } from '../types/chrome-adapter';

export async function countTokensOnCloud(
  apiSettings: ApiSettings,
  model: string,
  params: CountTokensRequest,
  singleRequestOptions?: SingleRequestOptions
): Promise<CountTokensResponse> {
  let body: string = '';
  if (apiSettings.backend.backendType === BackendType.GOOGLE_AI) {
    const mappedParams = GoogleAIMapper.mapCountTokensRequest(params, model);
    body = JSON.stringify(mappedParams);
  } else {
    body = JSON.stringify(params);
  }
  const response = await makeRequest(
    model,
    Task.COUNT_TOKENS,
    apiSettings,
    false,
    body,
    singleRequestOptions
  );
  return response.json();
}

export async function countTokens(
  apiSettings: ApiSettings,
  model: string,
  params: CountTokensRequest,
  chromeAdapter?: ChromeAdapter,
  requestOptions?: RequestOptions
): Promise<CountTokensResponse> {
  if (chromeAdapter?.mode === InferenceMode.ONLY_ON_DEVICE) {
    throw new AIError(
      AIErrorCode.UNSUPPORTED,
      'countTokens() is not supported for on-device models.'
    );
  }
  return countTokensOnCloud(apiSettings, model, params, requestOptions);
}
