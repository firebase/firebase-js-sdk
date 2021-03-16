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
import * as impl from '@firebase/auth-exp/internal';
import * as externs from '@firebase/auth-exp';
import {
  Component,
  ComponentType,
  InstantiationMode
} from '@firebase/component';

import {
  EmailAuthProvider,
  EmailAuthProvider_Instance,
  FacebookAuthProvider,
  FacebookAuthProvider_Instance,
  FirebaseAuth,
  GithubAuthProvider,
  GithubAuthProvider_Instance,
  GoogleAuthProvider,
  GoogleAuthProvider_Instance,
  OAuthProvider,
  PhoneAuthProvider,
  PhoneAuthProvider_Instance,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  RecaptchaVerifier_Instance,
  SAMLAuthProvider,
  TwitterAuthProvider,
  TwitterAuthProvider_Instance
} from '@firebase/auth-types';
import { version } from './package.json';
import { Auth } from './src/auth';
import { Persistence } from './src/persistence';
import { PhoneAuthProvider as CompatAuthProvider } from './src/phone_auth_provider';
import { _getClientPlatform } from './src/platform';
import { RecaptchaVerifier as CompatRecaptchaVerifier } from './src/recaptcha_verifier';

const AUTH_TYPE = 'auth';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'auth-compat': FirebaseAuth;
  }
}

declare module '@firebase/app-compat' {
  interface FirebaseNamespace {
    auth: {
      (app?: FirebaseApp): FirebaseAuth;
      Auth: typeof FirebaseAuth;
      EmailAuthProvider: typeof EmailAuthProvider;
      EmailAuthProvider_Instance: typeof EmailAuthProvider_Instance;
      FacebookAuthProvider: typeof FacebookAuthProvider;
      FacebookAuthProvider_Instance: typeof FacebookAuthProvider_Instance;
      GithubAuthProvider: typeof GithubAuthProvider;
      GithubAuthProvider_Instance: typeof GithubAuthProvider_Instance;
      GoogleAuthProvider: typeof GoogleAuthProvider;
      GoogleAuthProvider_Instance: typeof GoogleAuthProvider_Instance;
      OAuthProvider: typeof OAuthProvider;
      SAMLAuthProvider: typeof SAMLAuthProvider;
      PhoneAuthProvider: typeof PhoneAuthProvider;
      PhoneAuthProvider_Instance: typeof PhoneAuthProvider_Instance;
      PhoneMultiFactorGenerator: typeof PhoneMultiFactorGenerator;
      RecaptchaVerifier: typeof RecaptchaVerifier;
      RecaptchaVerifier_Instance: typeof RecaptchaVerifier_Instance;
      TwitterAuthProvider: typeof TwitterAuthProvider;
      TwitterAuthProvider_Instance: typeof TwitterAuthProvider_Instance;
    };
  }
  interface FirebaseApp {
    auth?(): FirebaseAuth;
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
        const auth = container.getProvider('auth-exp').getImmediate();
        return new Auth(app, auth as impl.AuthImpl);
      },
      ComponentType.PUBLIC
    )
      .setServiceProps({
        ActionCodeInfo: {
          Operation: {
            EMAIL_SIGNIN: externs.ActionCodeOperation.EMAIL_SIGNIN,
            PASSWORD_RESET: externs.ActionCodeOperation.PASSWORD_RESET,
            RECOVER_EMAIL: externs.ActionCodeOperation.RECOVER_EMAIL,
            REVERT_SECOND_FACTOR_ADDITION:
              externs.ActionCodeOperation.REVERT_SECOND_FACTOR_ADDITION,
            VERIFY_AND_CHANGE_EMAIL:
              externs.ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL,
            VERIFY_EMAIL: externs.ActionCodeOperation.VERIFY_EMAIL
          }
        },
        EmailAuthProvider: impl.EmailAuthProvider,
        FacebookAuthProvider: impl.FacebookAuthProvider,
        GithubAuthProvider: impl.GithubAuthProvider,
        GoogleAuthProvider: impl.GoogleAuthProvider,
        OAuthProvider: impl.OAuthProvider,
        //   SAMLAuthProvider,
        PhoneAuthProvider: CompatAuthProvider,
        PhoneMultiFactorGenerator: impl.PhoneMultiFactorGenerator,
        RecaptchaVerifier: CompatRecaptchaVerifier,
        TwitterAuthProvider: impl.TwitterAuthProvider,
        Auth: {
          Persistence
        },
        AuthCredential: impl.AuthCredential
        //   'Error': fireauth.AuthError
      })
      .setInstantiationMode(InstantiationMode.LAZY)
      .setMultipleInstances(false)
  );

  instance.registerVersion('auth', version);
}

impl.registerAuth(_getClientPlatform());
registerAuthCompat(firebase as _FirebaseNamespace);
