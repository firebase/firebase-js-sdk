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
import {
  isIndexedDBAvailable,
  validateIndexedDBOpenable
} from '@firebase/util';
import { ERROR_FACTORY, AnalyticsError } from './errors';

async function validateIndexedDB(): Promise<boolean> {
  if (!isIndexedDBAvailable()) {
    logger.warn(
      ERROR_FACTORY.create(AnalyticsError.INDEXEDDB_UNAVAILABLE, {
        errorInfo: 'IndexedDB is not available in this environment.'
      }).message
    );
    return false;
  } else {
    try {
      await validateIndexedDBOpenable();
    } catch (e) {
      logger.warn(
        ERROR_FACTORY.create(AnalyticsError.INDEXEDDB_UNAVAILABLE, {
          errorInfo: e
        }).message
      );
      return false;
    }
  }
  return true;
}

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
      if (
        app.options.measurementId &&
        config.measurementId !== app.options.measurementId
      ) {
        logger.warn(
          `The measurement ID in the local Firebase config (${app.options.measurementId})` +
            ` does not match the measurement ID fetched from the server (${config.measurementId}).` +
            ` To ensure analytics events are always sent to the correct Analytics property,` +
            ` update the` +
            ` measurement ID field in the local config or remove it from the local config.`
        );
      }
    })
    .catch(e => logger.error(e));
  // Add to list to track state of all dynamic config promises.
  dynamicConfigPromisesList.push(dynamicConfigPromise);

  const fidPromise: Promise<string | undefined> = validateIndexedDB().then(
    envIsValid => {
      if (envIsValid) {
        return installations.getId();
      } else {
        return undefined;
      }
    }
  );

  const [dynamicConfig, fid] = await Promise.all([
    dynamicConfigPromise,
    fidPromise
  ]);

  // This command initializes gtag.js and only needs to be called once for the entire web app,
  // but since it is idempotent, we can call it multiple times.
  // We keep it together with other initialization logic for better code structure.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gtagCore('js' as any, new Date());

  const configProperties: { [key: string]: string | boolean } = {
    // guard against developers accidentally setting properties with prefix `firebase_`
    [ORIGIN_KEY]: 'firebase',
    update: true
  };

  if (fid != null) {
    configProperties[GA_FID_KEY] = fid;
  }

  // It should be the first config command called on this GA-ID
  // Initialize this GA-ID and set FID on it using the gtag config API.
  gtagCore(GtagCommand.CONFIG, dynamicConfig.measurementId, configProperties);
  return dynamicConfig.measurementId;
}
