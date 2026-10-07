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

/* eslint-disable no-restricted-properties */

import {
  USE_EMULATOR,
  getRunEnterpriseTests
} from '../integration/util/settings';

type ExtendedWithSkipHelpers<T> = T & {
  skipEmulator: ExtendedWithSkipHelpers<T>;
  skipEnterprise: ExtendedWithSkipHelpers<T>;
  skipClassic: ExtendedWithSkipHelpers<T>;
  skip: ExtendedWithSkipHelpers<T>;
};

function getSkip(target: { skip?: unknown }): unknown {
  const skipFn = target.skip as Record<string, unknown> | undefined;
  if (skipFn && (typeof skipFn === 'function' || typeof skipFn === 'object')) {
    skipFn.__isSkip = true;
    mixinSkipImplementations(skipFn);
  }
  return skipFn;
}

// Define helpers
export function mixinSkipImplementations(obj: unknown): void {
  if (!obj || Object.getOwnPropertyDescriptor(obj, 'skipEmulator')) {
    return;
  }

  Object.defineProperty(obj, 'skipEmulator', {
    get(): unknown {
      if (
        (this as { __isSkip?: boolean }).__isSkip ||
        this === it.skip ||
        this === describe.skip
      ) {
        return this;
      }
      if (USE_EMULATOR) {
        return getSkip(this);
      }
      return this;
    }
  });

  Object.defineProperty(obj, 'skipEnterprise', {
    get(): unknown {
      if (
        (this as { __isSkip?: boolean }).__isSkip ||
        this === it.skip ||
        this === describe.skip
      ) {
        return this;
      }
      if (getRunEnterpriseTests()) {
        return getSkip(this);
      }
      return this;
    }
  });

  Object.defineProperty(obj, 'skipClassic', {
    get(): unknown {
      if (
        (this as { __isSkip?: boolean }).__isSkip ||
        this === it.skip ||
        this === describe.skip
      ) {
        return this;
      }
      if (!getRunEnterpriseTests()) {
        return getSkip(this);
      }
      return this;
    }
  });
}

[it, it.skip, describe, describe.skip].forEach(mixinSkipImplementations);

// Export modified it and describe.
const extendedIt = it as ExtendedWithSkipHelpers<typeof it>;
const extendedDescribe = describe as ExtendedWithSkipHelpers<typeof describe>;
export { extendedIt as it, extendedDescribe as describe };
