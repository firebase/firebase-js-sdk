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
import { ErrorFactory } from '@firebase/util';
import { AuthErrorCode, AuthErrorParams } from '../core/errors';

import { PopupRedirectResolver } from './popup_redirect';
import { User } from './user';

/** @internal */
export type AppName = string;
/** @internal */
export type ApiKey = string;
/** @internal */
export type AuthDomain = string;

/** @internal */
export interface ConfigInternal extends externs.Config {
  /**
   * @internal
   * @readonly
   */
  emulator?: {
    url: string;
  };
}

/** @internal */
export interface Auth extends externs.Auth {
  /** @internal */
  currentUser: externs.User | null;
  /** @internal */
  _canInitEmulator: boolean;
  /** @internal */
  _isInitialized: boolean;
  /** @internal */
  _initializationPromise: Promise<void> | null;
  /** @internal */
  _updateCurrentUser(user: User | null): Promise<void>;

  /** @internal */
  _onStorageEvent(): void;

  /** @internal */
  _notifyListenersIfCurrent(user: User): void;
  /** @internal */
  _persistUserIfCurrent(user: User): Promise<void>;
  /** @internal */
  _setRedirectUser(
    user: User | null,
    popupRedirectResolver?: externs.PopupRedirectResolver
  ): Promise<void>;
  /** @internal */
  _redirectUserForId(id: string): Promise<User | null>;
  /** @internal */
  _popupRedirectResolver: PopupRedirectResolver | null;
  /** @internal */
  _key(): string;
  /** @internal */
  _startProactiveRefresh(): void;
  /** @internal */
  _stopProactiveRefresh(): void;
  _getPersistence(): string;

  /** @internal */
  readonly name: AppName;
  /** @internal */
  readonly config: ConfigInternal;
  /** @internal */
  languageCode: string | null;
  /** @internal */
  tenantId: string | null;
  /** @internal */
  readonly settings: externs.AuthSettings;
  _errorFactory: ErrorFactory<AuthErrorCode, AuthErrorParams>;

  /** @internal */
  useDeviceLanguage(): void;
  /** @internal */
  signOut(): Promise<void>;
}

export interface Dependencies {
  persistence?: externs.Persistence | externs.Persistence[];
  popupRedirectResolver?: externs.PopupRedirectResolver;
  errorMap?: externs.AuthErrorMap;
}
