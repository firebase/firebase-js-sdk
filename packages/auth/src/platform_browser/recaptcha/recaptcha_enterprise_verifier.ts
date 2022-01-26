/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * @license
 * Copyright 2021 Google LLC
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

import { querystring } from '@firebase/util';

import {
  Auth
} from '../../model/public_types';
import {
  ApplicationVerifierInternal
} from '../../model/application_verifier';
import {
  AuthInternal
} from '../../model/auth';
// import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';
import { _castAuth } from '../../core/auth/auth_impl';
import * as jsHelpers from '../load_js';
const RECAPTCHA_ENTERPRISE_URL = 'https://www.google.com/recaptcha/enterprise.js?render=6LfyHwgeAAAAAKhL1Ujy7K1fBgX-l6bYdJpYJb_K';

type TokenCallback = (token: string) => void;

export const _JSLOAD_CALLBACK = jsHelpers._generateCallbackName('rcb');
export const RECAPTCHA_ENTERPRISE_VERIFIER_TYPE = 'recaptcha-enterprise';

class RecaptchaProvidersConfig {
  emailEnabled: boolean;
  // Add more fields when other providers support reCAPTCHA.

  constructor(email: boolean) {
    this.emailEnabled = email;
  }
}

export class RecaptchaEnterpriseVerifier implements ApplicationVerifierInternal {
  /**
   * Identifies the type of application verifier (e.g. "recaptcha-enterprise").
   */
  readonly type = RECAPTCHA_ENTERPRISE_VERIFIER_TYPE;

  /**
   * Stores the recaptcha site key per tenant.
   */
  static siteKeys: [string: string];

  /**
   * Stores the recaptcha configs per provider per tenant.
   */
  static providersConfigs: [string: RecaptchaProvidersConfig];

  private readonly auth: AuthInternal;
  private readonly tokenChangeListeners = new Set<TokenCallback>();

  /**
   *
   * @param authExtern - The corresponding Firebase {@link Auth} instance.
   *
   * @remarks
   * If none is provided, the default Firebase {@link Auth} instance is used. A Firebase {@link Auth} instance
   * must be initialized with an API key, otherwise an error will be thrown.
   */
  constructor(
    authExtern: Auth
  ) {
    // TODO
    this.auth = _castAuth(authExtern);
  }

  /**
   * Executes the verification process.
   *
   * @returns A Promise for a token that can be used to assert the validity of a request.
   */
  async verify(): Promise<string> {
    // TODO: load site key
    const siteKey = '6LfyHwgeAAAAAKhL1Ujy7K1fBgX-l6bYdJpYJb_K';

    return new Promise<string>((resolve, reject) => {
      loadReCAPTCHAEnterpriseScript(() => {
        const grecaptcha = getRecaptcha();
        if (!grecaptcha) {
          // it shouldn't happen.
          throw new Error('no recaptcha');
        } else {
          console.log("!!!!! recaptcha!");
          grecaptcha.enterprise.ready(() => {
            grecaptcha.enterprise.execute(siteKey, { action: 'login' })
            .then((token) => {
              resolve(token);
            })
            .catch((error) => {
              reject(error);
            });
          });
        }
        // queueWidgetRender(app, siteKey, grecaptcha, divId, initialized);
      });
    });
  }

  /**
   * @internal
   * 
   * Reset the verifier state.
   *
   */
  _reset(): void {
    // TODO
  }
}

function loadReCAPTCHAEnterpriseScript(onload: () => void): void {
  const script = document.createElement('script');
  script.src = RECAPTCHA_ENTERPRISE_URL;
  script.onload = onload;
  document.head.appendChild(script);
}

function getRecaptcha(
): GreCAPTCHATopLevel | undefined {
  return self.grecaptcha;
}

declare global {
  interface Window {
    grecaptcha: GreCAPTCHATopLevel | undefined;
  }
}

export interface GreCAPTCHATopLevel extends GreCAPTCHA {
  enterprise: GreCAPTCHA;
}

export interface GreCAPTCHA {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
  render: (
    container: string | HTMLElement,
    parameters: GreCAPTCHARenderOption
  ) => string;
}

export interface GreCAPTCHARenderOption {
  sitekey: string;
  size: 'invisible';
}
