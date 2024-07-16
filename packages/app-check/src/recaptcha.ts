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

import { FirebaseApp } from '@firebase/app';
import { getStateReference } from './state';
import { Deferred } from '@firebase/util';
import { getRecaptcha, ensureActivated } from './util';
import { trustedResourceUrl } from 'safevalues';
import { safeScriptEl } from 'safevalues/dom';

// Note that these are used for testing. If they are changed, the URLs used in loadReCAPTCHAV3Script
// and loadReCAPTCHAEnterpriseScript must also be changed. They aren't used to create the URLs
// since trusted resource URLs must be created using template string literals.
export const RECAPTCHA_URL = 'https://www.google.com/recaptcha/api.js';
export const RECAPTCHA_ENTERPRISE_URL =
  'https://www.google.com/recaptcha/enterprise.js';

export function initializeV3(
  app: FirebaseApp,
  siteKey: string
): Promise<GreCAPTCHA> {
  const initialized = new Deferred<GreCAPTCHA>();

  const state = getStateReference(app);
  state.reCAPTCHAState = { initialized };

  const divId = makeDiv(app);

  const grecaptcha = getRecaptcha(false);
  if (!grecaptcha) {
    loadReCAPTCHAV3Script(() => {
      const grecaptcha = getRecaptcha(false);

      if (!grecaptcha) {
        // it shouldn't happen.
        throw new Error('no recaptcha');
      }
      queueWidgetRender(app, siteKey, grecaptcha, divId, initialized);
    });
  } else {
    queueWidgetRender(app, siteKey, grecaptcha, divId, initialized);
  }
  return initialized.promise;
}
export function initializeEnterprise(
  app: FirebaseApp,
  siteKey: string
): Promise<GreCAPTCHA> {
  const initialized = new Deferred<GreCAPTCHA>();

  const state = getStateReference(app);
  state.reCAPTCHAState = { initialized };

  const divId = makeDiv(app);

  const grecaptcha = getRecaptcha(true);
  if (!grecaptcha) {
    loadReCAPTCHAEnterpriseScript(() => {
      const grecaptcha = getRecaptcha(true);

      if (!grecaptcha) {
        // it shouldn't happen.
        throw new Error('no recaptcha');
      }
      queueWidgetRender(app, siteKey, grecaptcha, divId, initialized);
    });
  } else {
    queueWidgetRender(app, siteKey, grecaptcha, divId, initialized);
  }
  return initialized.promise;
}

/**
 * Add listener to render the widget and resolve the promise when
 * the grecaptcha.ready() event fires.
 */
function queueWidgetRender(
  app: FirebaseApp,
  siteKey: string,
  grecaptcha: GreCAPTCHA,
  container: string,
  initialized: Deferred<GreCAPTCHA>
): void {
  grecaptcha.ready(() => {
    // Invisible widgets allow us to set a different siteKey for each widget,
    // so we use them to support multiple apps
    renderInvisibleWidget(app, siteKey, grecaptcha, container);
    initialized.resolve(grecaptcha);
  });
}

/**
 * Add invisible div to page.
 */
function makeDiv(app: FirebaseApp): string {
  const divId = `fire_app_check_${app.name}`;
  const invisibleDiv = document.createElement('div');
  invisibleDiv.id = divId;
  invisibleDiv.style.display = 'none';

  document.body.appendChild(invisibleDiv);
  return divId;
}

export async function getToken(app: FirebaseApp): Promise<string> {
  ensureActivated(app);

  // ensureActivated() guarantees that reCAPTCHAState is set
  const reCAPTCHAState = getStateReference(app).reCAPTCHAState!;
  const recaptcha = await reCAPTCHAState.initialized.promise;

  return new Promise((resolve, _reject) => {
    // Updated after initialization is complete.
    const reCAPTCHAState = getStateReference(app).reCAPTCHAState!;
    recaptcha.ready(() => {
      resolve(
        // widgetId is guaranteed to be available if reCAPTCHAState.initialized.promise resolved.
        recaptcha.execute(reCAPTCHAState.widgetId!, {
          action: 'fire_app_check'
        })
      );
    });
  });
}

/**
 *
 * @param app
 * @param container - Id of a HTML element.
 */
function renderInvisibleWidget(
  app: FirebaseApp,
  siteKey: string,
  grecaptcha: GreCAPTCHA,
  container: string
): void {
  const widgetId = grecaptcha.render(container, {
    sitekey: siteKey,
    size: 'invisible',
    // Success callback - set state
    callback: () => {
      getStateReference(app).reCAPTCHAState!.succeeded = true;
    },
    // Failure callback - set state
    'error-callback': () => {
      getStateReference(app).reCAPTCHAState!.succeeded = false;
    }
  });

  const state = getStateReference(app);

  state.reCAPTCHAState = {
    ...state.reCAPTCHAState!, // state.reCAPTCHAState is set in the initialize()
    widgetId
  };
}

function loadReCAPTCHAV3Script(onload: () => void): void {
  const script = document.createElement('script');
  safeScriptEl.setSrc(
    script,
    trustedResourceUrl`https://www.google.com/recaptcha/api.js`
  );
  script.onload = onload;
  document.head.appendChild(script);
}

function loadReCAPTCHAEnterpriseScript(onload: () => void): void {
  const script = document.createElement('script');
  safeScriptEl.setSrc(
    script,
    trustedResourceUrl`https://www.google.com/recaptcha/enterprise.js`
  );
  script.onload = onload;
  document.head.appendChild(script);
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
  callback: () => void;
  'error-callback': () => void;
}
