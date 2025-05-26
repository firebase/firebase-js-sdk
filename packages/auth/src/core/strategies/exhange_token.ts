/**
 * @license
 * Copyright 2025 Google LLC
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

import { Auth } from '../../model/public_types';
import { _isFirebaseServerApp } from '@firebase/app';
import { exchangeToken as getToken } from '../../api/authentication/exchange_token';
import { _serverAppCurrentUserOperationNotSupportedError } from '../../core/util/assert';
import { EXCHANGE_TOKEN_PARENT } from '../../api';
import { _castAuth } from '../auth/auth_impl';

/**
 * Asynchronously exchanges an OIDC provider's Authorization code or Id Token
 * for a Firebase Token.
 *
 * @remarks
 * This method is implemented only for `DefaultConfig.REGIONAL_API_HOST` and
 * requires {@link TenantConfig} to be configured in the {@link Auth} instance used.
 *
 * Fails with an error if the token is invalid, expired, or not accepted by the Firebase Auth service.
 *
 * @param auth - The {@link Auth} instance.
 * @param idpConfigId - The ExternalUserDirectoryId corresponding to the OIDC custom Token.
 * @param customToken - The OIDC provider's Authorization code or Id Token to exchange.
 * @returns The firebase access token (JWT signed by Firebase Auth).
 *
 * @public
 */
export async function exchangeToken(
  auth: Auth,
  idpConfigId: string,
  customToken: string
): Promise<string> {
  if (_isFirebaseServerApp(auth.app)) {
    return Promise.reject(
      _serverAppCurrentUserOperationNotSupportedError(auth)
    );
  }
  const authInternal = _castAuth(auth);
  const token = await getToken(authInternal, {
    parent: buildParent(auth, idpConfigId),
    token: customToken
  });
  if (token) {
    await authInternal._updateFirebaseToken({
      token: token.accessToken,
      expirationTime: Date.now() + token.expiresIn * 1000
    });
  }
  return token.accessToken;
}

function buildParent(auth: Auth, idpConfigId: string): string {
  return EXCHANGE_TOKEN_PARENT.replace(
    '${projectId}',
    auth.app.options.projectId ?? ''
  )
    .replace('${location}', auth.tenantConfig?.location ?? '')
    .replace('${tenantId}', auth.tenantConfig?.tenantId ?? '')
    .replace('${idpConfigId}', idpConfigId);
}
