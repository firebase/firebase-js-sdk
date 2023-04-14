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

import { RecaptchaParameters } from '../../model/public_types';
import { GetRecaptchaConfigResponse } from '../../api/authentication/recaptcha';

// reCAPTCHA v2 interface
export interface Recaptcha {
  render: (container: HTMLElement, parameters: RecaptchaParameters) => number;
  getResponse: (id: number) => string;
  execute: (id: number) => unknown;
  reset: (id: number) => unknown;
}

export function isV2(
  grecaptcha: Recaptcha | GreCAPTCHA | undefined
): grecaptcha is Recaptcha {
  return (
    grecaptcha !== undefined &&
    (grecaptcha as Recaptcha).getResponse !== undefined
  );
}

// reCAPTCHA Enterprise & v3 shared interface
export interface GreCAPTCHATopLevel extends GreCAPTCHA {
  enterprise: GreCAPTCHA;
}

// reCAPTCHA Enterprise interface
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

export function isEnterprise(
  grecaptcha: Recaptcha | GreCAPTCHA | undefined
): grecaptcha is GreCAPTCHATopLevel {
  return (
    grecaptcha !== undefined &&
    (grecaptcha as GreCAPTCHATopLevel).enterprise !== undefined
  );
}

// TODO(chuanr): Replace this with the AuthWindow after resolving the dependency issue in Node.js env.
declare global {
  interface Window {
    grecaptcha?: Recaptcha | GreCAPTCHATopLevel;
  }
}

export class RecaptchaConfig {
  /**
   * The reCAPTCHA site key.
   */
  siteKey: string = '';

  /**
   * The reCAPTCHA enablement status of the {@link EmailAuthProvider} for the current tenant.
   */
  emailPasswordEnabled: boolean = false;

  constructor(response: GetRecaptchaConfigResponse) {
    if (response.recaptchaKey === undefined) {
      throw new Error('recaptchaKey undefined');
    }
    // Example response.recaptchaKey: "projects/proj123/keys/sitekey123"
    this.siteKey = response.recaptchaKey.split('/')[3];
    this.emailPasswordEnabled = response.recaptchaEnforcementState.some(
      enforcementState =>
        enforcementState.provider === 'EMAIL_PASSWORD_PROVIDER' &&
        enforcementState.enforcementState !== 'OFF'
    );
  }
}
