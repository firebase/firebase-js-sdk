/**
 * @license
 * Copyright 2020 Google LLC.
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

import { _window } from '../auth_window';

export function _isWorker(): boolean {
  return (
    typeof _window()['WorkerGlobalScope'] !== 'undefined' &&
    typeof _window()['importScripts'] === 'function'
  );
}

export async function _getActiveServiceWorker(): Promise<ServiceWorker | null> {
  if (!navigator?.serviceWorker) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    return registration.active;
  } catch {
    return null;
  }
}

export function _getServiceWorkerController(): ServiceWorker | null {
  return navigator?.serviceWorker?.controller || null;
}

export function _getWorkerGlobalScope(): ServiceWorker | null {
  return _isWorker() ? (self as unknown as ServiceWorker) : null;
}
