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
  InferenceMode
} from '../types';
import { ChromeAdapter } from '../types/chrome-adapter';

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
): Promise<Response> {
  if (!chromeAdapter) {
    return inCloudCall();
  }
  switch (chromeAdapter.mode) {
    case InferenceMode.PREFER_IN_CLOUD:
      try {
        return await inCloudCall();
      } catch (e) {
        if (e instanceof AIError) {
          return onDeviceCall();
        }
        throw e;
      }
    default:
      if (await chromeAdapter.isAvailable(request)) {
        return onDeviceCall();
      }
      return inCloudCall();
  }
}
