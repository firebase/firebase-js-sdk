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

import {
  DynamicConfig,
  Gtag,
  MinimalDynamicConfig
} from '@firebase/analytics-types';
import { GtagCommand, GA_FID_KEY, ORIGIN_KEY } from './constants';
import { FirebaseInstallations } from '@firebase/installations-types';
import { fetchDynamicConfigWithRetry } from './get-config';
import { logger } from './logger';
import { FirebaseApp } from '@firebase/app-types';

/**
 * Initialize the analytics instance in gtag.js by calling config command with fid.
 *
 * NOTE: We combine analytics initialization and setting fid together because we want fid to be
 * part of the `page_view` event that's sent during the initialization
 * @param app Firebase app
 * @param gtagCore The gtag function that's not wrapped.
 * @param dynamicConfigPromisesList Array of all dynamic config promises.
 * @param measurementIdToAppId Maps measurementID to appID.
 * @param installations FirebaseInstallations instance.
 *
 * @returns Measurement ID.
 */
export async function initializeIds(
  app: FirebaseApp,
  dynamicConfigPromisesList: Array<
    Promise<DynamicConfig | MinimalDynamicConfig>
  >,
  measurementIdToAppId: { [key: string]: string },
  installations: FirebaseInstallations,
  gtagCore: Gtag
): Promise<string> {
  const dynamicConfigPromise = fetchDynamicConfigWithRetry(app);
  // Once fetched, map measurementIds to appId, for ease of lookup in wrapped gtag function.
  dynamicConfigPromise
    .then(config => {
      measurementIdToAppId[config.measurementId] = config.appId;
    })
    .catch(e => logger.error(e));
  // Add to list to track state of all dynamic config promises.
  dynamicConfigPromisesList.push(dynamicConfigPromise);

  const [dynamicConfig, fid] = await Promise.all([
    dynamicConfigPromise,
    installations.getId()
  ]);

  // This command initializes gtag.js and only needs to be called once for the entire web app,
  // but since it is idempotent, we can call it multiple times.
  // We keep it together with other initialization logic for better code structure.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gtagCore('js' as any, new Date());

  // It should be the first config command called on this GA-ID
  // Initialize this GA-ID and set FID on it using the gtag config API.
  gtagCore(GtagCommand.CONFIG, dynamicConfig.measurementId, {
    [GA_FID_KEY]: fid,
    // guard against developers accidentally setting properties with prefix `firebase_`
    [ORIGIN_KEY]: 'firebase',
    update: true
  });
  return dynamicConfig.measurementId;
}
