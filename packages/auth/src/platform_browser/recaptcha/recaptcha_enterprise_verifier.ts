/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * @license
 * Copyright 2022 Google LLC
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

import { _window } from '../auth_window';
import { isEnterprise } from './recaptcha';
import {
  getRecaptchaConfig
} from '../../api/authentication/recaptcha';
import { RecaptchaClientType, RecaptchaVersion } from '../../api';

import {
  Auth
} from '../../model/public_types';
import {
  AuthInternal
} from '../../model/auth';
import { _castAuth } from '../../core/auth/auth_impl';
import * as jsHelpers from '../load_js';

const RECAPTCHA_ENTERPRISE_URL = 'https://www.google.com/recaptcha/enterprise.js?render=';

export const RECAPTCHA_ENTERPRISE_VERIFIER_TYPE = 'recaptcha-enterprise';

export class RecaptchaEnterpriseVerifier {
  /**
   * Identifies the type of application verifier (e.g. "recaptcha-enterprise").
   */
  readonly type = RECAPTCHA_ENTERPRISE_VERIFIER_TYPE;

  /**
   * Stores the recaptcha site key per tenant.
   */
  static siteKeys: Record<string, string>;

  private readonly auth: AuthInternal;

  /**
   *
   * @param authExtern - The corresponding Firebase {@link Auth} instance.
   *
   */
  constructor(
    authExtern: Auth
  ) {
    this.auth = _castAuth(authExtern);
  }

  /**
   * Executes the verification process.
   *
   * @returns A Promise for a token that can be used to assert the validity of a request.
   */
  async verify(): Promise<string> {

    async function retrieveSiteKey(auth: AuthInternal): Promise<string> {
      return new Promise<string>(async (resolve, reject) => {
        getRecaptchaConfig(auth, {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        }).then((response) => {
          if (response.recaptchaKey === undefined) {
            reject("recaptchaKey undefined");
          } else {
            const siteKey = response.recaptchaKey.split('/')[3];
            return resolve(siteKey);
          }
        }).catch((error) => {
          reject(error);
        });
      });
    }

    function retrieveRecaptchaToken(siteKey: string, resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void {
      const grecaptcha = _window().grecaptcha;
      if (isEnterprise(grecaptcha)) {
        grecaptcha.enterprise.ready(() => {
          grecaptcha.enterprise.execute(siteKey, { action: 'login' })
            .then((token) => {
              resolve(token);
            })
            .catch((error) => {
              reject(error);
            });;
        });
      } else {
        reject(Error('No reCAPTCHA enterprise script loaded.'));
      }
    }

    return new Promise<string>((resolve, reject) => {
      retrieveSiteKey(this.auth).then((siteKey) => {
        if (isEnterprise(_window().grecaptcha)) {
          retrieveRecaptchaToken(siteKey, resolve, reject);
        } else {
          jsHelpers._loadJS(RECAPTCHA_ENTERPRISE_URL + siteKey)
            .then(() => {
              retrieveRecaptchaToken(siteKey, resolve, reject);
            })
            .catch((error) => {
              reject(error);
            });
        }
      }).catch((error) => {
        reject(error);
      });
    });
  }
}