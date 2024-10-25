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

import { AuthErrorCode } from '../../core/errors';
import { _assert } from '../../core/util/assert';
import { AuthInternal } from '../../model/auth';
import { RecaptchaParameters } from '../../model/public_types';
import {
  Recaptcha,
  GreCAPTCHATopLevel,
  GreCAPTCHARenderOption,
  GreCAPTCHA
} from './recaptcha';

export const _SOLVE_TIME_MS = 500;
export const _EXPIRATION_TIME_MS = 60_000;
export const _WIDGET_ID_START = 1_000_000_000_000;

export interface Widget {
  getResponse: () => string | null;
  delete: () => void;
  execute: () => void;
}

export class MockReCaptcha implements Recaptcha {
  private counter = _WIDGET_ID_START;
  _widgets = new Map<number, Widget>();

  constructor(private readonly auth: AuthInternal) {}

  render(
    container: string | HTMLElement,
    parameters?: RecaptchaParameters
  ): number {
    const id = this.counter;
    this._widgets.set(
      id,
      new MockWidget(container, this.auth.name, parameters || {})
    );
    this.counter++;
    return id;
  }

  reset(optWidgetId?: number): void {
    const id = optWidgetId || _WIDGET_ID_START;
    void this._widgets.get(id)?.delete();
    this._widgets.delete(id);
  }

  getResponse(optWidgetId?: number): string {
    const id = optWidgetId || _WIDGET_ID_START;
    return this._widgets.get(id)?.getResponse() || '';
  }

  async execute(optWidgetId?: number | string): Promise<string> {
    const id: number = (optWidgetId as number) || _WIDGET_ID_START;
    void this._widgets.get(id)?.execute();
    return '';
  }
}

export class MockGreCAPTCHATopLevel implements GreCAPTCHATopLevel {
  enterprise: GreCAPTCHA = new MockGreCAPTCHA();
  ready(callback: () => void): void {
    callback();
  }

  execute(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _siteKey: string,
    _options: { action: string }
  ): Promise<string> {
    return Promise.resolve('token');
  }
  render(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _container: string | HTMLElement,
    _parameters: GreCAPTCHARenderOption
  ): string {
    return '';
  }
}

export class MockGreCAPTCHA implements GreCAPTCHA {
  ready(callback: () => void): void {
    callback();
  }

  execute(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _siteKey: string,
    _options: { action: string }
  ): Promise<string> {
    return Promise.resolve('token');
  }
  render(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _container: string | HTMLElement,
    _parameters: GreCAPTCHARenderOption
  ): string {
    return '';
  }
}

export class MockWidget {
  private readonly container: HTMLElement;
  private readonly isVisible: boolean;
  private timerId: number | null = null;
  private deleted = false;
  private responseToken: string | null = null;
  private readonly clickHandler = (): void => {
    this.execute();
  };

  constructor(
    containerOrId: string | HTMLElement,
    appName: string,
    private readonly params: RecaptchaParameters
  ) {
    const container =
      typeof containerOrId === 'string'
        ? document.getElementById(containerOrId)
        : containerOrId;
    _assert(container, AuthErrorCode.ARGUMENT_ERROR, { appName });

    this.container = container;
    this.isVisible = this.params.size !== 'invisible';
    if (this.isVisible) {
      this.execute();
    } else {
      this.container.addEventListener('click', this.clickHandler);
    }
  }

  getResponse(): string | null {
    this.checkIfDeleted();
    return this.responseToken;
  }

  delete(): void {
    this.checkIfDeleted();
    this.deleted = true;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.container.removeEventListener('click', this.clickHandler);
  }

  execute(): void {
    this.checkIfDeleted();
    if (this.timerId) {
      return;
    }

    this.timerId = window.setTimeout(() => {
      this.responseToken = generateRandomAlphaNumericString(50);
      const { callback, 'expired-callback': expiredCallback } = this.params;
      if (callback) {
        try {
          callback(this.responseToken);
        } catch (e) {}
      }

      this.timerId = window.setTimeout(() => {
        this.timerId = null;
        this.responseToken = null;
        if (expiredCallback) {
          try {
            expiredCallback();
          } catch (e) {}
        }

        if (this.isVisible) {
          this.execute();
        }
      }, _EXPIRATION_TIME_MS);
    }, _SOLVE_TIME_MS);
  }

  private checkIfDeleted(): void {
    if (this.deleted) {
      throw new Error('reCAPTCHA mock was already deleted!');
    }
  }
}

function generateRandomAlphaNumericString(len: number): string {
  const chars = [];
  const allowedChars =
    '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < len; i++) {
    chars.push(
      allowedChars.charAt(Math.floor(Math.random() * allowedChars.length))
    );
  }
  return chars.join('');
}
