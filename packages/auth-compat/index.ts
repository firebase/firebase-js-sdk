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

/* eslint-disable camelcase */

import firebase, { _FirebaseNamespace } from '@firebase/app-compat';
import * as impl from '@firebase/auth/internal';
import {
  Component,
  ComponentType,
  InstantiationMode
} from '@firebase/component';
import { FirebaseError } from '@firebase/util';

import * as types from '@firebase/auth-types';
import { name, version } from './package.json';
import { Auth } from './src/auth';
import { PhoneAuthProvider as CompatAuthProvider } from './src/phone_auth_provider';
import { RecaptchaVerifier as CompatRecaptchaVerifier } from './src/recaptcha_verifier';

const AUTH_TYPE = 'auth-compat';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'auth-compat': types.FirebaseAuth;
  }
}

declare module '@firebase/app-compat' {
  interface FirebaseNamespace {
    auth: {
      (app?: FirebaseApp): types.FirebaseAuth;
      Auth: typeof types.FirebaseAuth;
      EmailAuthProvider: typeof types.EmailAuthProvider;
      EmailAuthProvider_Instance: typeof types.EmailAuthProvider_Instance;
      FacebookAuthProvider: typeof types.FacebookAuthProvider;
      FacebookAuthProvider_Instance: typeof types.FacebookAuthProvider_Instance;
      GithubAuthProvider: typeof types.GithubAuthProvider;
      GithubAuthProvider_Instance: typeof types.GithubAuthProvider_Instance;
      GoogleAuthProvider: typeof types.GoogleAuthProvider;
      GoogleAuthProvider_Instance: typeof types.GoogleAuthProvider_Instance;
      OAuthProvider: typeof types.OAuthProvider;
      SAMLAuthProvider: typeof types.SAMLAuthProvider;
      PhoneAuthProvider: typeof types.PhoneAuthProvider;
      PhoneAuthProvider_Instance: typeof types.PhoneAuthProvider_Instance;
      PhoneMultiFactorGenerator: typeof types.PhoneMultiFactorGenerator;
      RecaptchaVerifier: typeof types.RecaptchaVerifier;
      RecaptchaVerifier_Instance: typeof types.RecaptchaVerifier_Instance;
      TwitterAuthProvider: typeof types.TwitterAuthProvider;
      TwitterAuthProvider_Instance: typeof types.TwitterAuthProvider_Instance;
    };
  }
  interface FirebaseApp {
    auth?(): types.FirebaseAuth;
  }
}

// Create auth components to register with firebase.
// Provides Auth public APIs.
function registerAuthCompat(instance: _FirebaseNamespace): void {
  instance.INTERNAL.registerComponent(
    new Component(
      AUTH_TYPE,
      container => {
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app-compat').getImmediate();
        const authProvider = container.getProvider('auth');
        return new Auth(app, authProvider);
      },
      ComponentType.PUBLIC
    )
      .setServiceProps({
        ActionCodeInfo: {
          Operation: {
            EMAIL_SIGNIN: impl.ActionCodeOperation.EMAIL_SIGNIN,
            PASSWORD_RESET: impl.ActionCodeOperation.PASSWORD_RESET,
            RECOVER_EMAIL: impl.ActionCodeOperation.RECOVER_EMAIL,
            REVERT_SECOND_FACTOR_ADDITION:
              impl.ActionCodeOperation.REVERT_SECOND_FACTOR_ADDITION,
            VERIFY_AND_CHANGE_EMAIL:
              impl.ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL,
            VERIFY_EMAIL: impl.ActionCodeOperation.VERIFY_EMAIL
          }
        },
        EmailAuthProvider: impl.EmailAuthProvider,
        FacebookAuthProvider: impl.FacebookAuthProvider,
        GithubAuthProvider: impl.GithubAuthProvider,
        GoogleAuthProvider: impl.GoogleAuthProvider,
        OAuthProvider: impl.OAuthProvider,
        SAMLAuthProvider: impl.SAMLAuthProvider,
        PhoneAuthProvider: CompatAuthProvider,
        PhoneMultiFactorGenerator: impl.PhoneMultiFactorGenerator,
        RecaptchaVerifier: CompatRecaptchaVerifier,
        TwitterAuthProvider: impl.TwitterAuthProvider,
        Auth,
        AuthCredential: impl.AuthCredential,
        Error: FirebaseError
      })
      .setInstantiationMode(InstantiationMode.LAZY)
      .setMultipleInstances(false)
  );

  instance.registerVersion(name, version);
}

registerAuthCompat(firebase as _FirebaseNamespace);
