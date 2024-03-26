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
  CountTokensRequest,
  CountTokensResponse,
  RequestOptions
} from '../types';
import { RequestUrl, Task, makeRequest } from '../requests/request';
import { ApiSettings } from '../types/internal';

export async function countTokens(
  apiSettings: ApiSettings,
  model: string,
  params: CountTokensRequest,
  requestOptions?: RequestOptions
): Promise<CountTokensResponse> {
  const url = new RequestUrl(model, Task.COUNT_TOKENS, apiSettings, false, {});
  const response = await makeRequest(
    url,
    JSON.stringify({ ...params, model }),
    requestOptions
  );
  return response.json();
}
