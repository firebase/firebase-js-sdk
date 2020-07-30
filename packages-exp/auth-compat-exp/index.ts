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
import { _FirebaseNamespace } from '@firebase/app-types/private';
import * as externs from '@firebase/auth-types-exp';
import {
  Component,
  ComponentType,
  InstantiationMode
} from '@firebase/component';
import '@firebase/installations';
import { name, version } from './package.json';
import { Auth } from './src/auth';

const AUTH_TYPE = 'auth';

// Create auth components to register with firebase.
// Provides Auth public APIs.
function registerAuth(instance: _FirebaseNamespace): void {
  instance.INTERNAL.registerComponent(
    new Component(
      AUTH_TYPE,
      container => {
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        return new Auth(app);
      },
      ComponentType.PUBLIC
    )
      .setServiceProps({
        ActionCodeInfo: {
          Operation: {
            EMAIL_SIGNIN: externs.Operation.EMAIL_SIGNIN,
            PASSWORD_RESET: externs.Operation.PASSWORD_RESET,
            RECOVER_EMAIL: externs.Operation.RECOVER_EMAIL,
            REVERT_SECOND_FACTOR_ADDITION:
              externs.Operation.REVERT_SECOND_FACTOR_ADDITION,
            VERIFY_AND_CHANGE_EMAIL: externs.Operation.VERIFY_AND_CHANGE_EMAIL,
            VERIFY_EMAIL: externs.Operation.VERIFY_EMAIL
          }
        }
        // TODO(avolkovi): Expose the other top level properties
        //   EmailAuthProvider,
        //   FacebookAuthProvider,
        //   GithubAuthProvider,
        //   GoogleAuthProvider,
        //   OAuthProvider,
        //   SAMLAuthProvider,
        //   PhoneAuthProvider,
        //   RecaptchaVerifier,
        //   TwitterAuthProvider,
        //   Auth: {
        //     Persistence
        //   }
        //   'AuthCredential': fireauth.AuthCredential,
        //   'Error': fireauth.AuthError
      })
      .setInstantiationMode(InstantiationMode.LAZY)
      .setMultipleInstances(false)
  );

  instance.registerVersion(name, version);
}

registerAuth(firebase as _FirebaseNamespace);
