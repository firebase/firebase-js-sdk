/**
 * @license
 * Copyright 2023 Google LLC
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

import {
  AggregateQuerySnapshot as LiteAggregateQuerySnapshot,
  AggregateSpec
} from '../lite-api/aggregate_types';
import {DocumentData, Query} from "../lite-api/reference";
import {AbstractUserDataWriter} from "../lite-api/user_data_writer";
import {ApiClientObjectMap, Value} from "../protos/firestore_proto_api";

import {
  SnapshotMetadata
} from "./snapshot";

export class AggregateQuerySnapshot<
  AggregateSpecType extends AggregateSpec,
  AppModelType = DocumentData,
  DbModelType extends DocumentData = DocumentData> extends LiteAggregateQuerySnapshot<AggregateSpecType, AppModelType, DbModelType> {
  /**
   *  Metadata about the `DocumentSnapshot`, including information about its
   *  source and local modifications.
   */
  readonly metadata: SnapshotMetadata;

  /** @hideconstructor protected */
  constructor(
    query: Query<AppModelType, DbModelType>,
    _userDataWriter: AbstractUserDataWriter,
    _data: ApiClientObjectMap<Value>,
    metadata: SnapshotMetadata,
  ) {
    super(query, _userDataWriter, _data);
    this.metadata = metadata;
  }
}
