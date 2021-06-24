import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName
} from '@firebase/auth-interop-types';
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
import {
  FirebaseMessaging,
  FirebaseMessagingName
} from '@firebase/messaging-types';

import { Provider } from '@firebase/component';
import {
  AppCheckInternalComponentName,
  FirebaseAppCheckInternal
} from '@firebase/app-check-interop-types';

/**
 * The metadata that should be supplied with function calls.
 * @internal
 */
export interface Context {
  authToken?: string;
  messagingToken?: string;
  appCheckToken: string | null;
}

/**
 * Helper class to get metadata that should be included with a function call.
 * @internal
 */
export class ContextProvider {
  private auth: FirebaseAuthInternal | null = null;
  private messaging: FirebaseMessaging | null = null;
  private appCheck: FirebaseAppCheckInternal | null = null;
  constructor(
    authProvider: Provider<FirebaseAuthInternalName>,
    messagingProvider: Provider<FirebaseMessagingName>,
    appCheckProvider: Provider<AppCheckInternalComponentName>
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

    if (!this.appCheck) {
      appCheckProvider.get().then(
        appCheck => (this.appCheck = appCheck),
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
      return token?.accessToken;
    } catch (e) {
      // If there's any error when trying to get the auth token, leave it off.
      return undefined;
    }
  }

  async getMessagingToken(): Promise<string | undefined> {
    if (
      !this.messaging ||
      !('Notification' in self) ||
      Notification.permission !== 'granted'
    ) {
      return undefined;
    }

    try {
      return await this.messaging.getToken();
    } catch (e) {
      // We don't warn on this, because it usually means messaging isn't set up.
      // console.warn('Failed to retrieve instance id token.', e);

      // If there's any error when trying to get the token, leave it off.
      return undefined;
    }
  }

  async getAppCheckToken(): Promise<string | null> {
    if (this.appCheck) {
      const result = await this.appCheck.getToken();
      // If getToken() fails, it will still return a dummy token that also has
      // an error field containing the error message. We will send any token
      // provided here and show an error if/when it is rejected by the functions
      // endpoint.
      return result.token;
    }
    return null;
  }

  async getContext(): Promise<Context> {
    const authToken = await this.getAuthToken();
    const messagingToken = await this.getMessagingToken();
    const appCheckToken = await this.getAppCheckToken();
    return { authToken, messagingToken, appCheckToken };
  }
}
