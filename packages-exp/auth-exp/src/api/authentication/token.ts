/**
 * @license
 * Copyright 2020 Google LLC
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

/* eslint-disable camelcase */

import { querystring } from '@firebase/util';

import { _getFinalTarget, _performFetchWithErrorHandling, HttpMethod } from '../';
import { FetchProvider } from '../../core/util/fetch_provider';
import { AuthCore } from '../../model/auth';

export const _ENDPOINT = 'v1/token';
const GRANT_TYPE = 'refresh_token';

/** The server responses with snake_case; we convert to camelCase */
interface RequestStsTokenServerResponse {
  access_token?: string;
  expires_in?: string;
  refresh_token?: string;
}

export interface RequestStsTokenResponse {
  accessToken?: string;
  expiresIn?: string;
  refreshToken?: string;
}

export async function requestStsToken(
  auth: AuthCore,
  refreshToken: string
): Promise<RequestStsTokenResponse> {
  const response = await _performFetchWithErrorHandling<
    RequestStsTokenServerResponse
  >(auth, {}, () => {
    const body = querystring({
      'grant_type': GRANT_TYPE,
      'refresh_token': refreshToken
    }).slice(1);
    const { apiScheme, tokenApiHost, apiKey, sdkClientVersion } = auth.config;
    const url = _getFinalTarget(auth, `${apiScheme}://${tokenApiHost}/${_ENDPOINT}`);

    return FetchProvider.fetch()(`${url}?key=${apiKey}`, {
      method: HttpMethod.POST,
      headers: {
        'X-Client-Version': sdkClientVersion,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });
  });

  // The response comes back in snake_case. Convert to camel:
  return {
    accessToken: response.access_token,
    expiresIn: response.expires_in,
    refreshToken: response.refresh_token
  };
}
