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

import { AI_TYPE } from './constants';
import { AIError } from './errors';
import { AIErrorCode } from './types';
import { Backend, GoogleAIBackend, VertexAIBackend } from './backend';

/**
 * Encodes a {@link Backend} into a string that will be used to uniquely identify {@link AI}
 * instances by backend type.
 *
 * @internal
 */
export function encodeInstanceIdentifier(backend: Backend): string {
  if (backend instanceof GoogleAIBackend) {
    return `${AI_TYPE}/googleai`;
  } else if (backend instanceof VertexAIBackend) {
    return `${AI_TYPE}/vertexai/${backend.location}`;
  } else {
    throw new AIError(
      AIErrorCode.ERROR,
      `Invalid backend: ${JSON.stringify(backend.backendType)}`
    );
  }
}

/**
 * Decodes an instance identifier string into a {@link Backend}.
 *
 * @internal
 */
export function decodeInstanceIdentifier(instanceIdentifier: string): Backend {
  const identifierParts = instanceIdentifier.split('/');
  if (identifierParts[0] !== AI_TYPE) {
    throw new AIError(
      AIErrorCode.ERROR,
      `Invalid instance identifier, unknown prefix '${identifierParts[0]}'`
    );
  }
  const backendType = identifierParts[1];
  switch (backendType) {
    case 'vertexai':
      const location: string | undefined = identifierParts[2];
      if (!location) {
        throw new AIError(
          AIErrorCode.ERROR,
          `Invalid instance identifier, unknown location '${instanceIdentifier}'`
        );
      }
      return new VertexAIBackend(location);
    case 'googleai':
      return new GoogleAIBackend();
    default:
      throw new AIError(
        AIErrorCode.ERROR,
        `Invalid instance identifier string: '${instanceIdentifier}'`
      );
  }
}
