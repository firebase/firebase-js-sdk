/**
 * @license
 * Copyright 2017 Google Inc.
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
import { FirebaseApp } from '@firebase/app-types';
import { _FirebaseApp } from '@firebase/app-types/private';
import { FirebaseMessaging } from '@firebase/messaging-types';

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
  constructor(private readonly app: FirebaseApp) {}

  async getAuthToken(): Promise<string | undefined> {
    try {
      const token = await (this.app as _FirebaseApp).INTERNAL.getToken();
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
    try {
      // HACK: Until we have a separate instanceId package, this is a quick way
      // to load in the messaging instance for this app.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(this.app as any).messaging) {
        return undefined;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messaging = (this.app as any).messaging() as FirebaseMessaging;
      const token = await messaging.getToken();
      if (!token) {
        return undefined;
      }
      return token;
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
