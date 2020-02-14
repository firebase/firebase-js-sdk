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

import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../core/errors';

const SOLVE_TIME_MS = 500;
const EXPIRATION_TIME_MS = 60_000;
const WIDGET_ID_START = 1_000_000_000_000;

class MockReCaptcha implements ReCaptchaV2.ReCaptcha {
  private counter = WIDGET_ID_START;
  private widgets = new Map<number, MockWidget>();

  render(container: string | HTMLElement, parameters?: ReCaptchaV2.Parameters, inherit?: boolean): number {
    const id = this.counter;
    this.widgets.set(id, new MockWidget(container, parameters || {}));
    this.counter++;
    return id;
  } 
  
  reset(opt_widget_id?: number): void {
    const id = opt_widget_id || WIDGET_ID_START;
    this.widgets.get(id)?.delete();
    this.widgets.delete(id);
  }

  getResponse(opt_widget_id?: number): string {
    const id = opt_widget_id || WIDGET_ID_START;
    return this.widgets.get(id)?.getResponse() || '';
  }

  execute(opt_widget_id?: number | string): Promise<string> {
    const id: number = opt_widget_id as number || WIDGET_ID_START;
    this.widgets.get(id)?.execute();
    return Promise.resolve('');
  }

  ready(callback: () => void): void {
    throw new Error('Method not implemented.');
  }
}

export const MOCK_RECAPTCHA: ReCaptchaV2.ReCaptcha = new MockReCaptcha();

class MockWidget {
  private readonly container: HTMLElement;
  private readonly isVisible: boolean;
  private timerId: number | null = null;
  private deleted = false;
  private responseToken: string | null = null;
  private readonly clickHandler = () => this.execute();

  constructor(
    containerOrId: string | HTMLElement,
    private readonly params: ReCaptchaV2.Parameters,
  ) {
    const container = typeof containerOrId === 'string' ?
        document.getElementById(containerOrId) : containerOrId;
    if (!container) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.ARGUMENT_ERROR, {appName: ''});
    }

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

  delete() {
    this.checkIfDeleted();
    this.deleted = true;
    clearTimeout(this.timerId!);
    this.timerId = null;
    this.container.removeEventListener('click', this.clickHandler);
  }

  execute() {
    this.checkIfDeleted();
    if (this.timerId) {
      return;
    }

    this.timerId = window.setTimeout(() => {
      this.responseToken = generateRandomAlphaNumericString_(50);
      const {callback, 'expired-callback': expiredCallback} = this.params;
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
      }, EXPIRATION_TIME_MS);
    }, SOLVE_TIME_MS)
  }

  private checkIfDeleted() {
    if (this.deleted) {
      throw new Error('reCAPTCHA mock was already deleted!');
    }
  }
}

function generateRandomAlphaNumericString_(len: number): string {
  const chars = [];
  const allowedChars =
      '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < len; i++) {
    chars.push(
        allowedChars.charAt(
            Math.floor(Math.random() * allowedChars.length)));
  }
  return chars.join('');
}