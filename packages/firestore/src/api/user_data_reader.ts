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

import * as firestore from '@firebase/firestore-types';

import * as api from '../protos/firestore_proto_api';

import { Timestamp } from './timestamp';
import { DatabaseId } from '../core/database_info';
import { DocumentKey } from '../model/document_key';
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
import { debugAssert, fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { isPlainObject, valueDescription } from '../util/input_validation';
import { Dict, forEach, isEmpty } from '../util/obj';
import { ObjectValue, ObjectValueBuilder } from '../model/object_value';
import { JsonProtoSerializer } from '../remote/serializer';
import { Blob } from './blob';
import {
  FieldPath as ExternalFieldPath,
  fromDotSeparatedString
} from './field_path';
import { DeleteFieldValueImpl, FieldValueImpl } from './field_value';
import { GeoPoint } from './geo_point';
import { PlatformSupport } from '../platform/platform';

const RESERVED_FIELD_REGEX = /^__.*__$/;

/**
 * A reference to a document in a Firebase project.
 *
 * This class serves as a common base class for the public DocumentReferences
 * exposed in the lite, full and legacy SDK.
 */
export class DocumentKeyReference<T> {
  constructor(
    public readonly _databaseId: DatabaseId,
    public readonly _key: DocumentKey,
    public readonly _converter?: firestore.FirestoreDataConverter<T>
  ) {}
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

/*
 * Represents what type of API method provided the data being parsed; useful
 * for determining which error conditions apply during parsing and providing
 * better error messages.
 */
export const enum UserDataSource {
  Set,
  Update,
  MergeSet,
  /**
   * Indicates the source is a where clause, cursor bound, arrayUnion()
   * element, etc. Of note, isWrite(source) will return false.
   */
  Argument,
  /**
   * Indicates that the source is an Argument that may directly contain nested
   * arrays (e.g. the operand of an `in` query).
   */
  ArrayArgument
}

function isWrite(dataSource: UserDataSource): boolean {
  switch (dataSource) {
    case UserDataSource.Set: // fall through
    case UserDataSource.MergeSet: // fall through
    case UserDataSource.Update:
      return true;
    case UserDataSource.Argument:
    case UserDataSource.ArrayArgument:
      return false;
    default:
      throw fail(`Unexpected case for UserDataSource: ${dataSource}`);
  }
}

/** Contains the settings that are mutated as we parse user data. */
interface ContextSettings {
  /** Indicates what kind of API method this data came from. */
  readonly dataSource: UserDataSource;
  /** The name of the method the user called to create the ParseContext. */
  readonly methodName: string;
  /**
   * A path within the object being parsed. This could be an empty path (in
   * which case the context represents the root of the data being parsed), or a
   * nonempty path (indicating the context represents a nested location within
   * the data).
   */
  readonly path?: FieldPath;
  /**
   * Whether or not this context corresponds to an element of an array.
   * If not set, elements are treated as if they were outside of arrays.
   */
  readonly arrayElement?: boolean;
}

/** A "context" object passed around while parsing user data. */
export class ParseContext {
  readonly fieldTransforms: FieldTransform[];
  readonly fieldMask: FieldPath[];
  /**
   * Initializes a ParseContext with the given source and path.
   *
   * @param settings The settings for the parser.
   * @param databaseId The database ID of the Firestore instance.
   * @param serializer The serializer to use to generate the Value proto.
   * @param ignoreUndefinedProperties Whether to ignore undefined properties
   * rather than throw.
   * @param fieldTransforms A mutable list of field transforms encountered while
   *     parsing the data.
   * @param fieldMask A mutable list of field paths encountered while parsing
   *     the data.
   *
   * TODO(b/34871131): We don't support array paths right now, so path can be
   * null to indicate the context represents any location within an array (in
   * which case certain features will not work and errors will be somewhat
   * compromised).
   */
  constructor(
    readonly settings: ContextSettings,
    readonly databaseId: DatabaseId,
    readonly serializer: JsonProtoSerializer,
    readonly ignoreUndefinedProperties: boolean,
    fieldTransforms?: FieldTransform[],
    fieldMask?: FieldPath[]
  ) {
    // Minor hack: If fieldTransforms is undefined, we assume this is an
    // external call and we need to validate the entire path.
    if (fieldTransforms === undefined) {
      this.validatePath();
    }
    this.fieldTransforms = fieldTransforms || [];
    this.fieldMask = fieldMask || [];
  }

  get path(): FieldPath | undefined {
    return this.settings.path;
  }

  get dataSource(): UserDataSource {
    return this.settings.dataSource;
  }

  /** Returns a new context with the specified settings overwritten. */
  contextWith(configuration: Partial<ContextSettings>): ParseContext {
    return new ParseContext(
      { ...this.settings, ...configuration },
      this.databaseId,
      this.serializer,
      this.ignoreUndefinedProperties,
      this.fieldTransforms,
      this.fieldMask
    );
  }

  childContextForField(field: string): ParseContext {
    const childPath = this.path?.child(field);
    const context = this.contextWith({ path: childPath, arrayElement: false });
    context.validatePathSegment(field);
    return context;
  }

  childContextForFieldPath(field: FieldPath): ParseContext {
    const childPath = this.path?.child(field);
    const context = this.contextWith({ path: childPath, arrayElement: false });
    context.validatePath();
    return context;
  }

  childContextForArray(index: number): ParseContext {
    // TODO(b/34871131): We don't support array paths right now; so make path
    // undefined.
    return this.contextWith({ path: undefined, arrayElement: true });
  }

  createError(reason: string): Error {
    const fieldDescription =
      !this.path || this.path.isEmpty()
        ? ''
        : ` (found in field ${this.path.toString()})`;
    return new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${this.settings.methodName}() called with invalid data. ` +
        reason +
        fieldDescription
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

  private validatePath(): void {
    // TODO(b/34871131): Remove null check once we have proper paths for fields
    // within arrays.
    if (!this.path) {
      return;
    }
    for (let i = 0; i < this.path.length; i++) {
      this.validatePathSegment(this.path.get(i));
    }
  }

  private validatePathSegment(segment: string): void {
    if (segment.length === 0) {
      throw this.createError('Document fields must not be empty');
    }
    if (isWrite(this.dataSource) && RESERVED_FIELD_REGEX.test(segment)) {
      throw this.createError('Document fields cannot begin and end with "__"');
    }
  }
}

/**
 * Helper for parsing raw user input (provided via the API) into internal model
 * classes.
 */
export class UserDataReader {
  private readonly serializer: JsonProtoSerializer;

  constructor(
    private readonly databaseId: DatabaseId,
    private readonly ignoreUndefinedProperties: boolean,
    serializer?: JsonProtoSerializer
  ) {
    this.serializer =
      serializer || PlatformSupport.getPlatform().newSerializer(databaseId);
  }

  /** Parse document data from a non-merge set() call. */
  parseSetData(methodName: string, input: unknown): ParsedSetData {
    const context = this.createContext(UserDataSource.Set, methodName);
    validatePlainObject('Data must be an object, but it was:', context, input);
    const updateData = parseObject(input, context)!;

    return new ParsedSetData(
      new ObjectValue(updateData),
      /* fieldMask= */ null,
      context.fieldTransforms
    );
  }

  /** Parse document data from a set() call with '{merge:true}'. */
  parseMergeData(
    methodName: string,
    input: unknown,
    fieldPaths?: Array<string | firestore.FieldPath>
  ): ParsedSetData {
    const context = this.createContext(UserDataSource.MergeSet, methodName);
    validatePlainObject('Data must be an object, but it was:', context, input);
    const updateData = parseObject(input, context);

    let fieldMask: FieldMask;
    let fieldTransforms: FieldTransform[];

    if (!fieldPaths) {
      fieldMask = new FieldMask(context.fieldMask);
      fieldTransforms = context.fieldTransforms;
    } else {
      const validatedFieldPaths: FieldPath[] = [];

      for (const stringOrFieldPath of fieldPaths) {
        let fieldPath: FieldPath;

        if (stringOrFieldPath instanceof ExternalFieldPath) {
          fieldPath = stringOrFieldPath._internalPath;
        } else if (typeof stringOrFieldPath === 'string') {
          fieldPath = fieldPathFromDotSeparatedString(
            methodName,
            stringOrFieldPath
          );
        } else {
          throw fail(
            'Expected stringOrFieldPath to be a string or a FieldPath'
          );
        }

        if (!context.contains(fieldPath)) {
          throw new FirestoreError(
            Code.INVALID_ARGUMENT,
            `Field '${fieldPath}' is specified in your field mask but missing from your input data.`
          );
        }

        if (!fieldMaskContains(validatedFieldPaths, fieldPath)) {
          validatedFieldPaths.push(fieldPath);
        }
      }

      fieldMask = new FieldMask(validatedFieldPaths);
      fieldTransforms = context.fieldTransforms.filter(transform =>
        fieldMask.covers(transform.field)
      );
    }
    return new ParsedSetData(
      new ObjectValue(updateData),
      fieldMask,
      fieldTransforms
    );
  }

  /** Parse update data from an update() call. */
  parseUpdateData(methodName: string, input: unknown): ParsedUpdateData {
    const context = this.createContext(UserDataSource.Update, methodName);
    validatePlainObject('Data must be an object, but it was:', context, input);

    const fieldMaskPaths: FieldPath[] = [];
    const updateData = new ObjectValueBuilder();
    forEach(input as Dict<unknown>, (key, value) => {
      const path = fieldPathFromDotSeparatedString(methodName, key);

      const childContext = context.childContextForFieldPath(path);
      if (value instanceof DeleteFieldValueImpl) {
        // Add it to the field mask, but don't add anything to updateData.
        fieldMaskPaths.push(path);
      } else {
        const parsedValue = parseData(value, childContext);
        if (parsedValue != null) {
          fieldMaskPaths.push(path);
          updateData.set(path, parsedValue);
        }
      }
    });

    const mask = new FieldMask(fieldMaskPaths);
    return new ParsedUpdateData(
      updateData.build(),
      mask,
      context.fieldTransforms
    );
  }

  /** Parse update data from a list of field/value arguments. */
  parseUpdateVarargs(
    methodName: string,
    field: string | ExternalFieldPath,
    value: unknown,
    moreFieldsAndValues: unknown[]
  ): ParsedUpdateData {
    const context = this.createContext(UserDataSource.Update, methodName);
    const keys = [fieldPathFromArgument(methodName, field)];
    const values = [value];

    if (moreFieldsAndValues.length % 2 !== 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Function ${methodName}() needs to be called with an even number ` +
          'of arguments that alternate between field names and values.'
      );
    }

    for (let i = 0; i < moreFieldsAndValues.length; i += 2) {
      keys.push(
        fieldPathFromArgument(
          methodName,
          moreFieldsAndValues[i] as string | ExternalFieldPath
        )
      );
      values.push(moreFieldsAndValues[i + 1]);
    }

    const fieldMaskPaths: FieldPath[] = [];
    const updateData = new ObjectValueBuilder();

    // We iterate in reverse order to pick the last value for a field if the
    // user specified the field multiple times.
    for (let i = keys.length - 1; i >= 0; --i) {
      if (!fieldMaskContains(fieldMaskPaths, keys[i])) {
        const path = keys[i];
        const value = values[i];
        const childContext = context.childContextForFieldPath(path);
        if (value instanceof DeleteFieldValueImpl) {
          // Add it to the field mask, but don't add anything to updateData.
          fieldMaskPaths.push(path);
        } else {
          const parsedValue = parseData(value, childContext);
          if (parsedValue != null) {
            fieldMaskPaths.push(path);
            updateData.set(path, parsedValue);
          }
        }
      }
    }

    const mask = new FieldMask(fieldMaskPaths);
    return new ParsedUpdateData(
      updateData.build(),
      mask,
      context.fieldTransforms
    );
  }

  /** Creates a new top-level parse context. */
  private createContext(
    dataSource: UserDataSource,
    methodName: string
  ): ParseContext {
    return new ParseContext(
      {
        dataSource,
        methodName,
        path: FieldPath.EMPTY_PATH,
        arrayElement: false
      },
      this.databaseId,
      this.serializer,
      this.ignoreUndefinedProperties
    );
  }

  /**
   * Parse a "query value" (e.g. value in a where filter or a value in a cursor
   * bound).
   *
   * @param allowArrays Whether the query value is an array that may directly
   * contain additional arrays (e.g. the operand of an `in` query).
   */
  parseQueryValue(
    methodName: string,
    input: unknown,
    allowArrays = false
  ): api.Value {
    const context = this.createContext(
      allowArrays ? UserDataSource.ArrayArgument : UserDataSource.Argument,
      methodName
    );
    const parsed = parseData(input, context);
    debugAssert(parsed != null, 'Parsed data should not be null.');
    debugAssert(
      context.fieldTransforms.length === 0,
      'Field transforms should have been disallowed.'
    );
    return parsed;
  }
}

/**
 * Parses user data to Protobuf Values.
 *
 * @param input Data to be parsed.
 * @param context A context object representing the current path being parsed,
 * the source of the data being parsed, etc.
 * @return The parsed value, or null if the value was a FieldValue sentinel
 * that should not be included in the resulting parsed data.
 */
export function parseData(
  input: unknown,
  context: ParseContext
): api.Value | null {
  if (looksLikeJsonObject(input)) {
    validatePlainObject('Unsupported field value:', context, input);
    return parseObject(input, context);
  } else if (input instanceof FieldValueImpl) {
    // FieldValues usually parse into transforms (except FieldValue.delete())
    // in which case we do not want to include this field in our parsed data
    // (as doing so will overwrite the field directly prior to the transform
    // trying to transform it). So we don't add this location to
    // context.fieldMask and we return null as our parsing result.
    parseSentinelFieldValue(input, context);
    return null;
  } else {
    // If context.path is null we are inside an array and we don't support
    // field mask paths more granular than the top-level array.
    if (context.path) {
      context.fieldMask.push(context.path);
    }

    if (input instanceof Array) {
      // TODO(b/34871131): Include the path containing the array in the error
      // message.
      // In the case of IN queries, the parsed data is an array (representing
      // the set of values to be included for the IN query) that may directly
      // contain additional arrays (each representing an individual field
      // value), so we disable this validation.
      if (
        context.settings.arrayElement &&
        context.dataSource !== UserDataSource.ArrayArgument
      ) {
        throw context.createError('Nested arrays are not supported');
      }
      return parseArray(input as unknown[], context);
    } else {
      return parseScalarValue(input, context);
    }
  }
}

function parseObject(
  obj: Dict<unknown>,
  context: ParseContext
): { mapValue: api.MapValue } {
  const fields: Dict<api.Value> = {};

  if (isEmpty(obj)) {
    // If we encounter an empty object, we explicitly add it to the update
    // mask to ensure that the server creates a map entry.
    if (context.path && context.path.length > 0) {
      context.fieldMask.push(context.path);
    }
  } else {
    forEach(obj, (key: string, val: unknown) => {
      const parsedValue = parseData(val, context.childContextForField(key));
      if (parsedValue != null) {
        fields[key] = parsedValue;
      }
    });
  }

  return { mapValue: { fields } };
}

function parseArray(array: unknown[], context: ParseContext): api.Value {
  const values: api.Value[] = [];
  let entryIndex = 0;
  for (const entry of array) {
    let parsedEntry = parseData(
      entry,
      context.childContextForArray(entryIndex)
    );
    if (parsedEntry == null) {
      // Just include nulls in the array for fields being replaced with a
      // sentinel.
      parsedEntry = { nullValue: 'NULL_VALUE' };
    }
    values.push(parsedEntry);
    entryIndex++;
  }
  return { arrayValue: { values } };
}

/**
 * "Parses" the provided FieldValueImpl, adding any necessary transforms to
 * context.fieldTransforms.
 */
function parseSentinelFieldValue(
  value: FieldValueImpl,
  context: ParseContext
): void {
  // Sentinels are only supported with writes, and not within arrays.
  if (!isWrite(context.dataSource)) {
    throw context.createError(
      `${value._methodName}() can only be used with update() and set()`
    );
  }
  if (context.path === null) {
    throw context.createError(
      `${value._methodName}() is not currently supported inside arrays`
    );
  }

  const fieldTransform = value.toFieldTransform(context);
  if (fieldTransform) {
    context.fieldTransforms.push(fieldTransform);
  }
}

/**
 * Helper to parse a scalar value (i.e. not an Object, Array, or FieldValue)
 *
 * @return The parsed value
 */
function parseScalarValue(
  value: unknown,
  context: ParseContext
): api.Value | null {
  if (value === null) {
    return { nullValue: 'NULL_VALUE' };
  } else if (typeof value === 'number') {
    return context.serializer.toNumber(value);
  } else if (typeof value === 'boolean') {
    return { booleanValue: value };
  } else if (typeof value === 'string') {
    return { stringValue: value };
  } else if (value instanceof Date) {
    const timestamp = Timestamp.fromDate(value);
    return { timestampValue: context.serializer.toTimestamp(timestamp) };
  } else if (value instanceof Timestamp) {
    // Firestore backend truncates precision down to microseconds. To ensure
    // offline mode works the same with regards to truncation, perform the
    // truncation immediately without waiting for the backend to do that.
    const timestamp = new Timestamp(
      value.seconds,
      Math.floor(value.nanoseconds / 1000) * 1000
    );
    return { timestampValue: context.serializer.toTimestamp(timestamp) };
  } else if (value instanceof GeoPoint) {
    return {
      geoPointValue: {
        latitude: value.latitude,
        longitude: value.longitude
      }
    };
  } else if (value instanceof Blob) {
    return { bytesValue: context.serializer.toBytes(value) };
  } else if (value instanceof DocumentKeyReference) {
    const thisDb = context.databaseId;
    const otherDb = value._databaseId;
    if (!otherDb.isEqual(thisDb)) {
      throw context.createError(
        'Document reference is for database ' +
          `${otherDb.projectId}/${otherDb.database} but should be ` +
          `for database ${thisDb.projectId}/${thisDb.database}`
      );
    }
    return {
      referenceValue: context.serializer.toResourceName(
        value._key.path,
        value._databaseId
      )
    };
  } else if (value === undefined && context.ignoreUndefinedProperties) {
    return null;
  } else {
    throw context.createError(
      `Unsupported field value: ${valueDescription(value)}`
    );
  }
}

/**
 * Checks whether an object looks like a JSON object that should be converted
 * into a struct. Normal class/prototype instances are considered to look like
 * JSON objects since they should be converted to a struct value. Arrays, Dates,
 * GeoPoints, etc. are not considered to look like JSON objects since they map
 * to specific FieldValue types other than ObjectValue.
 */
function looksLikeJsonObject(input: unknown): boolean {
  return (
    typeof input === 'object' &&
    input !== null &&
    !(input instanceof Array) &&
    !(input instanceof Date) &&
    !(input instanceof Timestamp) &&
    !(input instanceof GeoPoint) &&
    !(input instanceof Blob) &&
    !(input instanceof DocumentKeyReference) &&
    !(input instanceof FieldValueImpl)
  );
}

function validatePlainObject(
  message: string,
  context: ParseContext,
  input: unknown
): asserts input is Dict<unknown> {
  if (!looksLikeJsonObject(input) || !isPlainObject(input)) {
    const description = valueDescription(input);
    if (description === 'an object') {
      // Massage the error if it was an object.
      throw context.createError(message + ' a custom object');
    } else {
      throw context.createError(message + ' ' + description);
    }
  }
}

/**
 * Helper that calls fromDotSeparatedString() but wraps any error thrown.
 */
export function fieldPathFromArgument(
  methodName: string,
  path: string | ExternalFieldPath
): FieldPath {
  if (path instanceof ExternalFieldPath) {
    return path._internalPath;
  } else if (typeof path === 'string') {
    return fieldPathFromDotSeparatedString(methodName, path);
  } else {
    const message = 'Field path arguments must be of type string or FieldPath.';
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${methodName}() called with invalid data. ${message}`
    );
  }
}

/**
 * Wraps fromDotSeparatedString with an error message about the method that
 * was thrown.
 * @param methodName The publicly visible method name
 * @param path The dot-separated string form of a field path which will be split
 * on dots.
 */
function fieldPathFromDotSeparatedString(
  methodName: string,
  path: string
): FieldPath {
  try {
    return fromDotSeparatedString(path)._internalPath;
  } catch (e) {
    const message = errorMessage(e);
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${methodName}() called with invalid data. ${message}`
    );
  }
}

/**
 * Extracts the message from a caught exception, which should be an Error object
 * though JS doesn't guarantee that.
 */
function errorMessage(error: Error | object): string {
  return error instanceof Error ? error.message : error.toString();
}

/** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */
function fieldMaskContains(haystack: FieldPath[], needle: FieldPath): boolean {
  return haystack.some(v => v.isEqual(needle));
}
