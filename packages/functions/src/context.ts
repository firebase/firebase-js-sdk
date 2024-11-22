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

import { Provider } from '@firebase/component';
import { _isFirebaseServerApp, FirebaseApp } from '@firebase/app';
import {
  AppCheckInternalComponentName,
  FirebaseAppCheckInternal
} from '@firebase/app-check-interop-types';
import {
  MessagingInternal,
  MessagingInternalComponentName
} from '@firebase/messaging-interop-types';
import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName
} from '@firebase/auth-interop-types';

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
  private messaging: MessagingInternal | null = null;
  private appCheck: FirebaseAppCheckInternal | null = null;
  private serverAppAppCheckToken: string | null = null;
  constructor(
    readonly app: FirebaseApp,
    authProvider: Provider<FirebaseAuthInternalName>,
    messagingProvider: Provider<MessagingInternalComponentName>,
    appCheckProvider: Provider<AppCheckInternalComponentName>
  ) {
    if (_isFirebaseServerApp(app) && app.settings.appCheckToken) {
      this.serverAppAppCheckToken = app.settings.appCheckToken;
    }
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

  async getAppCheckToken(
    limitedUseAppCheckTokens?: boolean
  ): Promise<string | null> {
    if (this.serverAppAppCheckToken) {
      return this.serverAppAppCheckToken;
    }
    if (this.appCheck) {
      const result = limitedUseAppCheckTokens
        ? await this.appCheck.getLimitedUseToken()
        : await this.appCheck.getToken();
      if (result.error) {
        // Do not send the App Check header to the functions endpoint if
        // there was an error from the App Check exchange endpoint. The App
        // Check SDK will already have logged the error to console.
        return null;
      }
      return result.token;
    }
    return null;
  }

  async getContext(limitedUseAppCheckTokens?: boolean): Promise<Context> {
    const authToken = await this.getAuthToken();
    const messagingToken = await this.getMessagingToken();
    const appCheckToken = await this.getAppCheckToken(limitedUseAppCheckTokens);
    return { authToken, messagingToken, appCheckToken };
  }
}
