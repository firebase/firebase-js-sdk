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

import { Auth, RecaptchaParameters } from '../../model/public_types';
import { getRecaptchaParams } from '../../api/authentication/recaptcha';
import { _castAuth } from '../../core/auth/auth_impl';
import { AuthErrorCode } from '../../core/errors';
import { _assert } from '../../core/util/assert';
import { _isHttpOrHttps } from '../../core/util/location';
import { ApplicationVerifierInternal } from '../../model/application_verifier';
import { AuthInternal } from '../../model/auth';
import { _window } from '../auth_window';
import { _isWorker } from '../util/worker';
import { Recaptcha } from './recaptcha';
import {
  MockReCaptchaLoaderImpl,
  ReCaptchaLoader,
  ReCaptchaLoaderImpl
} from './recaptcha_loader';

export const RECAPTCHA_VERIFIER_TYPE = 'recaptcha';

const DEFAULT_PARAMS: RecaptchaParameters = {
  theme: 'light',
  type: 'image'
};

type TokenCallback = (token: string) => void;

/**
 * An {@link https://www.google.com/recaptcha/ | reCAPTCHA}-based application verifier.
 *
 * @remarks
 * `RecaptchaVerifier` does not work in a Node.js environment.
 *
 * @public
 */
export class RecaptchaVerifier implements ApplicationVerifierInternal {
  /**
   * The application verifier type.
   *
   * @remarks
   * For a reCAPTCHA verifier, this is 'recaptcha'.
   */
  readonly type = RECAPTCHA_VERIFIER_TYPE;
  private destroyed = false;
  private widgetId: number | null = null;
  private readonly container: HTMLElement;
  private readonly isInvisible: boolean;
  private readonly tokenChangeListeners = new Set<TokenCallback>();
  private renderPromise: Promise<number> | null = null;
  private readonly auth: AuthInternal;

  /** @internal */
  readonly _recaptchaLoader: ReCaptchaLoader;
  private recaptcha: Recaptcha | null = null;

  /**
   * @param authExtern - The corresponding Firebase {@link Auth} instance.
   *
   * @param containerOrId - The reCAPTCHA container parameter.
   *
   * @remarks
   * This has different meaning depending on whether the reCAPTCHA is hidden or visible. For a
   * visible reCAPTCHA the container must be empty. If a string is used, it has to correspond to
   * an element ID. The corresponding element must also must be in the DOM at the time of
   * initialization.
   *
   * @param parameters - The optional reCAPTCHA parameters.
   *
   * @remarks
   * Check the reCAPTCHA docs for a comprehensive list. All parameters are accepted except for
   * the sitekey. Firebase Auth backend provisions a reCAPTCHA for each project and will
   * configure this upon rendering. For an invisible reCAPTCHA, a size key must have the value
   * 'invisible'.
   */
  constructor(
    authExtern: Auth,
    containerOrId: HTMLElement | string,
    private readonly parameters: RecaptchaParameters = {
      ...DEFAULT_PARAMS
    }
  ) {
    this.auth = _castAuth(authExtern);
    this.isInvisible = this.parameters.size === 'invisible';
    _assert(
      typeof document !== 'undefined',
      this.auth,
      AuthErrorCode.OPERATION_NOT_SUPPORTED
    );
    const container =
      typeof containerOrId === 'string'
        ? document.getElementById(containerOrId)
        : containerOrId;
    _assert(container, this.auth, AuthErrorCode.ARGUMENT_ERROR);

    this.container = container;
    this.parameters.callback = this.makeTokenCallback(this.parameters.callback);

    this._recaptchaLoader = this.auth.settings.appVerificationDisabledForTesting
      ? new MockReCaptchaLoaderImpl()
      : new ReCaptchaLoaderImpl();

    this.validateStartingState();
    // TODO: Figure out if sdk version is needed
  }

  /**
   * Waits for the user to solve the reCAPTCHA and resolves with the reCAPTCHA token.
   *
   * @returns A Promise for the reCAPTCHA token.
   */
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

  /**
   * Renders the reCAPTCHA widget on the page.
   *
   * @returns A Promise that resolves with the reCAPTCHA widget ID.
   */
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

  /**
   * Clears the reCAPTCHA widget from the page and destroys the instance.
   */
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
    _assert(!this.parameters.sitekey, this.auth, AuthErrorCode.ARGUMENT_ERROR);
    _assert(
      this.isInvisible || !this.container.hasChildNodes(),
      this.auth,
      AuthErrorCode.ARGUMENT_ERROR
    );
    _assert(
      typeof document !== 'undefined',
      this.auth,
      AuthErrorCode.OPERATION_NOT_SUPPORTED
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
    _assert(!this.destroyed, this.auth, AuthErrorCode.INTERNAL_ERROR);
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
    _assert(
      _isHttpOrHttps() && !_isWorker(),
      this.auth,
      AuthErrorCode.INTERNAL_ERROR
    );

    await domReady();
    this.recaptcha = await this._recaptchaLoader.load(
      this.auth,
      this.auth.languageCode || undefined
    );

    const siteKey = await getRecaptchaParams(this.auth);
    _assert(siteKey, this.auth, AuthErrorCode.INTERNAL_ERROR);
    this.parameters.sitekey = siteKey;
  }

  private getAssertedRecaptcha(): Recaptcha {
    _assert(this.recaptcha, this.auth, AuthErrorCode.INTERNAL_ERROR);
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
