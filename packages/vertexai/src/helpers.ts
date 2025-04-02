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

import { GENAI_TYPE } from './constants';
import { GenAIError } from './errors';
import { BackendType, InstanceIdentifier } from './public-types';
import { GenAIErrorCode } from './types';

/**
 * Encodes an {@link InstanceIdentifier} into a string.
 * 
 * This string is used to identify unique {@link GenAI} instances by backend type.
 * 
 * @internal
 */
export function encodeInstanceIdentifier(
  instanceIdentifier: InstanceIdentifier
): string {
  switch (instanceIdentifier.backendType) {
    case BackendType.VERTEX_AI:
      return `${GENAI_TYPE}/vertexai/${instanceIdentifier.location}`;
    case BackendType.GOOGLE_AI:
      return `${GENAI_TYPE}/googleai`;
    default:
      throw new GenAIError(
        GenAIErrorCode.ERROR,
        `Unknown backend '${instanceIdentifier}'`
      );
  }
}

/**
 * Decodes an instance identifier string into an {@link InstanceIdentifier}.
 * 
 * @internal
 */
export function decodeInstanceIdentifier(
  instanceIdentifier: string
): InstanceIdentifier {
  const identifierParts = instanceIdentifier.split('/');
  if (identifierParts[0] !== GENAI_TYPE) {
    throw new GenAIError(GenAIErrorCode.ERROR, `Invalid instance identifier, unknown prefix '${identifierParts[0]}'`);
  }
  const backend = identifierParts[1];
  switch (backend) {
    case 'vertexai':
      const location: string | undefined = identifierParts[2];
      if (!location) {
        throw new GenAIError(GenAIErrorCode.ERROR, `Invalid instance identifier, unknown location '${instanceIdentifier}'`);
      }
      return {
        backendType: BackendType.VERTEX_AI,
        location
      };
    case 'googleai':
      return {
        backendType: BackendType.GOOGLE_AI
      };
    default:
      throw new GenAIError(
        GenAIErrorCode.ERROR,
        `Invalid instance identifier string: '${instanceIdentifier}'`
      );
  }
}
