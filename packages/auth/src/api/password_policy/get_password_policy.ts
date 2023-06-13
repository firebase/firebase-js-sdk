/**
 * @license
 * Copyright 2023 Google LLC
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
  _performApiRequest,
  Endpoint,
  HttpMethod,
  _addTidIfNecessary
} from '../index';
import { Auth } from '../../model/public_types';

export interface GetPasswordPolicyRequest {
  tenantId?: string;
}

export interface GetPasswordPolicyResponse {
  customStrengthOptions: {
    minPasswordLength?: number;
    maxPasswordLength?: number;
    containsLowercaseLetter?: boolean;
    containsUppercaseLetter?: boolean;
    containsNumericCharacter?: boolean;
    containsNonAlphanumericCharacter?: boolean;
  };
  allowedNonAlphanumericCharacters: string[];
  schemaVersion: number;
}

export async function _getPasswordPolicy(
  auth: Auth,
  request: GetPasswordPolicyRequest = {}
): Promise<GetPasswordPolicyResponse> {
  return _performApiRequest<
    GetPasswordPolicyRequest,
    GetPasswordPolicyResponse
  >(
    auth,
    HttpMethod.GET,
    Endpoint.GET_PASSWORD_POLICY,
    _addTidIfNecessary(auth, request)
  );
}
