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

/** @internal */
export type AppName = string;
/** @internal */
export type ApiKey = string;
/** @internal */
export type AuthDomain = string;

/** {@inheritdoc @firebase/auth-types#Config} */
export interface ConfigInternal extends externs.Config {
  /**
   * @internal
   * @readonly
   */
  emulator?: {
    url: string;
  };
}

/** {@inheritdoc @firebase/auth-types#Auth} */
export interface Auth extends externs.Auth {
  /**
   * {@inheritdoc @firebase/auth-types#Auth.currentUser}
   * @readonly
   */
  currentUser: externs.User | null;
  /** @internal */
  _canInitEmulator: boolean;
  /** @internal */
  _isInitialized: boolean;
  /** @internal */
  _initializationPromise: Promise<void> | null;
  /** {@inheritdoc @firebase/auth-types#Auth.updateCurrentUser} */
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

  /** {@inheritdoc @firebase/auth-types#Auth.name} */
  readonly name: AppName;
  /** {@inheritdoc @firebase/auth-types#Auth.config} */
  readonly config: ConfigInternal;
  /**
   * {@inheritdoc @firebase/auth-types#Auth.languageCode}
   * @readonly
   */
  languageCode: string | null;
  /**
   * {@inheritdoc @firebase/auth-types#Auth.tenantId}
   * @readonly
   */
  tenantId: string | null;
  /** {@inheritdoc @firebase/auth-types#Auth.settings} */
  readonly settings: externs.AuthSettings;

  /** {@inheritdoc @firebase/auth-types#Auth.useDeviceLanguage} */
  useDeviceLanguage(): void;
  /** {@inheritdoc @firebase/auth-types#Auth.signOut} */
  signOut(): Promise<void>;
}

export interface Dependencies {
  persistence?: externs.Persistence | externs.Persistence[];
  popupRedirectResolver?: externs.PopupRedirectResolver;
}
