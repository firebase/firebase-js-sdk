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

import { ApplicationVerifier } from '@firebase/auth-types-exp';

import { getRecaptchaParams } from '../../api/authentication/recaptcha';
import { initializeAuth } from '../../core/auth/auth_impl';
import { AuthErrorCode } from '../../core/errors';
import { assert } from '../../core/util/assert';
import { _isHttpOrHttps } from '../../core/util/location';
import { Auth } from '../../model/auth';
import { AuthWindow } from '../auth_window';
import { Parameters, Recaptcha } from './recaptcha';
import {
  MOCK_RECAPTCHA_LOADER,
  RECAPTCHA_LOADER,
  ReCaptchaLoader
} from './recaptcha_loader';

const DEFAULT_PARAMS: Parameters = {
  theme: 'light',
  type: 'image'
};

type TokenCallback = (token: string) => void;

export const RECAPTCHA_VERIFIER_TYPE = 'recaptcha';

export class RecaptchaVerifier implements ApplicationVerifier {
  readonly type = RECAPTCHA_VERIFIER_TYPE;
  private readonly auth: Auth;
  private readonly appName: string;
  private destroyed = false;
  private widgetId: number | null = null;
  private readonly container: HTMLElement;
  private readonly isInvisible: boolean;
  private readonly tokenChangeListeners = new Set<TokenCallback>();
  private renderPromise: Promise<number> | null = null;

  private readonly recaptchaLoader: ReCaptchaLoader;
  private recaptcha: Recaptcha | null = null;

  constructor(
    containerOrId: HTMLElement | string,
    private readonly parameters: Parameters = {
      ...DEFAULT_PARAMS
    },
    auth?: Auth | null
  ) {
    this.auth = auth || (initializeAuth() as Auth);
    this.appName = this.auth.name;
    this.isInvisible = this.parameters.size === 'invisible';
    const container =
      typeof containerOrId === 'string'
        ? document.getElementById(containerOrId)
        : containerOrId;
    assert(container, this.appName, AuthErrorCode.ARGUMENT_ERROR);

    this.container = container;
    this.parameters.callback = this.makeTokenCallback(this.parameters.callback);

    this.recaptchaLoader = this.auth.settings.appVerificationDisabledForTesting
      ? MOCK_RECAPTCHA_LOADER
      : RECAPTCHA_LOADER;

    this.validateStartingState();
    // TODO: Figure out if sdk version is needed
  }

  async verify(): Promise<string> {
    this.assertNotDestroyed();
    const id = await this.render();
    const recaptcha = this.assertedRecaptcha;

    const response = recaptcha.getResponse(id);
    if (response) {
      return response;
    }

    return new Promise<string>(resolve => {
      const tokenChange = (token: string): void => {
        if (!token) {
          return; // Ignore token expirations.
        }
        this.tokenChangeListeners.delete(tokenChange);
        resolve(token);
      };

      this.tokenChangeListeners.add(tokenChange);
      if (this.isInvisible) {
        recaptcha.execute(id);
      }
    });
  }

  render(): Promise<number> {
    try {
      this.assertNotDestroyed();
    } catch (e) {
      // This method returns a promise. Since it's not async (we want to return the
      // _same_ promise if rendering is still occurring), the API surface should
      // reject with the error rather than just throw
      return Promise.reject(e);
    }

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
    this.assertNotDestroyed();
    if (this.widgetId !== null) {
      this.assertedRecaptcha.reset(this.widgetId);
    }
  }

  clear(): void {
    this.assertNotDestroyed();
    this.destroyed = true;
    this.recaptchaLoader.clearedOneInstance();
    if (!this.isInvisible) {
      this.container.childNodes.forEach(node => {
        this.container.removeChild(node);
      });
    }
  }

  private validateStartingState(): void {
    assert(
      !this.parameters.sitekey,
      this.appName,
      AuthErrorCode.ARGUMENT_ERROR
    );
    assert(document, this.appName, AuthErrorCode.OPERATION_NOT_SUPPORTED);
    assert(
      this.isInvisible || !this.container.hasChildNodes(),
      this.appName,
      AuthErrorCode.ARGUMENT_ERROR
    );
  }

  private makeTokenCallback(
    existing: TokenCallback | string | undefined
  ): TokenCallback {
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

  private assertNotDestroyed(): void {
    assert(!this.destroyed, this.appName);
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
    assert(_isHttpOrHttps() && !isWorker(), this.appName);

    await domReady();
    this.recaptcha = await this.recaptchaLoader.load(
      this.auth,
      this.auth.languageCode || undefined
    );

    const siteKey = await getRecaptchaParams(this.auth);
    assert(siteKey, this.appName);
    this.parameters.sitekey = siteKey;
  }

  private get assertedRecaptcha(): Recaptcha {
    assert(this.recaptcha, this.appName);
    return this.recaptcha;
  }
}

function isWorker(): boolean {
  const win: AuthWindow = window;
  return (
    typeof win['WorkerGlobalScope'] !== 'undefined' &&
    typeof win['importScripts'] === 'function'
  );
}

function domReady(): Promise<void> {
  let resolver: (() => void) | null = null;
  return new Promise<void>(resolve => {
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
      window.removeEventListener('load', resolver);
    }

    throw e;
  });
}
