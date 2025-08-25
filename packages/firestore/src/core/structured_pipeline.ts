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

import { ObjectValue } from '../model/object_value';
import { FieldPath } from '../model/path';
import {
  StructuredPipeline as StructuredPipelineProto,
  Pipeline as PipelineProto,
  ApiClientObjectMap,
  Value
} from '../protos/firestore_proto_api';
import { JsonProtoSerializer, ProtoSerializable } from '../remote/serializer';
import { mapToArray } from '../util/obj';

export interface StructuredPipelineOptions {
  indexMode?: 'recommended';
}

export class StructuredPipeline
  implements ProtoSerializable<StructuredPipelineProto>
{
  constructor(
    private pipeline: ProtoSerializable<PipelineProto>,
    private options: StructuredPipelineOptions,
    private optionsOverride: ApiClientObjectMap<Value>
  ) {}

  /**
   * @private
   * @internal for testing
   */
  _getKnownOptions(): ObjectValue {
    const options: ObjectValue = ObjectValue.empty();

    // SERIALIZE KNOWN OPTIONS
    if (typeof this.options.indexMode === 'string') {
      options.set(FieldPath.fromServerFormat('index_mode'), {
        stringValue: this.options.indexMode
      });
    }

    return options;
  }

  private getOptionsProto(): ApiClientObjectMap<Value> {
    const options: ObjectValue = this._getKnownOptions();

    // APPLY OPTIONS OVERRIDES
    const optionsMap = new Map(
      mapToArray(this.optionsOverride, (value, key) => [
        FieldPath.fromServerFormat(key),
        value
      ])
    );
    options.setAll(optionsMap);

    return options.value.mapValue.fields ?? {};
  }

  _toProto(serializer: JsonProtoSerializer): StructuredPipelineProto {
    return {
      pipeline: this.pipeline._toProto(serializer),
      options: this.getOptionsProto()
    };
  }
}
