/*!
 * Copyright 2024 Google LLC. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { VectorValue } from '../lite-api/vector_value';
import {
  Value as ProtoValue,
  MapValue as ProtoMapValue
} from '../protos/firestore_proto_api';

const TYPE_KEY = '__type__';
const VECTOR_VALUE_SENTINEL = '__vector__';
export const VECTOR_MAP_VECTORS_KEY = 'value';

export function isVectorValue(value: ProtoValue | null): boolean {
  const type = (value?.mapValue?.fields || {})[TYPE_KEY]?.stringValue;
  return type === VECTOR_VALUE_SENTINEL;
}

/**
 * Creates a new VectorValue proto value (using the internal format).
 */
export function vectorValue(value: VectorValue): ProtoValue {
  const mapValue: ProtoMapValue = {
    fields: {
      [TYPE_KEY]: {
        stringValue: VECTOR_VALUE_SENTINEL
      },
      [VECTOR_MAP_VECTORS_KEY]: {
        arrayValue: {
          values: value.toArray().map(value => {
            return {
              doubleValue: value
            };
          })
        }
      }
    }
  };

  return { mapValue };
}
