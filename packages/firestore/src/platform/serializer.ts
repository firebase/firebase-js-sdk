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

// This file is only used in when the client is run under ts-node
// eslint-disable-next-line import/no-extraneous-dependencies
import { _components } from '@firebase/app-exp';

import { isNode, isReactNative } from '@firebase/util';
import * as node from './node/serializer';
import * as nodeLite from './node_lite/serializer';
import * as rn from './rn/serializer';
import * as browser from './browser/serializer';
import * as browserLite from './browser_lite/serializer';
import { DatabaseId } from '../core/database_info';
import { JsonProtoSerializer } from '../remote/serializer';

function isLite(): boolean {
  return _components.has('firestore/lite');
}

export function newSerializer(databaseId: DatabaseId): JsonProtoSerializer {
  if (isNode()) {
    return isLite()
      ? nodeLite.newSerializer(databaseId)
      : node.newSerializer(databaseId);
  } else if (isReactNative()) {
    return rn.newSerializer(databaseId);
  } else {
    return isLite()
      ? browserLite.newSerializer(databaseId)
      : browser.newSerializer(databaseId);
  }
}
