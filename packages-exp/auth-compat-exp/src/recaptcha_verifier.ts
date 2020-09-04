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

import firebase from '@firebase/app';
import { FirebaseApp } from '@firebase/app-types';
import * as impl from '@firebase/auth-exp/internal';
import * as compat from '@firebase/auth-types';
import * as externs from '@firebase/auth-types-exp';

export class RecaptchaVerifier
  extends impl.RecaptchaVerifier
  implements compat.RecaptchaVerifier {
  constructor(
    container: HTMLElement | string,
    parameters?: object | null,
    app: FirebaseApp = firebase.app()
  ) {
    // API key is required for web client RPC calls.
    impl.assertFn(app.options?.apiKey, impl.AuthErrorCode.INVALID_API_KEY, {
      appName: app.name
    });
    super(
      container,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parameters as any,
      (app.auth!() as unknown) as externs.Auth
    );
  }
}
