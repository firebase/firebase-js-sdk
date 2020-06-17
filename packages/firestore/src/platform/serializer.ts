/**
 * @license
 * Copyright 2017 Google LLC
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
import { newSerializer as nodeNewSerializer } from './node/serializer';
import { newSerializer as rnNewSerializer } from './rn/serializer';
import { newSerializer as browserNewSerializer } from './browser/serializer';
import { DatabaseId } from '../core/database_info';
import { JsonProtoSerializer } from '../remote/serializer';

export function newSerializer(databaseId: DatabaseId): JsonProtoSerializer {
  if (isNode()) {
    return nodeNewSerializer(databaseId);
  } else if (isReactNative()) {
    return rnNewSerializer(databaseId);
  } else {
    return browserNewSerializer(databaseId);
  }
}
