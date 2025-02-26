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

import { Field } from './expressions';
import { FieldPath } from './field_path';
import { Pipeline } from './pipeline';
import { DocumentData, DocumentReference, refEqual } from './reference';
import { fieldPathFromArgument } from './snapshot';
import { Timestamp } from './timestamp';
import { AbstractUserDataWriter } from './user_data_writer';

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
   * The Pipeline on which you called `execute()` in order to get this
   * `PipelineSnapshot`.
   */
  get pipeline(): Pipeline {
    return this._pipeline;
  }

  /** An array of all the results in the `PipelineSnapshot`. */
  get results(): PipelineResult[] {
    return this._results;
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
export class PipelineResult<AppModelType = DocumentData> {
  private readonly _userDataWriter: AbstractUserDataWriter;

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
    createTime?: Timestamp,
    updateTime?: Timestamp
  ) {
    this._ref = ref;
    this._userDataWriter = userDataWriter;
    this._createTime = createTime;
    this._updateTime = updateTime;
    this._fields = fields;
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
  data(): AppModelType | undefined {
    if (this._fields === undefined) {
      return undefined;
    }

    return this._userDataWriter.convertValue(
      this._fields.value
    ) as AppModelType;
  }

  /**
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
