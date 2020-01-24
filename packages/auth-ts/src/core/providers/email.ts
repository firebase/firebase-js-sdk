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

import { AuthProvider } from '.';
import { AuthCredential } from '../../model/auth_credential';

export class EmailAuthProvider implements AuthProvider {
  static readonly PROVIDER_ID: string;
  static readonly EMAIL_PASSWORD_SIGN_IN_METHOD: string;
  static readonly EMAIL_LINK_SIGN_IN_METHOD: string;
  readonly providerId: string = 'email';
  static credential(email: string, password: string): AuthCredential {
    throw new Error('not implemented');
  }
  static credentialWithLink(email: string, emailLink: string): AuthCredential {
    throw new Error('not implemented');
  }
}
