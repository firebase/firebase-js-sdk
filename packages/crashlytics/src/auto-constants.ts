/**
 * @license
 * Copyright 2026 Google LLC
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

<<<<<<<< HEAD:packages/crashlytics/src/auto-constants.ts
/**
 * A map of constants intended to be optionally overwritten during the application build process.
 * The supported keys are:
 * - appVersion: string indicating the version of source code being deployed (eg. git commit hash)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AUTO_CONSTANTS: any = {};
========
import { RECAPTCHA_ENTERPRISE_ONLOAD_CALLBACK_NAME } from '../../src/platform_browser/recaptcha/recaptcha_enterprise_verifier';

export const mockLoadJS = (): Promise<Event> => {
  if (typeof window[RECAPTCHA_ENTERPRISE_ONLOAD_CALLBACK_NAME] === 'function') {
    window[RECAPTCHA_ENTERPRISE_ONLOAD_CALLBACK_NAME]();
  }
  return Promise.resolve(new Event(''));
};
>>>>>>>> main:packages/auth/test/helpers/mock_loadjs.ts
