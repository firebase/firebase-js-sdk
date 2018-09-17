/**
 * Copyright 2018 Google Inc.
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

import { DocumentKey } from '../model/document_key';
import { ObjectValue } from '../model/field_value';
import {
  FieldMask,
  FieldTransform,
  Mutation,
  PatchMutation,
  Precondition,
  SetMutation,
  TransformMutation
} from '../model/mutation';
import { FieldPath } from '../model/path';
import { TransformOperation } from '../model/transform_operation';
import { fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';

const RESERVED_FIELD_REGEX = /^__.*__$/;

/*
 * Represents what type of API method provided the data being parsed; useful
 * for determining which error conditions apply during parsing and providing
 * better error messages.
 */
export enum UserDataSource {
  /** The data comes from a regular Set operation, without merge. */
  Set,
  /** The data comes from a Set operation with merge enabled. */
  MergeSet,
  /** The data comes from an Update operation. */
  Update,
  /**
   * Indicates the source is a where clause, cursor bound, arrayUnion()
   * element, etc. Of note, ParseContext.isWrite() will return false.
   */
  Argument
}

/**
 * Accumulates the side-effect results of parsing user input. These include:
 *
 *   * The field mask naming all the fields that have values.
 *   * The transform operations that must be applied in the batch to implement
 *     server-generated behavior. In the wire protocol these are encoded
 *     separately from the Value.
 */
export class ParseAccumulator {
  /** Accumulates a list of the field paths found while parsing the data. */
  private fieldMask: FieldPath[] = [];

  /** Accumulates a list of field transforms found while parsing the data. */
  readonly fieldTransforms: FieldTransform[] = [];

  /**
   * @param methodName The name of the calling user-visible method, e.g.
   *     'DocumentReference.set'.
   * @param dataSource The type of API method provided the data being parsed;
   *     useful for determining which error conditions apply during parsing and
   *     providing better error messages.
   */
  constructor(
    readonly methodName: string,
    readonly dataSource: UserDataSource
  ) {}

  /** Returns a new ParseContext representing the root of a user document. */
  rootContext(): ParseContext {
    return new ParseContext(
      this,
      FieldPath.EMPTY_PATH,
      /* arrayElement= */ false
    );
  }

  /** Returns 'true' if 'fieldPath' was traversed when creating this context. */
  contains(fieldPath: FieldPath): boolean {
    return (
      this.fieldMask.find(field => fieldPath.isPrefixOf(field)) !== undefined ||
      this.fieldTransforms.find(transform =>
        fieldPath.isPrefixOf(transform.field)
      ) !== undefined
    );
  }

  /** Adds the given `fieldPath` to the accumulated FieldMask. */
  addToFieldMask(fieldPath: FieldPath): void {
    this.fieldMask.push(fieldPath);
  }

  /** Adds a transformation for the given field path. */
  addToFieldTransforms(
    fieldPath: FieldPath,
    transformOperation: TransformOperation
  ): void {
    this.fieldTransforms.push(
      new FieldTransform(fieldPath, transformOperation)
    );
  }

  /**
   * Wraps the given `data` and `userFieldMask` along with any accumulated
   * transforms that are covered by the given field mask into a ParsedSetData
   * that represents a user-issued merge.
   *
   * @param data The converted user data.
   * @param userFieldMask The user-supplied field mask that masks out any
   *     changes that have been accumulated so far.
   * @return ParsedSetData that wraps the contents of this ParseAccumulator. The
   *     field mask in the result will be the `userFieldMask` and only
   *     transforms that are covered by the mask will be included.
   */
  toMergeData(data: ObjectValue, userFieldMask?: FieldMask): ParsedSetData {
    if (userFieldMask) {
      const coveredFieldTransforms = this.fieldTransforms.filter(transform =>
        userFieldMask.covers(transform.field)
      );
      return new ParsedSetData(data, userFieldMask, coveredFieldTransforms);
    } else {
      return new ParsedSetData(
        data,
        new FieldMask(this.fieldMask),
        this.fieldTransforms
      );
    }
  }

  /**
   * Wraps the given `data` along with any accumulated transforms into a
   * ParsedSetData that represents a user-issued Set.
   *
   * @return ParsedSetData that wraps the contents of this ParseAccumulator.
   */
  toSetData(data: ObjectValue): ParsedSetData {
    return new ParsedSetData(data, /* fieldMask= */ null, this.fieldTransforms);
  }

  /**
   * Wraps the given `data` along with any accumulated field mask and transforms
   * into a ParsedUpdateData that represents a user-issued Update.
   *
   * @return ParsedSetData that wraps the contents of this ParseAccumulator.
   */
  toUpdateData(data: ObjectValue): ParsedUpdateData {
    return new ParsedUpdateData(
      data,
      new FieldMask(this.fieldMask),
      this.fieldTransforms
    );
  }
}

/**
 * A "context" object that wraps a ParseAccumulator and refers to a specific
 * location in a user-supplied document. Instances are created and passed around
 * while traversing user data during parsing in order to conveniently accumulate
 * data in the ParseAccumulator.
 */
export class ParseContext {
  /**
   * Initializes a ParseContext with the given source and path.
   *
   * @param accumulator The ParseAccumulator on which to add results.
   * @param path A path within the object being parsed. This could be an empty
   *     path (in which case the context represents the root of the data being
   *     parsed), or a nonempty path (indicating the context represents a nested
   *     location within the data).
   * @param arrayElement Whether or not this context corresponds to an element
   *     of an array.
   *
   * TODO(b/34871131): We don't support array paths right now, so path can be
   * null to indicate the context represents any location within an array (in
   * which case certain features will not work and errors will be somewhat
   * compromised).
   */
  constructor(
    private accumulator: ParseAccumulator,
    readonly path: FieldPath | null,
    readonly arrayElement: boolean
  ) {}

  get dataSource(): UserDataSource {
    return this.accumulator.dataSource;
  }

  get fieldTransforms(): FieldTransform[] {
    return this.accumulator.fieldTransforms;
  }

  isWrite(): boolean {
    switch (this.accumulator.dataSource) {
      case UserDataSource.Set: // fall through
      case UserDataSource.MergeSet: // fall through
      case UserDataSource.Update:
        return true;
      case UserDataSource.Argument:
        return false;
      default:
        throw fail(
          `Unexpected case for UserDataSource: ${this.accumulator.dataSource}`
        );
    }
  }

  childContextForField(field: string): ParseContext {
    const childPath = this.path == null ? null : this.path.child(field);
    const context = new ParseContext(
      this.accumulator,
      childPath,
      /*arrayElement=*/ false
    );
    context.validatePathSegment(field);
    return context;
  }

  childContextForFieldPath(field: FieldPath): ParseContext {
    const childPath = this.path == null ? null : this.path.child(field);
    const context = new ParseContext(
      this.accumulator,
      childPath,
      /*arrayElement=*/ false
    );
    context.validatePath();
    return context;
  }

  childContextForArray(index: number): ParseContext {
    // TODO(b/34871131): We don't support array paths right now; so make path
    // null.
    return new ParseContext(
      this.accumulator,
      /*path=*/ null,
      /*arrayElement=*/ true
    );
  }

  /** Adds the given `fieldPath` to the accumulated FieldMask. */
  addToFieldMask(fieldPath: FieldPath): void {
    this.accumulator.addToFieldMask(fieldPath);
  }

  /** Adds a transformation for the given field path. */
  addToFieldTransforms(
    fieldPath: FieldPath,
    transformOperation: TransformOperation
  ): void {
    this.accumulator.addToFieldTransforms(fieldPath, transformOperation);
  }

  createError(reason: string): Error {
    const fieldDescription =
      this.path === null || this.path.isEmpty()
        ? ''
        : ` (found in field ${this.path.toString()})`;
    return new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${this.accumulator.methodName}() called with invalid data. ` +
        reason +
        fieldDescription
    );
  }

  private validatePath(): void {
    // TODO(b/34871131): Remove null check once we have proper paths for fields
    // within arrays.
    if (this.path === null) {
      return;
    }
    for (let i = 0; i < this.path.length; i++) {
      this.validatePathSegment(this.path.get(i));
    }
  }

  private validatePathSegment(segment: string): void {
    if (this.isWrite() && RESERVED_FIELD_REGEX.test(segment)) {
      throw this.createError('Document fields cannot begin and end with __');
    }
  }
}

/** The result of parsing document data (e.g. for a setData call). */
export class ParsedSetData {
  constructor(
    readonly data: ObjectValue,
    readonly fieldMask: FieldMask | null,
    readonly fieldTransforms: FieldTransform[]
  ) {}

  toMutations(key: DocumentKey, precondition: Precondition): Mutation[] {
    const mutations = [] as Mutation[];
    if (this.fieldMask !== null) {
      mutations.push(
        new PatchMutation(key, this.data, this.fieldMask, precondition)
      );
    } else {
      mutations.push(new SetMutation(key, this.data, precondition));
    }
    if (this.fieldTransforms.length > 0) {
      mutations.push(new TransformMutation(key, this.fieldTransforms));
    }
    return mutations;
  }
}

/** The result of parsing "update" data (i.e. for an updateData call). */
export class ParsedUpdateData {
  constructor(
    readonly data: ObjectValue,
    readonly fieldMask: FieldMask,
    readonly fieldTransforms: FieldTransform[]
  ) {}

  toMutations(key: DocumentKey, precondition: Precondition): Mutation[] {
    const mutations = [
      new PatchMutation(key, this.data, this.fieldMask, precondition)
    ] as Mutation[];
    if (this.fieldTransforms.length > 0) {
      mutations.push(new TransformMutation(key, this.fieldTransforms));
    }
    return mutations;
  }
}
