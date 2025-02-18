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

import { DEFAULT_LOCATION } from './constants';
import { GenAIError } from './errors';
import { BackendType, InstanceIdentifier } from './public-types';
import { GenAIErrorCode } from './types';

/**
 * @internal
 */
export function encodeInstanceIdentifier(
  instanceIdentifier: InstanceIdentifier,
): string {
  switch(instanceIdentifier.backendType) {
    case BackendType.VERTEX_AI:
      return `genai/vertexai/${location || DEFAULT_LOCATION}`;
    case BackendType.GOOGLE_AI:
      return 'genai/googleai'
    default:
      throw new GenAIError(GenAIErrorCode.ERROR, `An internal error occured: Unknown Backend ${instanceIdentifier}. Please submit an issue at https://github.com/firebase/firebase-js-sdk.`)
  }
}

/**
 * @internal
 */
export function decodeInstanceIdentifier(instanceIdentifier: string): InstanceIdentifier {
  const identifierParts = instanceIdentifier.split('/');
  const backend = identifierParts[1];
  switch (backend) {
    case 'vertexai':
      const location: string | undefined = identifierParts[1]; // The location may not be a part of the instance identifier
      return {
        backendType: BackendType.VERTEX_AI,
        location
      };
    case 'googleai':
      return {
        backendType: BackendType.GOOGLE_AI,
      };
    default:
      throw new GenAIError(
        GenAIErrorCode.ERROR,
        `An internal error occured: Invalid instance identifier: ${instanceIdentifier}. Please submit an issue at https://github.com/firebase/firebase-js-sdk`
      );
  }
}
