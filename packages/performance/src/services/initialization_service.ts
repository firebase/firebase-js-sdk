/**
 * @license
 * Copyright 2019 Google LLC
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

import { getIidPromise } from './iid_service';
import { getConfig } from './remote_config_service';
import { Api } from './api_service';

const enum InitializationStatus {
  notInitialized = 1,
  initializationPending,
  initialized
}

let initializationStatus = InitializationStatus.notInitialized;

let initializationPromise: Promise<void> | undefined;

export function getInitializationPromise(): Promise<void> {
  initializationStatus = InitializationStatus.initializationPending;

  initializationPromise = initializationPromise || initializePerf();

  return initializationPromise;
}

export function isPerfInitialized(): boolean {
  return initializationStatus === InitializationStatus.initialized;
}

function initializePerf(): Promise<void> {
  return getDocumentReadyComplete()
    .then(() => getIidPromise())
    .then(iid => getConfig(iid))
    .then(
      () => changeInitializationStatus(),
      () => changeInitializationStatus()
    );
}

/**
 * Returns a promise which resolves whenever the document readystate is complete or
 * immediately if it is called after page load complete.
 */
function getDocumentReadyComplete(): Promise<void> {
  const document = Api.getInstance().document;
  return new Promise(resolve => {
    if (document && document.readyState !== 'complete') {
      const handler = (): void => {
        if (document.readyState === 'complete') {
          document.removeEventListener('readystatechange', handler);
          resolve();
        }
      };
      document.addEventListener('readystatechange', handler);
    } else {
      resolve();
    }
  });
}

function changeInitializationStatus(): void {
  initializationStatus = InitializationStatus.initialized;
}
