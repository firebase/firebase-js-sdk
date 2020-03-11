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
import { Persistence } from '../core/persistence';
import {
  Observer,
  CompleteFn,
  NextFn,
  ErrorFn,
  Unsubscribe
} from '@firebase/util';
import { PopupRedirectResolver } from './popup_redirect_resolver';

export interface AuthSettings {
  appVerificationDisabledForTesting: boolean;
}

export type AppName = string;
export type ApiKey = string;
export type AuthDomain = string;
export type LanguageCode = string;

export interface Config {
  apiKey: ApiKey;
  authDomain?: AuthDomain;
}

export interface Dependencies {
  // When not provided, in memory persistence is used. Sequence of persistences can also be provided.
  persistence?: Persistence | Persistence[];
  // Popup/Redirect resolver is needed to resolve pending OAuth redirect
  // operations. It can be quite complex and has been separated from Auth.
  // It is also needed for popup operations (same underlying logic).
  popupRedirectResolver?: PopupRedirectResolver;
}

export interface Auth {
  readonly name: string;
  readonly settings: AuthSettings;
  readonly config: Config;
  currentUser: User | null;
  readonly popupRedirectResolver?: PopupRedirectResolver;
  languageCode: LanguageCode | null;
  tenantId: string | null;

  isInitialized(): Promise<void>;
  setPersistence(persistence: Persistence): Promise<void>;
  onIdTokenChanged(
    nextOrObserver: NextFn<User | null> | Observer<User | null>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
  onAuthStateChanged(
    nextOrObserver: NextFn<User | null> | Observer<User | null>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
  useDeviceLanguage(): void;
  updateCurrentUser(user: User | null): Promise<void>;
  signOut(): Promise<void>;
}
