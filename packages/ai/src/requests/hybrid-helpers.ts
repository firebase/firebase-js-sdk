/**
 * @license
 * Copyright 2025 Google LLC
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

import { AIError } from '../errors';
import {
  GenerateContentRequest,
  InferenceMode,
  AIErrorCode,
  ChromeAdapter,
  InferenceSource
} from '../types';

const errorsCausingFallback: AIErrorCode[] = [
  // most network errors
  AIErrorCode.FETCH_ERROR,
  // fallback code for all other errors in makeRequest
  AIErrorCode.ERROR,
  // error due to API not being enabled in project
  AIErrorCode.API_NOT_ENABLED
];

interface CallResult<Response> {
  response: Response;
  inferenceSource: InferenceSource;
}

/**
 * Creates the error thrown in `ONLY_ON_DEVICE` mode when the on-device model
 * can't be used in this environment.
 */
export function createDeviceUnavailableError(): AIError {
  // TODO: API_NOT_ENABLED normally means the Firebase API isn't enabled in the
  // Console. Switch to a more accurate code in the next breaking change.
  return new AIError(
    AIErrorCode.API_NOT_ENABLED,
    'Local LanguageModel API not available in this environment.'
  );
}

/**
 * Dispatches a request to the appropriate backend (on-device or in-cloud)
 * based on the inference mode.
 *
 * All inference mode logic lives here. The adapter only reports what the
 * device can do.
 *
 * @param request - The request to be sent.
 * @param inferenceMode - The inference mode the model was created with.
 * @param chromeAdapter - The on-device model adapter. Undefined if this
 * environment has no on-device model API.
 * @param onDeviceCall - The function to call for on-device inference.
 * @param inCloudCall - The function to call for in-cloud inference.
 * @returns The response from the backend.
 */
export async function callCloudOrDevice<Response>(
  request: GenerateContentRequest,
  inferenceMode: InferenceMode | undefined,
  chromeAdapter: ChromeAdapter | undefined,
  onDeviceCall: () => Promise<Response>,
  inCloudCall: () => Promise<Response>
): Promise<CallResult<Response>> {
  const onDevice = async (): Promise<CallResult<Response>> => ({
    response: await onDeviceCall(),
    inferenceSource: InferenceSource.ON_DEVICE
  });
  const inCloud = async (): Promise<CallResult<Response>> => ({
    response: await inCloudCall(),
    inferenceSource: InferenceSource.IN_CLOUD
  });
  const isOnDeviceAvailable = async (): Promise<boolean> =>
    chromeAdapter ? chromeAdapter.isAvailable(request) : false;

  switch (inferenceMode) {
    case undefined:
    case InferenceMode.ONLY_IN_CLOUD:
      return inCloud();
    case InferenceMode.ONLY_ON_DEVICE: {
      const status = chromeAdapter
        ? await chromeAdapter.getOnDeviceStatus(request, {
            waitForDownload: true
          })
        : 'unavailable';
      switch (status) {
        case 'available':
        // Requests with content the on-device model may not support are still
        // sent to it, since this mode never falls back to the cloud.
        case 'request-not-supported':
          return onDevice();
        case 'not-initialized':
          throw new AIError(
            AIErrorCode.DEVICE_MODEL_NOT_INITIALIZED,
            'The on-device model has not been downloaded. Call ' +
              'initializeDeviceModel() after a user interaction, and wait ' +
              'for it to complete, before making on-device requests.'
          );
        case 'unavailable':
        default:
          throw createDeviceUnavailableError();
      }
    }
    case InferenceMode.PREFER_ON_DEVICE:
      return (await isOnDeviceAvailable()) ? onDevice() : inCloud();
    case InferenceMode.PREFER_IN_CLOUD:
      try {
        return await inCloud();
      } catch (e) {
        if (
          e instanceof AIError &&
          errorsCausingFallback.includes(e.code) &&
          (await isOnDeviceAvailable())
        ) {
          return onDevice();
        }
        throw e;
      }
    default:
      throw new AIError(
        AIErrorCode.ERROR,
        `Unexpected inference mode: ${inferenceMode}`
      );
  }
}
