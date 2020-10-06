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

import { PopupRedirectResolver } from './popup_redirect';
import { User } from './user';

export type AppName = string;
export type ApiKey = string;
export type AuthDomain = string;

export interface ConfigInternal extends externs.Config {
  emulator?: {
    hostname: string;
    port: number;
  };
}

export interface Auth extends externs.Auth {
  currentUser: externs.User | null;
  _canInitEmulator: boolean;
  _isInitialized: boolean;
  _initializationPromise: Promise<void> | null;
  updateCurrentUser(user: User | null): Promise<void>;

  _onStorageEvent(): void;

  _notifyListenersIfCurrent(user: User): void;
  _persistUserIfCurrent(user: User): Promise<void>;
  _setRedirectUser(
    user: User | null,
    popupRedirectResolver?: externs.PopupRedirectResolver
  ): Promise<void>;
  _redirectUserForId(id: string): Promise<User | null>;
  _popupRedirectResolver: PopupRedirectResolver | null;
  _key(): string;
  _startProactiveRefresh(): void;
  _stopProactiveRefresh(): void;

  readonly name: AppName;
  readonly config: ConfigInternal;
  languageCode: string | null;
  tenantId: string | null;
  readonly settings: externs.AuthSettings;

  useDeviceLanguage(): void;
  signOut(): Promise<void>;
}

export interface Dependencies {
  persistence?: externs.Persistence | externs.Persistence[];
  popupRedirectResolver?: externs.PopupRedirectResolver;
}
