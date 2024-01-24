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

interface ExternalJSProvider {
  loadJS(url: string): Promise<Event>;
  recaptchaV2Script: string;
  recaptchaEnterpriseScript: string;
  gapiScript: string;
}

let externalJSProvider: ExternalJSProvider = {
  async loadJS() {
    throw new Error('Unable to load external scripts');
  },

  recaptchaV2Script: '',
  recaptchaEnterpriseScript: '',
  gapiScript: ''
};

export function _setExternalJSProvider(p: ExternalJSProvider): void {
  externalJSProvider = p;
}

export function _loadJS(url: string): Promise<Event> {
  return externalJSProvider.loadJS(url);
}

export function _recaptchaV2ScriptUrl(): string {
  return externalJSProvider.recaptchaV2Script;
}

export function _recaptchaEnterpriseScriptUrl(): string {
  return externalJSProvider.recaptchaEnterpriseScript;
}

export function _gapiScriptUrl(): string {
  return externalJSProvider.gapiScript;
}

export function _generateCallbackName(prefix: string): string {
  return `__${prefix}${Math.floor(Math.random() * 1000000)}`;
}
