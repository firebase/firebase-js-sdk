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

import {
  CustomParams,
  ControlParams,
  EventParams,
  ConsentSettings
} from './public-types';
import { DynamicConfig, DataLayer, Gtag, MinimalDynamicConfig } from './types';
import { GtagCommand, GTAG_URL } from './constants';
import { logger } from './logger';
import { AnalyticsError, ERROR_FACTORY } from './errors';

// Possible parameter types for gtag 'event' and 'config' commands
type GtagConfigOrEventParams = ControlParams & EventParams & CustomParams;

/**
 * Verifies and creates a TrustedScriptURL.
 */
export function createGtagTrustedTypesScriptURL(url: string): string {
  if (!url.startsWith(GTAG_URL)) {
    const err = ERROR_FACTORY.create(AnalyticsError.INVALID_GTAG_RESOURCE, {
      gtagURL: url
    });
    logger.warn(err.message);
    return '';
  }
  return url;
}

/**
 * Makeshift polyfill for Promise.allSettled(). Resolves when all promises
 * have either resolved or rejected.
 *
 * @param promises Array of promises to wait for.
 */
export function promiseAllSettled<T>(
  promises: Array<Promise<T>>
): Promise<T[]> {
  return Promise.all(promises.map(promise => promise.catch(e => e)));
}

/**
 * Creates a TrustedTypePolicy object that implements the rules passed as policyOptions.
 *
 * @param policyName A string containing the name of the policy
 * @param policyOptions Object containing implementations of instance methods for TrustedTypesPolicy, see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicy#instance_methods
 * | the TrustedTypePolicy reference documentation}.
 */
export function createTrustedTypesPolicy(
  policyName: string,
  policyOptions: Partial<TrustedTypePolicyOptions>
): Partial<TrustedTypePolicy> | undefined {
  // Create a TrustedTypes policy that we can use for updating src
  // properties
  let trustedTypesPolicy: Partial<TrustedTypePolicy> | undefined;
  if (window.trustedTypes) {
    trustedTypesPolicy = window.trustedTypes.createPolicy(
      policyName,
      policyOptions
    );
  }
  return trustedTypesPolicy;
}

/**
 * Inserts gtag script tag into the page to asynchronously download gtag.
 * @param dataLayerName Name of datalayer (most often the default, "_dataLayer").
 */
export function insertScriptTag(
  dataLayerName: string,
  measurementId: string
): void {
  const trustedTypesPolicy = createTrustedTypesPolicy(
    'firebase-js-sdk-policy',
    {
      createScriptURL: createGtagTrustedTypesScriptURL
    }
  );

  const script = document.createElement('script');
  // We are not providing an analyticsId in the URL because it would trigger a `page_view`
  // without fid. We will initialize ga-id using gtag (config) command together with fid.

  const gtagScriptURL = `${GTAG_URL}?l=${dataLayerName}&id=${measurementId}`;
  (script.src as string | TrustedScriptURL) = trustedTypesPolicy
    ? (trustedTypesPolicy as TrustedTypePolicy)?.createScriptURL(gtagScriptURL)
    : gtagScriptURL;

  script.async = true;
  document.head.appendChild(script);
}

/**
 * Get reference to, or create, global datalayer.
 * @param dataLayerName Name of datalayer (most often the default, "_dataLayer").
 */
export function getOrCreateDataLayer(dataLayerName: string): DataLayer {
  // Check for existing dataLayer and create if needed.
  let dataLayer: DataLayer = [];
  if (Array.isArray(window[dataLayerName])) {
    dataLayer = window[dataLayerName] as DataLayer;
  } else {
    window[dataLayerName] = dataLayer;
  }
  return dataLayer;
}

/**
 * Wrapped gtag logic when gtag is called with 'config' command.
 *
 * @param gtagCore Basic gtag function that just appends to dataLayer.
 * @param initializationPromisesMap Map of appIds to their initialization promises.
 * @param dynamicConfigPromisesList Array of dynamic config fetch promises.
 * @param measurementIdToAppId Map of GA measurementIDs to corresponding Firebase appId.
 * @param measurementId GA Measurement ID to set config for.
 * @param gtagParams Gtag config params to set.
 */
async function gtagOnConfig(
  gtagCore: Gtag,
  initializationPromisesMap: { [appId: string]: Promise<string> },
  dynamicConfigPromisesList: Array<
    Promise<DynamicConfig | MinimalDynamicConfig>
  >,
  measurementIdToAppId: { [measurementId: string]: string },
  measurementId: string,
  gtagParams?: ControlParams & EventParams & CustomParams
): Promise<void> {
  // If config is already fetched, we know the appId and can use it to look up what FID promise we
  /// are waiting for, and wait only on that one.
  const correspondingAppId = measurementIdToAppId[measurementId as string];
  try {
    if (correspondingAppId) {
      await initializationPromisesMap[correspondingAppId];
    } else {
      // If config is not fetched yet, wait for all configs (we don't know which one we need) and
      // find the appId (if any) corresponding to this measurementId. If there is one, wait on
      // that appId's initialization promise. If there is none, promise resolves and gtag
      // call goes through.
      const dynamicConfigResults = await promiseAllSettled(
        dynamicConfigPromisesList
      );
      const foundConfig = dynamicConfigResults.find(
        config => config.measurementId === measurementId
      );
      if (foundConfig) {
        await initializationPromisesMap[foundConfig.appId];
      }
    }
  } catch (e) {
    logger.error(e);
  }
  gtagCore(GtagCommand.CONFIG, measurementId, gtagParams);
}

/**
 * Wrapped gtag logic when gtag is called with 'event' command.
 *
 * @param gtagCore Basic gtag function that just appends to dataLayer.
 * @param initializationPromisesMap Map of appIds to their initialization promises.
 * @param dynamicConfigPromisesList Array of dynamic config fetch promises.
 * @param measurementId GA Measurement ID to log event to.
 * @param gtagParams Params to log with this event.
 */
async function gtagOnEvent(
  gtagCore: Gtag,
  initializationPromisesMap: { [appId: string]: Promise<string> },
  dynamicConfigPromisesList: Array<
    Promise<DynamicConfig | MinimalDynamicConfig>
  >,
  measurementId: string,
  gtagParams?: ControlParams & EventParams & CustomParams
): Promise<void> {
  try {
    let initializationPromisesToWaitFor: Array<Promise<string>> = [];

    // If there's a 'send_to' param, check if any ID specified matches
    // an initializeIds() promise we are waiting for.
    if (gtagParams && gtagParams['send_to']) {
      let gaSendToList: string | string[] = gtagParams['send_to'];
      // Make it an array if is isn't, so it can be dealt with the same way.
      if (!Array.isArray(gaSendToList)) {
        gaSendToList = [gaSendToList];
      }
      // Checking 'send_to' fields requires having all measurement ID results back from
      // the dynamic config fetch.
      const dynamicConfigResults = await promiseAllSettled(
        dynamicConfigPromisesList
      );
      for (const sendToId of gaSendToList) {
        // Any fetched dynamic measurement ID that matches this 'send_to' ID
        const foundConfig = dynamicConfigResults.find(
          config => config.measurementId === sendToId
        );
        const initializationPromise =
          foundConfig && initializationPromisesMap[foundConfig.appId];
        if (initializationPromise) {
          initializationPromisesToWaitFor.push(initializationPromise);
        } else {
          // Found an item in 'send_to' that is not associated
          // directly with an FID, possibly a group.  Empty this array,
          // exit the loop early, and let it get populated below.
          initializationPromisesToWaitFor = [];
          break;
        }
      }
    }

    // This will be unpopulated if there was no 'send_to' field , or
    // if not all entries in the 'send_to' field could be mapped to
    // a FID. In these cases, wait on all pending initialization promises.
    if (initializationPromisesToWaitFor.length === 0) {
      initializationPromisesToWaitFor = Object.values(
        initializationPromisesMap
      );
    }

    // Run core gtag function with args after all relevant initialization
    // promises have been resolved.
    await Promise.all(initializationPromisesToWaitFor);
    // Workaround for http://b/141370449 - third argument cannot be undefined.
    gtagCore(GtagCommand.EVENT, measurementId, gtagParams || {});
  } catch (e) {
    logger.error(e);
  }
}

/**
 * Wraps a standard gtag function with extra code to wait for completion of
 * relevant initialization promises before sending requests.
 *
 * @param gtagCore Basic gtag function that just appends to dataLayer.
 * @param initializationPromisesMap Map of appIds to their initialization promises.
 * @param dynamicConfigPromisesList Array of dynamic config fetch promises.
 * @param measurementIdToAppId Map of GA measurementIDs to corresponding Firebase appId.
 */
function wrapGtag(
  gtagCore: Gtag,
  /**
   * Allows wrapped gtag calls to wait on whichever intialization promises are required,
   * depending on the contents of the gtag params' `send_to` field, if any.
   */
  initializationPromisesMap: { [appId: string]: Promise<string> },
  /**
   * Wrapped gtag calls sometimes require all dynamic config fetches to have returned
   * before determining what initialization promises (which include FIDs) to wait for.
   */
  dynamicConfigPromisesList: Array<
    Promise<DynamicConfig | MinimalDynamicConfig>
  >,
  /**
   * Wrapped gtag config calls can narrow down which initialization promise (with FID)
   * to wait for if the measurementId is already fetched, by getting the corresponding appId,
   * which is the key for the initialization promises map.
   */
  measurementIdToAppId: { [measurementId: string]: string }
): Gtag {
  /**
   * Wrapper around gtag that ensures FID is sent with gtag calls.
   * @param command Gtag command type.
   * @param idOrNameOrParams Measurement ID if command is EVENT/CONFIG, params if command is SET.
   * @param gtagParams Params if event is EVENT/CONFIG.
   */
  async function gtagWrapper(
    command: 'config' | 'set' | 'event' | 'consent' | 'get' | string,
    ...args: unknown[]
  ): Promise<void> {
    try {
      // If event, check that relevant initialization promises have completed.
      if (command === GtagCommand.EVENT) {
        const [measurementId, gtagParams] = args;
        // If EVENT, second arg must be measurementId.
        await gtagOnEvent(
          gtagCore,
          initializationPromisesMap,
          dynamicConfigPromisesList,
          measurementId as string,
          gtagParams as GtagConfigOrEventParams
        );
      } else if (command === GtagCommand.CONFIG) {
        const [measurementId, gtagParams] = args;
        // If CONFIG, second arg must be measurementId.
        await gtagOnConfig(
          gtagCore,
          initializationPromisesMap,
          dynamicConfigPromisesList,
          measurementIdToAppId,
          measurementId as string,
          gtagParams as GtagConfigOrEventParams
        );
      } else if (command === GtagCommand.CONSENT) {
        const [gtagParams] = args;
        gtagCore(GtagCommand.CONSENT, 'update', gtagParams as ConsentSettings);
      } else if (command === GtagCommand.GET) {
        const [measurementId, fieldName, callback] = args;
        gtagCore(
          GtagCommand.GET,
          measurementId as string,
          fieldName as string,
          callback as (...args: unknown[]) => void
        );
      } else if (command === GtagCommand.SET) {
        const [customParams] = args;
        // If SET, second arg must be params.
        gtagCore(GtagCommand.SET, customParams as CustomParams);
      } else {
        gtagCore(command, ...args);
      }
    } catch (e) {
      logger.error(e);
    }
  }
  return gtagWrapper as Gtag;
}

/**
 * Creates global gtag function or wraps existing one if found.
 * This wrapped function attaches Firebase instance ID (FID) to gtag 'config' and
 * 'event' calls that belong to the GAID associated with this Firebase instance.
 *
 * @param initializationPromisesMap Map of appIds to their initialization promises.
 * @param dynamicConfigPromisesList Array of dynamic config fetch promises.
 * @param measurementIdToAppId Map of GA measurementIDs to corresponding Firebase appId.
 * @param dataLayerName Name of global GA datalayer array.
 * @param gtagFunctionName Name of global gtag function ("gtag" if not user-specified).
 */
export function wrapOrCreateGtag(
  initializationPromisesMap: { [appId: string]: Promise<string> },
  dynamicConfigPromisesList: Array<
    Promise<DynamicConfig | MinimalDynamicConfig>
  >,
  measurementIdToAppId: { [measurementId: string]: string },
  dataLayerName: string,
  gtagFunctionName: string
): {
  gtagCore: Gtag;
  wrappedGtag: Gtag;
} {
  // Create a basic core gtag function
  let gtagCore: Gtag = function (..._args: unknown[]) {
    // Must push IArguments object, not an array.
    (window[dataLayerName] as DataLayer).push(arguments);
  };

  // Replace it with existing one if found
  if (
    window[gtagFunctionName] &&
    typeof window[gtagFunctionName] === 'function'
  ) {
    // @ts-ignore
    gtagCore = window[gtagFunctionName];
  }

  window[gtagFunctionName] = wrapGtag(
    gtagCore,
    initializationPromisesMap,
    dynamicConfigPromisesList,
    measurementIdToAppId
  );

  return {
    gtagCore,
    wrappedGtag: window[gtagFunctionName] as Gtag
  };
}

/**
 * Returns the script tag in the DOM matching both the gtag url pattern
 * and the provided data layer name.
 */
export function findGtagScriptOnPage(
  dataLayerName: string
): HTMLScriptElement | null {
  const scriptTags = window.document.getElementsByTagName('script');
  for (const tag of Object.values(scriptTags)) {
    if (
      tag.src &&
      tag.src.includes(GTAG_URL) &&
      tag.src.includes(dataLayerName)
    ) {
      return tag;
    }
  }
  return null;
}
