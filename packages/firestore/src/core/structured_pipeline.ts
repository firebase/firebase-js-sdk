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

import {ParseContext} from "../api/parse_context";
import {UserData} from "../lite-api/user_data_reader";
import {
  ApiClientObjectMap, firestoreV1ApiClientInterfaces,
  Pipeline as PipelineProto,
  StructuredPipeline as StructuredPipelineProto
} from '../protos/firestore_proto_api';
import {
  JsonProtoSerializer,
  ProtoSerializable,
} from '../remote/serializer';

import {OptionsUtil} from "./options_util";

export class StructuredPipelineOptions implements UserData{
  proto: ApiClientObjectMap<firestoreV1ApiClientInterfaces.Value> | undefined;

  readonly optionsUtil = new OptionsUtil({
    indexMode: {
      serverName: 'index_mode',
    }
  });

  constructor(
    private _userOptions: Record<string, unknown> = {},
    private _optionsOverride: Record<string, unknown> = {}) {}

  _readUserData(context: ParseContext): void {
    this.proto = this.optionsUtil.getOptionsProto(context, this._userOptions, this._optionsOverride);
  }
}

export class StructuredPipeline
  implements ProtoSerializable<StructuredPipelineProto>
{
  constructor(
    private pipeline: ProtoSerializable<PipelineProto>,
    private options: StructuredPipelineOptions,
  ) {}

  _toProto(serializer: JsonProtoSerializer): StructuredPipelineProto {
    return {
      pipeline: this.pipeline._toProto(serializer),
      options: this.options.proto
    };
  }
}
