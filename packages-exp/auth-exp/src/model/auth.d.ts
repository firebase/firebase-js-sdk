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

import * as externs from '@firebase/auth-types-exp';
import { ErrorFn, CompleteFn, Unsubscribe } from '@firebase/util';

import { User } from './user';

export type AppName = string;
export type ApiKey = string;
export type AuthDomain = string;

export interface Auth extends externs.Auth {
  currentUser: User | null;
  readonly name: AppName;
  _isInitialized: boolean;

  updateCurrentUser(user: User | null): Promise<void>;
  onAuthStateChanged(
    nextOrObserver: externs.NextOrObserver<User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
  onIdTokenChanged(
    nextOrObserver: externs.NextOrObserver<User>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
  _notifyListenersIfCurrent(user: User): void;
  _persistUserIfCurrent(user: User): Promise<void>;
}

export interface Dependencies {
  persistence?: externs.Persistence | externs.Persistence[];
}
