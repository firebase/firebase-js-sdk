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

/**
 * @internal
 */
export function createInstanceIdentifier(
  developerAPIEnabled?: boolean,
  location?: string
): string {
  if (developerAPIEnabled) {
    return 'developerAPI';
  } else {
    return `vertexAI/${location || DEFAULT_LOCATION}`;
  }
}

/**
 * @internal
 */
export function parseInstanceIdentifier(instanceIdentifier: string): {
  developerAPIEnabled: boolean;
  location?: string;
} {
  const identifierParts = instanceIdentifier.split('/');
  if (identifierParts[0] === 'developerAPI') {
    return {
      developerAPIEnabled: true,
      location: undefined
    };
  } else {
    const location = identifierParts[1];
    return {
      developerAPIEnabled: false,
      location
    };
  }
}
