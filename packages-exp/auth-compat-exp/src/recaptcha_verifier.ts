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

import firebase from '@firebase/app-compat';
import { FirebaseApp } from '@firebase/app-types';
import * as impl from '@firebase/auth-exp/internal';
import * as compat from '@firebase/auth-types';
import * as externs from '@firebase/auth-types-exp';
import { unwrap, Wrapper } from './wrap';

const _assert: typeof impl._assert = impl._assert;

export class RecaptchaVerifier
  implements compat.RecaptchaVerifier, Wrapper<externs.ApplicationVerifier> {
  readonly verifier: externs.RecaptchaVerifier;
  type: string;
  constructor(
    container: HTMLElement | string,
    parameters?: object | null,
    app: FirebaseApp = firebase.app()
  ) {
    // API key is required for web client RPC calls.
    _assert(app.options?.apiKey, impl.AuthErrorCode.INVALID_API_KEY, {
      appName: app.name
    });
    this.verifier = new impl.RecaptchaVerifier(
      container,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parameters as any,

      unwrap(app.auth!())
    );
    this.type = this.verifier.type;
  }
  clear(): void {
    this.verifier.clear();
  }
  render(): Promise<number> {
    return this.verifier.render();
  }
  verify(): Promise<string> {
    return this.verifier.verify();
  }
  unwrap(): externs.ApplicationVerifier {
    return this.verifier;
  }
}
