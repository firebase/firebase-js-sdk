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

import * as externs from '@firebase/auth-types-exp';
import { getRecaptchaParams } from '../../api/authentication/recaptcha';
import { _castAuth } from '../../core/auth/auth_impl';
import { AuthErrorCode } from '../../core/errors';
import { assert } from '../../core/util/assert';
import { _isHttpOrHttps } from '../../core/util/location';
import { ApplicationVerifier } from '../../model/application_verifier';
import { Auth } from '../../model/auth';
import { _window } from '../auth_window';
import { _isWorker } from '../util/worker';
import { Parameters, Recaptcha } from './recaptcha';
import {
  MockReCaptchaLoaderImpl,
  ReCaptchaLoader,
  ReCaptchaLoaderImpl
} from './recaptcha_loader';

export const RECAPTCHA_VERIFIER_TYPE = 'recaptcha';

const DEFAULT_PARAMS: Parameters = {
  theme: 'light',
  type: 'image'
};

type TokenCallback = (token: string) => void;

/**
 * {@inheritdoc @firebase/auth-types#RecaptchaVerifier}
 * @public
 */
export class RecaptchaVerifier
  implements externs.RecaptchaVerifier, ApplicationVerifier {
  readonly type = RECAPTCHA_VERIFIER_TYPE;
  private readonly appName: string;
  private destroyed = false;
  private widgetId: number | null = null;
  private readonly container: HTMLElement;
  private readonly isInvisible: boolean;
  private readonly tokenChangeListeners = new Set<TokenCallback>();
  private renderPromise: Promise<number> | null = null;
  private readonly auth: Auth;

  /** @internal */
  readonly _recaptchaLoader: ReCaptchaLoader;
  private recaptcha: Recaptcha | null = null;

  constructor(
    containerOrId: HTMLElement | string,
    private readonly parameters: Parameters = {
      ...DEFAULT_PARAMS
    },
    authExtern: externs.Auth
  ) {
    this.auth = _castAuth(authExtern);
    this.appName = this.auth.name;
    this.isInvisible = this.parameters.size === 'invisible';
    assert(
      typeof document !== 'undefined',
      AuthErrorCode.OPERATION_NOT_SUPPORTED,
      { appName: this.appName }
    );
    const container =
      typeof containerOrId === 'string'
        ? document.getElementById(containerOrId)
        : containerOrId;
    assert(container, AuthErrorCode.ARGUMENT_ERROR, { appName: this.appName });

    this.container = container;
    this.parameters.callback = this.makeTokenCallback(this.parameters.callback);

    this._recaptchaLoader = this.auth.settings.appVerificationDisabledForTesting
      ? new MockReCaptchaLoaderImpl()
      : new ReCaptchaLoaderImpl();

    this.validateStartingState();
    // TODO: Figure out if sdk version is needed
  }

  /** {@inheritdoc @firebase/auth-types#RecaptchaVerifier.verify} */
  async verify(): Promise<string> {
    this.assertNotDestroyed();
    const id = await this.render();
    const recaptcha = this.getAssertedRecaptcha();

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

  /** {@inheritdoc @firebase/auth-types#RecaptchaVerifier.render} */
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

  /** @internal */
  _reset(): void {
    this.assertNotDestroyed();
    if (this.widgetId !== null) {
      this.getAssertedRecaptcha().reset(this.widgetId);
    }
  }

  /** {@inheritdoc @firebase/auth-types#RecaptchaVerifier.clear} */
  clear(): void {
    this.assertNotDestroyed();
    this.destroyed = true;
    this._recaptchaLoader.clearedOneInstance();
    if (!this.isInvisible) {
      this.container.childNodes.forEach(node => {
        this.container.removeChild(node);
      });
    }
  }

  private validateStartingState(): void {
    assert(!this.parameters.sitekey, AuthErrorCode.ARGUMENT_ERROR, {
      appName: this.appName
    });
    assert(
      this.isInvisible || !this.container.hasChildNodes(),
      AuthErrorCode.ARGUMENT_ERROR,
      { appName: this.appName }
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
        const globalFunc = _window()[existing];
        if (typeof globalFunc === 'function') {
          globalFunc(token);
        }
      }
    };
  }

  private assertNotDestroyed(): void {
    assert(!this.destroyed, AuthErrorCode.INTERNAL_ERROR, {
      appName: this.appName
    });
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

      this.widgetId = this.getAssertedRecaptcha().render(
        container,
        this.parameters
      );
    }

    return this.widgetId;
  }

  private async init(): Promise<void> {
    assert(_isHttpOrHttps() && !_isWorker(), AuthErrorCode.INTERNAL_ERROR, {
      appName: this.appName
    });

    await domReady();
    this.recaptcha = await this._recaptchaLoader.load(
      this.auth,
      this.auth.languageCode || undefined
    );

    const siteKey = await getRecaptchaParams(this.auth);
    assert(siteKey, AuthErrorCode.INTERNAL_ERROR, { appName: this.appName });
    this.parameters.sitekey = siteKey;
  }

  private getAssertedRecaptcha(): Recaptcha {
    assert(this.recaptcha, AuthErrorCode.INTERNAL_ERROR, {
      appName: this.appName
    });
    return this.recaptcha;
  }
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
