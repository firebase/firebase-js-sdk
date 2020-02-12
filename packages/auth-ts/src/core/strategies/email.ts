/**
 * @license
 * Copyright 2019 Google Inc.
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

import { Auth } from '../../model/auth';
import { getCurrentUrl, isHttpOrHttps } from '../util/location';
import { CreateAuthUriRequest, createAuthUri } from '../../api/authentication';

export async function fetchSignInMethodsForEmail(
  auth: Auth,
  email: string
): Promise<string[]> {
  // createAuthUri returns an error if continue URI is not http or https.
  // For environments like Cordova, Chrome extensions, native frameworks, file
  // systems, etc, use http://localhost as continue URL.
  const continueUri = isHttpOrHttps() ? getCurrentUrl() : 'http://localhost';
  const request: CreateAuthUriRequest = {
    identifier: email,
    continueUri
  };

  const response = await createAuthUri(auth, request);

  return response.signinMethods || [];
}
