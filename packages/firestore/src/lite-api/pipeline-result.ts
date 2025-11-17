/**
 * @license
 * Copyright 2024 Google LLC
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

import { RealtimePipeline } from '../api/realtime_pipeline';
import { SnapshotMetadata } from '../api/snapshot';
import { Document } from '../model/document';
import { ObjectValue } from '../model/object_value';
import { isOptionalEqual } from '../util/misc';

import { Field, isField } from './expressions';
import { FieldPath } from './field_path';
import { Pipeline } from './pipeline';
import { DocumentData, DocumentReference, refEqual } from './reference';
import { Timestamp } from './timestamp';
import { fieldPathFromArgument } from './user_data_reader';
import { AbstractUserDataWriter } from './user_data_writer';
import { ListenOptions } from '../core/event_manager';

/**
 * @beta
 * Represents the results of a Firestore pipeline execution.
 *
 * A `PipelineSnapshot` contains zero or more {@link PipelineResult} objects
 * representing the documents returned by a pipeline query. It provides methods
 * to iterate over the documents and access metadata about the query results.
 *
 * @example
 * ```typescript
 * const snapshot: PipelineSnapshot = await firestore
 *   .pipeline()
 *   .collection('myCollection')
 *   .where(field('value').greaterThan(10))
 *   .execute();
 *
 * snapshot.results.forEach(doc => {
 *   console.log(doc.id, '=>', doc.data());
 * });
 * ```
 */
export class PipelineSnapshot {
  private readonly _pipeline: Pipeline;
  private readonly _executionTime: Timestamp | undefined;
  private readonly _results: PipelineResult[];
  constructor(
    pipeline: Pipeline,
    results: PipelineResult[],
    executionTime?: Timestamp
  ) {
    this._pipeline = pipeline;
    this._executionTime = executionTime;
    this._results = results;
  }

  /**
   * @beta An array of all the results in the `PipelineSnapshot`.
   */
  get results(): PipelineResult[] {
    return this._results;
  }

  /**
   * @beta
   * The time at which the pipeline producing this result is executed.
   *
   * @type {Timestamp}
   * @readonly
   *
   */
  get executionTime(): Timestamp {
    if (this._executionTime === undefined) {
      throw new Error(
        "'executionTime' is expected to exist, but it is undefined"
      );
    }
    return this._executionTime;
  }
}

/**
 * @beta
 *
 * A PipelineResult contains data read from a Firestore Pipeline. The data can be extracted with the
 * {@link #data()} or {@link #get(String)} methods.
 *
 * <p>If the PipelineResult represents a non-document result, `ref` will return a undefined
 * value.
 */
export class PipelineResult {
  private readonly _userDataWriter: AbstractUserDataWriter;

  private readonly _createTime: Timestamp | undefined;
  private readonly _updateTime: Timestamp | undefined;

  readonly _metadata: SnapshotMetadata | undefined;
  readonly _listenOptions: ListenOptions | undefined;

  /**
   * @internal
   * @private
   */
  readonly _ref: DocumentReference | undefined;

  /**
   * @internal
   * @private
   */
  readonly _fields: ObjectValue;

  /**
   * @hideconstructor
   * @private
   * @internal
   *
   * @param userDataWriter The serializer used to encode/decode protobuf.
   * @param ref The reference to the document.
   * @param fields The fields of the Firestore `Document` Protobuf backing
   * this document.
   * @param createTime The time when the document was created if the result is a document, undefined otherwise.
   * @param updateTime The time when the document was last updated if the result is a document, undefined otherwise.
   * @param metadata
   * @param listenOptions
   */
  constructor(
    userDataWriter: AbstractUserDataWriter,
    ref?: DocumentReference,
    fields?: ObjectValue,
    createTime?: Timestamp,
    updateTime?: Timestamp,
    metadata?: SnapshotMetadata,
    listenOptions?: ListenOptions
  ) {
    this._ref = ref;
    this._userDataWriter = userDataWriter;
    this._createTime = createTime;
    this._updateTime = updateTime;
    this._fields = fields ?? ObjectValue.empty();
    this._metadata = metadata;
    this._listenOptions = listenOptions;
  }

  /**
   * @private
   * @internal
   * @param userDataWriter
   * @param doc
   * @param ref
   * @param metadata
   */
  static fromDocument(
    userDataWriter: AbstractUserDataWriter,
    doc: Document,
    ref?: DocumentReference,
    metadata?: SnapshotMetadata,
    listenOptions?: ListenOptions
  ): PipelineResult {
    return new PipelineResult(
      userDataWriter,
      ref,
      doc.data,
      doc.createTime.toTimestamp(),
      doc.version.toTimestamp(),
      metadata,
      listenOptions
    );
  }

  /**
   * @beta
   * The reference of the document, if it is a document; otherwise `undefined`.
   */
  get ref(): DocumentReference | undefined {
    return this._ref;
  }

  /**
   * @beta
   * The ID of the document for which this PipelineResult contains data, if it is a document; otherwise `undefined`.
   *
   * @type {string}
   * @readonly
   *
   */
  get id(): string | undefined {
    return this._ref?.id;
  }

  /**
   * @beta
   * The time the document was created. Undefined if this result is not a document.
   *
   * @type {Timestamp|undefined}
   * @readonly
   */
  get createTime(): Timestamp | undefined {
    return this._createTime;
  }

  /**
   * @beta
   * The time the document was last updated (at the time the snapshot was
   * generated). Undefined if this result is not a document.
   *
   * @type {Timestamp|undefined}
   * @readonly
   */
  get updateTime(): Timestamp | undefined {
    return this._updateTime;
  }

  /**
   * @beta
   * Retrieves all fields in the result as an object.
   *
   * @returns {T} An object containing all fields in the document or
   * 'undefined' if the document doesn't exist.
   *
   * @example
   * ```
   * let p = firestore.pipeline().collection('col');
   *
   * p.execute().then(results => {
   *   let data = results[0].data();
   *   console.log(`Retrieved data: ${JSON.stringify(data)}`);
   * });
   * ```
   */
  data(): DocumentData {
    return this._userDataWriter.convertValue(
      this._fields.value,
      this._listenOptions?.serverTimestampBehavior
    ) as DocumentData;
  }

  /**
   * @beta
   * Retrieves the field specified by `field`.
   *
   * @param {string|FieldPath|Field} field The field path
   * (e.g. 'foo' or 'foo.bar') to a specific field.
   * @returns {*} The data at the specified field location or undefined if no
   * such field exists.
   *
   * @example
   * ```
   * let p = firestore.pipeline().collection('col');
   *
   * p.execute().then(results => {
   *   let field = results[0].get('a.b');
   *   console.log(`Retrieved field value: ${field}`);
   * });
   * ```
   */
  // We deliberately use `any` in the external API to not impose type-checking
  // on end users.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(fieldPath: string | FieldPath | Field): any {
    if (this._fields === undefined) {
      return undefined;
    }
    if (isField(fieldPath)) {
      fieldPath = fieldPath.fieldName;
    }

    const value = this._fields.field(
      fieldPathFromArgument('DocumentSnapshot.get', fieldPath)
    );
    if (value !== null) {
      return this._userDataWriter.convertValue(
        value,
        this._listenOptions?.serverTimestampBehavior
      );
    }
  }
}

export function pipelineResultEqual(
  left: PipelineResult,
  right: PipelineResult
): boolean {
  if (left === right) {
    return true;
  }

  return (
    isOptionalEqual(left._ref, right._ref, refEqual) &&
    isOptionalEqual(left._fields, right._fields, (l, r) => l.isEqual(r))
  );
}

export function toPipelineResult(
  doc: Document,
  pipeline: RealtimePipeline,
  listenOptions?: ListenOptions
): PipelineResult {
  return PipelineResult.fromDocument(
    pipeline._userDataWriter,
    doc,
    doc.key.path
      ? new DocumentReference(pipeline._db, null, doc.key)
      : undefined,
    undefined,
    listenOptions
  );
}
