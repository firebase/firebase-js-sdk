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

import { User } from './user';
import { AuthCredential } from './auth_credential';

export enum OperationType {
  LINK = 'link',
  REAUTHENTICATE = 'reauthenticate',
  SIGN_IN = 'signIn'
}

export class UserCredential {
  constructor(
    public readonly user: User,
    public readonly credential: AuthCredential | null,
    public readonly operationType: OperationType
  ) {}
}
