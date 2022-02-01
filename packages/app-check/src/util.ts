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

import { GreCAPTCHA } from './recaptcha';
import { getState } from './state';
import { ERROR_FACTORY, AppCheckError } from './errors';
import { FirebaseApp } from '@firebase/app';

export function getRecaptcha(
  isEnterprise: boolean = false
): GreCAPTCHA | undefined {
  if (isEnterprise) {
    return self.grecaptcha?.enterprise;
  }
  return self.grecaptcha;
}

export function ensureActivated(app: FirebaseApp): void {
  if (!getState(app).activated) {
    throw ERROR_FACTORY.create(AppCheckError.USE_BEFORE_ACTIVATION, {
      appName: app.name
    });
  }
}

/**
 * Copied from https://stackoverflow.com/a/2117523
 */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDurationString(durationInMillis: number): string {
  const totalSeconds = Math.round(durationInMillis / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds - days * 3600 * 24) / 3600);
  const minutes = Math.floor(
    (totalSeconds - days * 3600 * 24 - hours * 3600) / 60
  );
  const seconds = totalSeconds - days * 3600 * 24 - hours * 3600 - minutes * 60;

  let result = '';
  if (days) {
    result += pad(days) + 'd:';
  }
  if (hours) {
    result += pad(hours) + 'h:';
  }
  result += pad(minutes) + 'm:' + pad(seconds) + 's';
  return result;
}

function pad(value: number): string {
  if (value === 0) {
    return '00';
  }
  return value >= 10 ? value.toString() : '0' + value;
}
