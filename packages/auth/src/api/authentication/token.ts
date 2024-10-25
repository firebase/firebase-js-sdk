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

import {
  _getFinalTarget,
  _performFetchWithErrorHandling,
  _performApiRequest,
  _addTidIfNecessary,
  HttpMethod,
  HttpHeader,
  Endpoint
} from '../index';
import { FetchProvider } from '../../core/util/fetch_provider';
import { Auth } from '../../model/public_types';
import { AuthInternal } from '../../model/auth';

export const enum TokenType {
  REFRESH_TOKEN = 'REFRESH_TOKEN',
  ACCESS_TOKEN = 'ACCESS_TOKEN'
}

/** The server responses with snake_case; we convert to camelCase */
interface RequestStsTokenServerResponse {
  access_token: string;
  expires_in: string;
  refresh_token: string;
}

export interface RequestStsTokenResponse {
  accessToken: string;
  expiresIn: string;
  refreshToken: string;
}

export interface RevokeTokenRequest {
  providerId: string;
  tokenType: TokenType;
  token: string;
  idToken: string;
  tenantId?: string;
}

export interface RevokeTokenResponse {}

export async function requestStsToken(
  auth: Auth,
  refreshToken: string
): Promise<RequestStsTokenResponse> {
  const response =
    await _performFetchWithErrorHandling<RequestStsTokenServerResponse>(
      auth,
      {},
      async () => {
        const body = querystring({
          'grant_type': 'refresh_token',
          'refresh_token': refreshToken
        }).slice(1);
        const { tokenApiHost, apiKey } = auth.config;
        const url = _getFinalTarget(
          auth,
          tokenApiHost,
          Endpoint.TOKEN,
          `key=${apiKey}`
        );

        const headers = await (auth as AuthInternal)._getAdditionalHeaders();
        headers[HttpHeader.CONTENT_TYPE] = 'application/x-www-form-urlencoded';

        return FetchProvider.fetch()(url, {
          method: HttpMethod.POST,
          headers,
          body
        });
      }
    );

  // The response comes back in snake_case. Convert to camel:
  return {
    accessToken: response.access_token,
    expiresIn: response.expires_in,
    refreshToken: response.refresh_token
  };
}

export async function revokeToken(
  auth: Auth,
  request: RevokeTokenRequest
): Promise<RevokeTokenResponse> {
  return _performApiRequest<RevokeTokenRequest, RevokeTokenResponse>(
    auth,
    HttpMethod.POST,
    Endpoint.REVOKE_TOKEN,
    _addTidIfNecessary(auth, request)
  );
}
