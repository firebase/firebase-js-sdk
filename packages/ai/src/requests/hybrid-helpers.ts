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
import { ChromeAdapterImpl } from '../methods/chrome-adapter';

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
 * Dispatches a request to the appropriate backend (on-device or in-cloud)
 * based on the inference mode.
 *
 * @param request - The request to be sent.
 * @param chromeAdapter - The on-device model adapter.
 * @param onDeviceCall - The function to call for on-device inference.
 * @param inCloudCall - The function to call for in-cloud inference.
 * @returns The response from the backend.
 */
export async function callCloudOrDevice<Response>(
  request: GenerateContentRequest,
  chromeAdapter: ChromeAdapter | undefined,
  onDeviceCall: () => Promise<Response>,
  inCloudCall: () => Promise<Response>
): Promise<CallResult<Response>> {
  if (!chromeAdapter) {
    return {
      response: await inCloudCall(),
      inferenceSource: InferenceSource.IN_CLOUD
    };
  }
  switch ((chromeAdapter as ChromeAdapterImpl).mode) {
    case InferenceMode.ONLY_ON_DEVICE:
      if (await chromeAdapter.isAvailable(request)) {
        return {
          response: await onDeviceCall(),
          inferenceSource: InferenceSource.ON_DEVICE
        };
      }
      throw new AIError(
        AIErrorCode.UNSUPPORTED,
        'Inference mode is ONLY_ON_DEVICE, but an on-device model is not available.'
      );
    case InferenceMode.ONLY_IN_CLOUD:
      return {
        response: await inCloudCall(),
        inferenceSource: InferenceSource.IN_CLOUD
      };
    case InferenceMode.PREFER_IN_CLOUD:
      try {
        return {
          response: await inCloudCall(),
          inferenceSource: InferenceSource.IN_CLOUD
        };
      } catch (e) {
        if (e instanceof AIError && errorsCausingFallback.includes(e.code)) {
          return {
            response: await onDeviceCall(),
            inferenceSource: InferenceSource.ON_DEVICE
          };
        }
        throw e;
      }
    case InferenceMode.PREFER_ON_DEVICE:
      if (await chromeAdapter.isAvailable(request)) {
        return {
          response: await onDeviceCall(),
          inferenceSource: InferenceSource.ON_DEVICE
        };
      }
      return {
        response: await inCloudCall(),
        inferenceSource: InferenceSource.IN_CLOUD
      };
    default:
      throw new AIError(
        AIErrorCode.ERROR,
        `Unexpected infererence mode: ${
          (chromeAdapter as ChromeAdapterImpl).mode
        }`
      );
  }
}
