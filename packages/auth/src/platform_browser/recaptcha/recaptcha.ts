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
import {
  GetRecaptchaConfigResponse,
  RecaptchaEnforcementProviderState
} from '../../api/authentication/recaptcha';
import { EnforcementState, _parseEnforcementState } from '../../api/index';

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
   * The list of providers and their enablement status for reCAPTCHA Enterprise.
   */
  recaptchaEnforcementState: RecaptchaEnforcementProviderState[] = [];

  constructor(response: GetRecaptchaConfigResponse) {
    if (response.recaptchaKey === undefined) {
      throw new Error('recaptchaKey undefined');
    }
    // Example response.recaptchaKey: "projects/proj123/keys/sitekey123"
    this.siteKey = response.recaptchaKey.split('/')[3];
    this.recaptchaEnforcementState = response.recaptchaEnforcementState;
  }

  /**
   * Returns the reCAPTCHA Enterprise enforcement state for the given provider.
   *
   * @param providerStr - The provider whose enforcement state is to be returned.
   * @returns The reCAPTCHA Enterprise enforcement state for the given provider.
   */
  getProviderEnforcementState(providerStr: string): EnforcementState | null {
    if (
      !this.recaptchaEnforcementState ||
      this.recaptchaEnforcementState.length === 0
    ) {
      return null;
    }

    for (const recaptchaEnforcementState of this.recaptchaEnforcementState) {
      if (
        recaptchaEnforcementState.provider &&
        recaptchaEnforcementState.provider === providerStr
      ) {
        return _parseEnforcementState(
          recaptchaEnforcementState.enforcementState
        );
      }
    }
    return null;
  }

  /**
   * Returns true if the reCAPTCHA Enterprise enforcement state for the provider is set to ENFORCE or AUDIT.
   *
   * @param providerStr - The provider whose enablement state is to be returned.
   * @returns Whether or not reCAPTCHA Enterprise protection is enabled for the given provider.
   */
  isProviderEnabled(providerStr: string): boolean {
    return (
      this.getProviderEnforcementState(providerStr) ===
        EnforcementState.ENFORCE ||
      this.getProviderEnforcementState(providerStr) === EnforcementState.AUDIT
    );
  }
}
