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

import { querystring } from '@firebase/util';

import { performFetchWithErrorHandling } from '../';
import { Auth } from '../../model/auth';

const ENDPOINT = 'https://securetoken.googleapis.com/v1/token';
const GRANT_TYPE = 'refresh_token';

export interface RequestStsTokenResponse {
  access_token?: string;
  expires_in?: string;
  token_type?: string;
  refresh_token?: string;
  id_token?: string;
  user_id?: string;
  project_id?: string;
}

export async function requestStsToken(auth: Auth, refreshToken: string): Promise<RequestStsTokenResponse> {
  return performFetchWithErrorHandling<RequestStsTokenResponse>(auth, {}, () => {
    const body = querystring({
      'grant_type': GRANT_TYPE,
      'refresh_token': refreshToken,
    }).slice(1);

    return fetch(`${ENDPOINT}?key=${auth.config.apiKey}`, {
      method: 'POST',
      headers: {
        'X-Client-Version': auth.config.sdkClientVersion,
      },
      body,
    });
  });
}