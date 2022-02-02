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
 import { GreCAPTCHATopLevel, isEnterprise } from './recaptcha';

 import {
   Auth
 } from '../../model/public_types';
 import {
   AuthInternal
 } from '../../model/auth';
 import { _castAuth } from '../../core/auth/auth_impl';

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
   static siteKeys: [string: string];
 
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
     // TODO(b/217382327): load and manage recaptcha config
     const siteKey = '6LfyHwgeAAAAAKhL1Ujy7K1fBgX-l6bYdJpYJb_K';
 
     const grecaptcha = _window().grecaptcha;
     if (isEnterprise(grecaptcha)) {
        grecaptcha.enterprise.ready(() => {
            grecaptcha.enterprise.execute(siteKey, { action: 'login' })
            .then((token) => {
                return Promise.resolve(token);
            })
            .catch((error) => {
                return Promise.reject(error);
            });
          });
     }
     
     return new Promise<string>((resolve, reject) => {
       loadReCAPTCHAEnterpriseScript(siteKey, () => {
        const grecaptcha = _window().grecaptcha as GreCAPTCHATopLevel;
         if (!grecaptcha) {
           throw new Error('no recaptcha script loaded');
         } else {
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
       });
     });
   }
 }
 
 function loadReCAPTCHAEnterpriseScript(siteKey: string, onload: () => void): void {
   const script = document.createElement('script');
   script.src = RECAPTCHA_ENTERPRISE_URL + siteKey;
   script.onload = onload;
   document.head.appendChild(script);
 }