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
  BatchEmbedContentsRequest,
  BatchEmbedContentsResponse,
  EmbedContentRequest,
  EmbedContentResponse,
  RequestOptions
} from '../types';
import { RequestUrl, Task, makeRequest } from '../requests/request';
import { ApiSettings } from '../types/internal';

export async function embedContent(
  apiSettings: ApiSettings,
  model: string,
  params: EmbedContentRequest,
  requestOptions?: RequestOptions
): Promise<EmbedContentResponse> {
  const url = new RequestUrl(model, Task.EMBED_CONTENT, apiSettings, false, {});
  const response = await makeRequest(
    url,
    JSON.stringify(params),
    requestOptions
  );
  return response.json();
}

export async function batchEmbedContents(
  apiSettings: ApiSettings,
  model: string,
  params: BatchEmbedContentsRequest,
  requestOptions?: RequestOptions
): Promise<BatchEmbedContentsResponse> {
  const url = new RequestUrl(
    model,
    Task.BATCH_EMBED_CONTENTS,
    apiSettings,
    false,
    {}
  );
  const requestsWithModel: EmbedContentRequest[] = params.requests.map(
    request => {
      return { ...request, model };
    }
  );
  const response = await makeRequest(
    url,
    JSON.stringify({ requests: requestsWithModel }),
    requestOptions
  );
  return response.json();
}
