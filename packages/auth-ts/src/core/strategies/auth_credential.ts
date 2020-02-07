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
import { UserCredential, OperationType } from '../../model/user_credential';
import { ProviderId } from '../providers';
import { Auth } from '../..';
import { User } from '../../model/user';

export interface AuthCredential {
  readonly providerId: ProviderId;
  readonly signInMethod: string;
  toJSON(): object;
}

export interface OAuthCredential extends AuthCredential {
  readonly idToken?: string;
  readonly accessToken?: string;
  readonly secret?: string;
  toJSON(): object;
}

// TODO: can we do this without passing in user?
export async function signInWithCredential(auth: Auth, credential: AuthCredential, user: User): Promise<UserCredential> {
  await auth.setCurrentUser(user);
  return new UserCredential(user, credential.providerId, OperationType.SIGN_IN);
}