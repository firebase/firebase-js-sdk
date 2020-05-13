/**
 * @license
 * Copyright 2017 Google LLC
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
import { _FirebaseApp } from '@firebase/app-types/private';
import {
  FirebaseMessaging,
  FirebaseMessagingName
} from '@firebase/messaging-types';
import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName
} from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';

/**
 * The metadata that should be supplied with function calls.
 */
export interface Context {
  authToken?: string;
  instanceIdToken?: string;
}

/**
 * Helper class to get metadata that should be included with a function call.
 */
export class ContextProvider {
  private auth: FirebaseAuthInternal | null = null;
  private messaging: FirebaseMessaging | null = null;
  constructor(
    authProvider: Provider<FirebaseAuthInternalName>,
    messagingProvider: Provider<FirebaseMessagingName>
  ) {
    this.auth = authProvider.getImmediate({ optional: true });
    this.messaging = messagingProvider.getImmediate({
      optional: true
    });

    if (!this.auth) {
      authProvider.get().then(
        auth => (this.auth = auth),
        () => {
          /* get() never rejects */
        }
      );
    }

    if (!this.messaging) {
      messagingProvider.get().then(
        messaging => (this.messaging = messaging),
        () => {
          /* get() never rejects */
        }
      );
    }
  }

  async getAuthToken(): Promise<string | undefined> {
    if (!this.auth) {
      return undefined;
    }

    try {
      const token = await this.auth.getToken();
      if (!token) {
        return undefined;
      }
      return token.accessToken;
    } catch (e) {
      // If there's any error when trying to get the auth token, leave it off.
      return undefined;
    }
  }

  async getInstanceIdToken(): Promise<string | undefined> {
    if (
      !this.messaging ||
      !('Notification' in self) ||
      Notification.permission !== 'granted'
    ) {
      return undefined;
    }

    try {
      return this.messaging.getToken();
    } catch (e) {
      // We don't warn on this, because it usually means messaging isn't set up.
      // console.warn('Failed to retrieve instance id token.', e);

      // If there's any error when trying to get the token, leave it off.
      return undefined;
    }
  }

  async getContext(): Promise<Context> {
    const authToken = await this.getAuthToken();
    const instanceIdToken = await this.getInstanceIdToken();
    return { authToken, instanceIdToken };
  }
}
