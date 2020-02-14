/**
 * @license
 * Copyright 2019 Google Inc.
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

import { ApplicationVerifier } from '../model/application_verifier';
import { Auth } from '../model/auth';
import { initializeAuth } from '../core/initialize_auth';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../core/errors';
import { isHttpOrHttps } from '../core/util/location';
import { AuthWindow } from './auth_window';
import { RECAPTCHA_LOADER } from './recaptcha_loader';
import { getRecaptchaParams } from '../api/authentication';

const DEFAULT_PARAMS_: ReCaptchaV2.Parameters = {
  theme: 'light',
  type: 'image',
};

type TokenCallback = (token: string) => void;

export const RECAPTCHA_VERIFIER_TYPE = 'recaptcha';

export class RecaptchaVerifier implements ApplicationVerifier {
  readonly type = RECAPTCHA_VERIFIER_TYPE;
  private readonly auth: Auth;
  private readonly errorParams: {appName: string};
  // private initPromise: Promise<ReCaptchaV2.ReCaptcha> | null = null;
  private destroyed = false;
  private widgetId: number | null = null;
  private readonly container: HTMLElement;
  private readonly isInvisible: boolean;
  private readonly tokenChangeListeners = new Set<TokenCallback>();
  private renderPromise: Promise<number> | null = null;
  private recaptcha: ReCaptchaV2.ReCaptcha | null = null;
  
  constructor(
    containerOrId: HTMLElement | string,
    private readonly parameters: ReCaptchaV2.Parameters = {...DEFAULT_PARAMS_},
    auth?: Auth | null) {

    this.auth = auth || initializeAuth();
    this.errorParams = {appName: this.auth.name};
    this.isInvisible = this.parameters.size === 'invisible';
    const container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
    if (!container) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.ARGUMENT_ERROR, this.errorParams);
    }

    this.container = container;
    this.parameters.callback = this.makeTokenCallback(this.parameters.callback);

    this.validateStartingState();
    // TODO: Figure out if sdk version is needed
  }

  async verify(): Promise<string> {
    this.checkIfDestroyed();
    const id = await this.render();
    const recaptcha = this.assertedRecaptcha;

    const response = recaptcha.getResponse(id);
    if (response) return response;

    return new Promise<string>(resolve => {
      const tokenChange = (token: string) => {
        if (!token) return;  // Ignore token expirations.
        this.tokenChangeListeners.delete(tokenChange);
        resolve(token);
      }

      this.tokenChangeListeners.add(tokenChange);
      if (this.isInvisible) {
        recaptcha.execute(id);
      }
    });
  }

  render(): Promise<number> {
    this.checkIfDestroyed();
    
    if (this.renderPromise) {
      return this.renderPromise;
    }

    this.renderPromise = this.makeRenderPromise().catch(e => {
      this.renderPromise = null;
      throw e;
    });

    return this.renderPromise;
  }

  reset(): void {
    this.checkIfDestroyed();
    if (this.widgetId !== null) {
      this.assertedRecaptcha.reset(this.widgetId);
    }
  }

  clear() {
    this.checkIfDestroyed();
    this.destroyed = true;
    RECAPTCHA_LOADER.clearedOneInstance();
    if (!this.isInvisible) {
      this.container.childNodes.forEach(node => {
        this.container.removeChild(node);
      });
    }
  }

  private validateStartingState() {
    if (this.parameters.sitekey) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.ARGUMENT_ERROR, this.errorParams);
    }

    if (!document) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.OPERATION_NOT_SUPPORTED, this.errorParams);
    }

    if (!this.isInvisible && this.container.hasChildNodes()) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.ARGUMENT_ERROR, this.errorParams);
    }
  }

  private makeTokenCallback(existing: TokenCallback|string|undefined): TokenCallback {
    return token => {
      this.tokenChangeListeners.forEach(listener => listener(token));
      if (typeof existing === 'function') {
        existing(token);
      } else if (typeof existing === 'string') {
        const globalFunc = (window as AuthWindow)[existing];
        if (typeof globalFunc === 'function') {
          globalFunc(token);
        }
      }
    };
  } 

  private checkIfDestroyed() {
    if (this.destroyed) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, this.errorParams);
    }
  }

  private async makeRenderPromise(): Promise<number> {
    await this.init();
    if (!this.widgetId) {
      let container = this.container;
      if (!this.isInvisible) {
        const guaranteedEmpty = document.createElement('div');
        container.appendChild(guaranteedEmpty);
        container = guaranteedEmpty;
      }

      this.widgetId = this.assertedRecaptcha.render(container, this.parameters);
    }

    return this.widgetId;
  }

  private async init(): Promise<void> {
    if (!isHttpOrHttps() || isWorker_()) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.OPERATION_NOT_SUPPORTED, this.errorParams);
    }

    await domReady_();
    this.recaptcha = await RECAPTCHA_LOADER.load(this.auth, this.auth.languageCode || undefined);
    const siteKey = await getRecaptchaParams(this.auth);

    if (!siteKey) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, this.errorParams);
    }

    this.parameters.sitekey = siteKey;
  }

  private get assertedRecaptcha(): ReCaptchaV2.ReCaptcha {
    if (!this.recaptcha) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, this.errorParams);
    }

    return this.recaptcha;
  }
}

function isWorker_() {
  const win: AuthWindow = window;
  return typeof win['WorkerGlobalScope'] !== 'undefined' &&
         typeof win['importScripts'] === 'function';
}

function domReady_(): Promise<void> {
  let resolver: (() => void) | null = null;
  return new Promise<void>((resolve, reject) => {
    if (document.readyState === 'complete') {
      resolve();
      return;
    }

    // Document not ready, wait for load before resolving.
    // Save resolver, so we can remove listener in case it was externally
    // cancelled.
    resolver = () => resolve();
    window.addEventListener('load', resolver);
  }).catch(e => {
    if (resolver) {
      window.removeEventListener('load', resolver)
    }

    throw e;
  });
}