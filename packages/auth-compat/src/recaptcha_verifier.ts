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

import firebase, { FirebaseApp } from '@firebase/app-compat';
import * as exp from '@firebase/auth/internal';
import * as compat from '@firebase/auth-types';
import { Compat } from '@firebase/util';

const _assert: typeof exp._assert = exp._assert;

export class RecaptchaVerifier
  implements compat.RecaptchaVerifier, Compat<exp.ApplicationVerifier>
{
  readonly _delegate: exp.RecaptchaVerifier;
  type: string;
  constructor(
    container: HTMLElement | string,
    parameters?: object | null,
    app: FirebaseApp = firebase.app()
  ) {
    // API key is required for web client RPC calls.
    _assert(app.options?.apiKey, exp.AuthErrorCode.INVALID_API_KEY, {
      appName: app.name
    });
    this._delegate = new exp.RecaptchaVerifier(
      // TODO: remove ts-ignore when moving types from auth-types to auth-compat
      // @ts-ignore
      app.auth!(),
      container,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parameters as any
    );
    this.type = this._delegate.type;
  }
  clear(): void {
    this._delegate.clear();
  }
  render(): Promise<number> {
    return this._delegate.render();
  }
  verify(): Promise<string> {
    return this._delegate.verify();
  }
}
