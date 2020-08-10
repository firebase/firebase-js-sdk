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

import { isNode, isReactNative } from '@firebase/util';
import { DatabaseId } from '../core/database_info';
import { JsonProtoSerializer } from '../remote/serializer';
import * as node from './node/serializer';
import * as rn from './rn/serializer';
import * as browser from './browser/serializer';

// This file is only used under ts-node.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const platform = require(`./${process.env.TEST_PLATFORM ?? 'node'}/serializer`);

export function newSerializer(databaseId: DatabaseId): JsonProtoSerializer {
  return platform.newSerializer(databaseId);
}

/**
 * An instance of the Platform's 'TextEncoder' implementation.
 */
export function newTextEncoder(): TextEncoder {
  if (isNode()) {
    return node.newTextEncoder();
  } else if (isReactNative()) {
    return rn.newTextEncoder();
  } else {
    return browser.newTextEncoder();
  }
}

/**
 * An instance of the Platform's 'TextDecoder' implementation.
 */
export function newTextDecoder(): TextDecoder {
  if (isNode()) {
    return node.newTextDecoder() as TextDecoder;
  } else if (isReactNative()) {
    return rn.newTextDecoder();
  } else {
    return browser.newTextDecoder();
  }
}
