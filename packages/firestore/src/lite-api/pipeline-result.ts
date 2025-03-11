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

import { ObjectValue } from '../model/object_value';
import { isOptionalEqual } from '../util/misc';

import { FieldPath } from './field_path';
import { DocumentData, DocumentReference, refEqual } from './reference';
import { fieldPathFromArgument } from './snapshot';
import { Timestamp } from './timestamp';
import { AbstractUserDataWriter } from './user_data_writer';
import { Document } from '../model/document';
import { Pipeline } from './pipeline';
import { RealtimePipeline } from '../api/realtime_pipeline';
import { SnapshotMetadata } from '../api/snapshot';

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

  private readonly _executionTime: Timestamp | undefined;
  private readonly _createTime: Timestamp | undefined;
  private readonly _updateTime: Timestamp | undefined;

  /**
   * @internal
   * @private
   */
  readonly _ref: DocumentReference | undefined;

  /**
   * @internal
   * @private
   */
  readonly _fields: ObjectValue | undefined;

  /**
   * @private
   * @internal
   *
   * @param userDataWriter The serializer used to encode/decode protobuf.
   * @param ref The reference to the document.
   * @param _fieldsProto The fields of the Firestore `Document` Protobuf backing
   * this document (or undefined if the document does not exist).
   * @param readTime The time when this result was read  (or undefined if
   * the document exists only locally).
   * @param createTime The time when the document was created if the result is a document, undefined otherwise.
   * @param updateTime The time when the document was last updated if the result is a document, undefined otherwise.
   */
  constructor(
    userDataWriter: AbstractUserDataWriter,
    ref?: DocumentReference,
    fields?: ObjectValue,
    executionTime?: Timestamp,
    createTime?: Timestamp,
    updateTime?: Timestamp,
    readonly metadata?: SnapshotMetadata
  ) {
    this._ref = ref;
    this._userDataWriter = userDataWriter;
    this._executionTime = executionTime;
    this._createTime = createTime;
    this._updateTime = updateTime;
    this._fields = fields;
  }

  static fromDocument(
    userDataWriter: AbstractUserDataWriter,
    doc: Document,
    ref?: DocumentReference,
    metadata?: SnapshotMetadata
  ): PipelineResult {
    return new PipelineResult(
      userDataWriter,
      ref,
      doc.data,
      doc.readTime.toTimestamp(),
      doc.createTime.toTimestamp(),
      doc.version.toTimestamp(),
      metadata
    );
  }

  /**
   * The reference of the document, if it is a document; otherwise `undefined`.
   */
  get ref(): DocumentReference | undefined {
    return this._ref;
  }

  /**
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
   * The time the document was created. Undefined if this result is not a document.
   *
   * @type {Timestamp|undefined}
   * @readonly
   */
  get createTime(): Timestamp | undefined {
    return this._createTime;
  }

  /**
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

  /**
   * Retrieves all fields in the result as an object. Returns 'undefined' if
   * the document doesn't exist.
   *
   * @returns {T|undefined} An object containing all fields in the document or
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
  data(): DocumentData | undefined {
    if (this._fields === undefined) {
      return undefined;
    }

    return this._userDataWriter.convertValue(
      this._fields.value
    ) as DocumentData;
  }

  /**
   * Retrieves the field specified by `field`.
   *
   * @param {string|FieldPath} field The field path
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
  get(fieldPath: string | FieldPath): any {
    if (this._fields === undefined) {
      return undefined;
    }

    const value = this._fields.field(
      fieldPathFromArgument('DocumentSnapshot.get', fieldPath)
    );
    if (value !== null) {
      return this._userDataWriter.convertValue(value);
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
  pipeline: RealtimePipeline
): PipelineResult {
  return PipelineResult.fromDocument(
    pipeline._userDataWriter,
    doc,
    doc.key.path
      ? new DocumentReference(pipeline._db, null, doc.key)
      : undefined
  );
}
