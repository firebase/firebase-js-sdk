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

import {
  DocumentData,
  FieldPath as PublicFieldPath,
  SetOptions
} from '@firebase/firestore-types';
import { Compat, getModularInstance } from '@firebase/util';

import { ParseContext } from '../api/parse_context';
import { DatabaseId } from '../core/database_info';
import { DocumentKey } from '../model/document_key';
import { FieldMask } from '../model/field_mask';
import {
  FieldTransform,
  Mutation,
  PatchMutation,
  Precondition,
  SetMutation
} from '../model/mutation';
import { ObjectValue } from '../model/object_value';
import { FieldPath as InternalFieldPath } from '../model/path';
import {
  ArrayRemoveTransformOperation,
  ArrayUnionTransformOperation,
  NumericIncrementTransformOperation,
  ServerTimestampTransform
} from '../model/transform_operation';
import { newSerializer } from '../platform/serializer';
import {
  MapValue as ProtoMapValue,
  Value as ProtoValue
} from '../protos/firestore_proto_api';
import { toNumber } from '../remote/number_serializer';
import {
  JsonProtoSerializer,
  toBytes,
  toResourceName,
  toTimestamp
} from '../remote/serializer';
import { debugAssert, fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { isPlainObject, valueDescription } from '../util/input_validation';
import { Dict, forEach, isEmpty } from '../util/obj';

import { Bytes } from './bytes';
import { Firestore } from './database';
import { FieldPath } from './field_path';
import { FieldValue } from './field_value';
import { GeoPoint } from './geo_point';
import {
  DocumentReference,
  PartialWithFieldValue,
  WithFieldValue
} from './reference';
import { Timestamp } from './timestamp';

const RESERVED_FIELD_REGEX = /^__.*__$/;

/**
 * An untyped Firestore Data Converter interface that is shared between the
 * lite, firestore-exp and classic SDK.
 */
export interface UntypedFirestoreDataConverter<
  AppModelType,
  DbModelType extends DocumentData = DocumentData
> {
  toFirestore(
    modelObject: WithFieldValue<AppModelType>
  ): WithFieldValue<DbModelType>;
  toFirestore(
    modelObject: PartialWithFieldValue<AppModelType>,
    options: SetOptions
  ): PartialWithFieldValue<DbModelType>;
  fromFirestore(snapshot: unknown, options?: unknown): AppModelType;
}

/** The result of parsing document data (e.g. for a setData call). */
export class ParsedSetData {
  constructor(
    readonly data: ObjectValue,
    readonly fieldMask: FieldMask | null,
    readonly fieldTransforms: FieldTransform[]
  ) {}

  toMutation(key: DocumentKey, precondition: Precondition): Mutation {
    if (this.fieldMask !== null) {
      return new PatchMutation(
        key,
        this.data,
        this.fieldMask,
        precondition,
        this.fieldTransforms
      );
    } else {
      return new SetMutation(
        key,
        this.data,
        precondition,
        this.fieldTransforms
      );
    }
  }
}

/** The result of parsing "update" data (i.e. for an updateData call). */
export class ParsedUpdateData {
  constructor(
    readonly data: ObjectValue,
    // The fieldMask does not include document transforms.
    readonly fieldMask: FieldMask,
    readonly fieldTransforms: FieldTransform[]
  ) {}

  toMutation(key: DocumentKey, precondition: Precondition): Mutation {
    return new PatchMutation(
      key,
      this.data,
      this.fieldMask,
      precondition,
      this.fieldTransforms
    );
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
  /** The document the user is attempting to modify, if that applies. */
  readonly targetDoc?: DocumentKey;
  /**
   * A path within the object being parsed. This could be an empty path (in
   * which case the context represents the root of the data being parsed), or a
   * nonempty path (indicating the context represents a nested location within
   * the data).
   */
  readonly path?: InternalFieldPath;
  /**
   * Whether or not this context corresponds to an element of an array.
   * If not set, elements are treated as if they were outside of arrays.
   */
  readonly arrayElement?: boolean;
  /**
   * Whether or not a converter was specified in this context. If true, error
   * messages will reference the converter when invalid data is provided.
   */
  readonly hasConverter?: boolean;
}

/** A "context" object passed around while parsing user data. */
class ParseContextImpl implements ParseContext {
  readonly fieldTransforms: FieldTransform[];
  readonly fieldMask: InternalFieldPath[];
  /**
   * Initializes a ParseContext with the given source and path.
   *
   * @param settings - The settings for the parser.
   * @param databaseId - The database ID of the Firestore instance.
   * @param serializer - The serializer to use to generate the Value proto.
   * @param ignoreUndefinedProperties - Whether to ignore undefined properties
   * rather than throw.
   * @param fieldTransforms - A mutable list of field transforms encountered
   * while parsing the data.
   * @param fieldMask - A mutable list of field paths encountered while parsing
   * the data.
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
    fieldMask?: InternalFieldPath[]
  ) {
    // Minor hack: If fieldTransforms is undefined, we assume this is an
    // external call and we need to validate the entire path.
    if (fieldTransforms === undefined) {
      this.validatePath();
    }
    this.fieldTransforms = fieldTransforms || [];
    this.fieldMask = fieldMask || [];
  }

  get path(): InternalFieldPath | undefined {
    return this.settings.path;
  }

  get dataSource(): UserDataSource {
    return this.settings.dataSource;
  }

  /** Returns a new context with the specified settings overwritten. */
  contextWith(configuration: Partial<ContextSettings>): ParseContextImpl {
    return new ParseContextImpl(
      { ...this.settings, ...configuration },
      this.databaseId,
      this.serializer,
      this.ignoreUndefinedProperties,
      this.fieldTransforms,
      this.fieldMask
    );
  }

  childContextForField(field: string): ParseContextImpl {
    const childPath = this.path?.child(field);
    const context = this.contextWith({ path: childPath, arrayElement: false });
    context.validatePathSegment(field);
    return context;
  }

  childContextForFieldPath(field: InternalFieldPath): ParseContextImpl {
    const childPath = this.path?.child(field);
    const context = this.contextWith({ path: childPath, arrayElement: false });
    context.validatePath();
    return context;
  }

  childContextForArray(index: number): ParseContextImpl {
    // TODO(b/34871131): We don't support array paths right now; so make path
    // undefined.
    return this.contextWith({ path: undefined, arrayElement: true });
  }

  createError(reason: string): FirestoreError {
    return createError(
      reason,
      this.settings.methodName,
      this.settings.hasConverter || false,
      this.path,
      this.settings.targetDoc
    );
  }

  /** Returns 'true' if 'fieldPath' was traversed when creating this context. */
  contains(fieldPath: InternalFieldPath): boolean {
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
    this.serializer = serializer || newSerializer(databaseId);
  }

  /** Creates a new top-level parse context. */
  createContext(
    dataSource: UserDataSource,
    methodName: string,
    targetDoc?: DocumentKey,
    hasConverter = false
  ): ParseContextImpl {
    return new ParseContextImpl(
      {
        dataSource,
        methodName,
        targetDoc,
        path: InternalFieldPath.emptyPath(),
        arrayElement: false,
        hasConverter
      },
      this.databaseId,
      this.serializer,
      this.ignoreUndefinedProperties
    );
  }
}

export function newUserDataReader(firestore: Firestore): UserDataReader {
  const settings = firestore._freezeSettings();
  const serializer = newSerializer(firestore._databaseId);
  return new UserDataReader(
    firestore._databaseId,
    !!settings.ignoreUndefinedProperties,
    serializer
  );
}

/** Parse document data from a set() call. */
export function parseSetData(
  userDataReader: UserDataReader,
  methodName: string,
  targetDoc: DocumentKey,
  input: unknown,
  hasConverter: boolean,
  options: SetOptions = {}
): ParsedSetData {
  const context = userDataReader.createContext(
    options.merge || options.mergeFields
      ? UserDataSource.MergeSet
      : UserDataSource.Set,
    methodName,
    targetDoc,
    hasConverter
  );
  validatePlainObject('Data must be an object, but it was:', context, input);
  const updateData = parseObject(input, context)!;

  let fieldMask: FieldMask | null;
  let fieldTransforms: FieldTransform[];

  if (options.merge) {
    fieldMask = new FieldMask(context.fieldMask);
    fieldTransforms = context.fieldTransforms;
  } else if (options.mergeFields) {
    const validatedFieldPaths: InternalFieldPath[] = [];

    for (const stringOrFieldPath of options.mergeFields) {
      const fieldPath = fieldPathFromArgument(
        methodName,
        stringOrFieldPath,
        targetDoc
      );
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
      fieldMask!.covers(transform.field)
    );
  } else {
    fieldMask = null;
    fieldTransforms = context.fieldTransforms;
  }

  return new ParsedSetData(
    new ObjectValue(updateData),
    fieldMask,
    fieldTransforms
  );
}

export class DeleteFieldValueImpl extends FieldValue {
  _toFieldTransform(context: ParseContextImpl): null {
    if (context.dataSource === UserDataSource.MergeSet) {
      // No transform to add for a delete, but we need to add it to our
      // fieldMask so it gets deleted.
      context.fieldMask.push(context.path!);
    } else if (context.dataSource === UserDataSource.Update) {
      debugAssert(
        context.path!.length > 0,
        `${this._methodName}() at the top level should have already ` +
          'been handled.'
      );
      throw context.createError(
        `${this._methodName}() can only appear at the top level ` +
          'of your update data'
      );
    } else {
      // We shouldn't encounter delete sentinels for queries or non-merge set() calls.
      throw context.createError(
        `${this._methodName}() cannot be used with set() unless you pass ` +
          '{merge:true}'
      );
    }
    return null;
  }

  isEqual(other: FieldValue): boolean {
    return other instanceof DeleteFieldValueImpl;
  }
}

/**
 * Creates a child context for parsing SerializableFieldValues.
 *
 * This is different than calling `ParseContext.contextWith` because it keeps
 * the fieldTransforms and fieldMask separate.
 *
 * The created context has its `dataSource` set to `UserDataSource.Argument`.
 * Although these values are used with writes, any elements in these FieldValues
 * are not considered writes since they cannot contain any FieldValue sentinels,
 * etc.
 *
 * @param fieldValue - The sentinel FieldValue for which to create a child
 *     context.
 * @param context - The parent context.
 * @param arrayElement - Whether or not the FieldValue has an array.
 */
function createSentinelChildContext(
  fieldValue: FieldValue,
  context: ParseContextImpl,
  arrayElement: boolean
): ParseContextImpl {
  return new ParseContextImpl(
    {
      dataSource: UserDataSource.Argument,
      targetDoc: context.settings.targetDoc,
      methodName: fieldValue._methodName,
      arrayElement
    },
    context.databaseId,
    context.serializer,
    context.ignoreUndefinedProperties
  );
}

export class ServerTimestampFieldValueImpl extends FieldValue {
  _toFieldTransform(context: ParseContextImpl): FieldTransform {
    return new FieldTransform(context.path!, new ServerTimestampTransform());
  }

  isEqual(other: FieldValue): boolean {
    return other instanceof ServerTimestampFieldValueImpl;
  }
}

export class ArrayUnionFieldValueImpl extends FieldValue {
  constructor(methodName: string, private readonly _elements: unknown[]) {
    super(methodName);
  }

  _toFieldTransform(context: ParseContextImpl): FieldTransform {
    const parseContext = createSentinelChildContext(
      this,
      context,
      /*array=*/ true
    );
    const parsedElements = this._elements.map(
      element => parseData(element, parseContext)!
    );
    const arrayUnion = new ArrayUnionTransformOperation(parsedElements);
    return new FieldTransform(context.path!, arrayUnion);
  }

  isEqual(other: FieldValue): boolean {
    // TODO(mrschmidt): Implement isEquals
    return this === other;
  }
}

export class ArrayRemoveFieldValueImpl extends FieldValue {
  constructor(methodName: string, readonly _elements: unknown[]) {
    super(methodName);
  }

  _toFieldTransform(context: ParseContextImpl): FieldTransform {
    const parseContext = createSentinelChildContext(
      this,
      context,
      /*array=*/ true
    );
    const parsedElements = this._elements.map(
      element => parseData(element, parseContext)!
    );
    const arrayUnion = new ArrayRemoveTransformOperation(parsedElements);
    return new FieldTransform(context.path!, arrayUnion);
  }

  isEqual(other: FieldValue): boolean {
    // TODO(mrschmidt): Implement isEquals
    return this === other;
  }
}

export class NumericIncrementFieldValueImpl extends FieldValue {
  constructor(methodName: string, private readonly _operand: number) {
    super(methodName);
  }

  _toFieldTransform(context: ParseContextImpl): FieldTransform {
    const numericIncrement = new NumericIncrementTransformOperation(
      context.serializer,
      toNumber(context.serializer, this._operand)
    );
    return new FieldTransform(context.path!, numericIncrement);
  }

  isEqual(other: FieldValue): boolean {
    // TODO(mrschmidt): Implement isEquals
    return this === other;
  }
}

/** Parse update data from an update() call. */
export function parseUpdateData(
  userDataReader: UserDataReader,
  methodName: string,
  targetDoc: DocumentKey,
  input: unknown
): ParsedUpdateData {
  const context = userDataReader.createContext(
    UserDataSource.Update,
    methodName,
    targetDoc
  );
  validatePlainObject('Data must be an object, but it was:', context, input);

  const fieldMaskPaths: InternalFieldPath[] = [];
  const updateData = ObjectValue.empty();
  forEach(input as Dict<unknown>, (key, value) => {
    const path = fieldPathFromDotSeparatedString(methodName, key, targetDoc);

    // For Compat types, we have to "extract" the underlying types before
    // performing validation.
    value = getModularInstance(value);

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
  return new ParsedUpdateData(updateData, mask, context.fieldTransforms);
}

/** Parse update data from a list of field/value arguments. */
export function parseUpdateVarargs(
  userDataReader: UserDataReader,
  methodName: string,
  targetDoc: DocumentKey,
  field: string | PublicFieldPath | Compat<PublicFieldPath>,
  value: unknown,
  moreFieldsAndValues: unknown[]
): ParsedUpdateData {
  const context = userDataReader.createContext(
    UserDataSource.Update,
    methodName,
    targetDoc
  );
  const keys = [fieldPathFromArgument(methodName, field, targetDoc)];
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
        moreFieldsAndValues[i] as string | PublicFieldPath
      )
    );
    values.push(moreFieldsAndValues[i + 1]);
  }

  const fieldMaskPaths: InternalFieldPath[] = [];
  const updateData = ObjectValue.empty();

  // We iterate in reverse order to pick the last value for a field if the
  // user specified the field multiple times.
  for (let i = keys.length - 1; i >= 0; --i) {
    if (!fieldMaskContains(fieldMaskPaths, keys[i])) {
      const path = keys[i];
      let value = values[i];

      // For Compat types, we have to "extract" the underlying types before
      // performing validation.
      value = getModularInstance(value);

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
  return new ParsedUpdateData(updateData, mask, context.fieldTransforms);
}

/**
 * Parse a "query value" (e.g. value in a where filter or a value in a cursor
 * bound).
 *
 * @param allowArrays - Whether the query value is an array that may directly
 * contain additional arrays (e.g. the operand of an `in` query).
 */
export function parseQueryValue(
  userDataReader: UserDataReader,
  methodName: string,
  input: unknown,
  allowArrays = false
): ProtoValue {
  const context = userDataReader.createContext(
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

/**
 * Parses user data to Protobuf Values.
 *
 * @param input - Data to be parsed.
 * @param context - A context object representing the current path being parsed,
 * the source of the data being parsed, etc.
 * @returns The parsed value, or null if the value was a FieldValue sentinel
 * that should not be included in the resulting parsed data.
 */
export function parseData(
  input: unknown,
  context: ParseContextImpl
): ProtoValue | null {
  // Unwrap the API type from the Compat SDK. This will return the API type
  // from firestore-exp.
  input = getModularInstance(input);

  if (looksLikeJsonObject(input)) {
    validatePlainObject('Unsupported field value:', context, input);
    return parseObject(input, context);
  } else if (input instanceof FieldValue) {
    // FieldValues usually parse into transforms (except deleteField())
    // in which case we do not want to include this field in our parsed data
    // (as doing so will overwrite the field directly prior to the transform
    // trying to transform it). So we don't add this location to
    // context.fieldMask and we return null as our parsing result.
    parseSentinelFieldValue(input, context);
    return null;
  } else if (input === undefined && context.ignoreUndefinedProperties) {
    // If the input is undefined it can never participate in the fieldMask, so
    // don't handle this below. If `ignoreUndefinedProperties` is false,
    // `parseScalarValue` will reject an undefined value.
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
  context: ParseContextImpl
): { mapValue: ProtoMapValue } {
  const fields: Dict<ProtoValue> = {};

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

function parseArray(array: unknown[], context: ParseContextImpl): ProtoValue {
  const values: ProtoValue[] = [];
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
  value: FieldValue,
  context: ParseContextImpl
): void {
  // Sentinels are only supported with writes, and not within arrays.
  if (!isWrite(context.dataSource)) {
    throw context.createError(
      `${value._methodName}() can only be used with update() and set()`
    );
  }
  if (!context.path) {
    throw context.createError(
      `${value._methodName}() is not currently supported inside arrays`
    );
  }

  const fieldTransform = value._toFieldTransform(context);
  if (fieldTransform) {
    context.fieldTransforms.push(fieldTransform);
  }
}

/**
 * Helper to parse a scalar value (i.e. not an Object, Array, or FieldValue)
 *
 * @returns The parsed value
 */
function parseScalarValue(
  value: unknown,
  context: ParseContextImpl
): ProtoValue | null {
  value = getModularInstance(value);

  if (value === null) {
    return { nullValue: 'NULL_VALUE' };
  } else if (typeof value === 'number') {
    return toNumber(context.serializer, value);
  } else if (typeof value === 'boolean') {
    return { booleanValue: value };
  } else if (typeof value === 'string') {
    return { stringValue: value };
  } else if (value instanceof Date) {
    const timestamp = Timestamp.fromDate(value);
    return {
      timestampValue: toTimestamp(context.serializer, timestamp)
    };
  } else if (value instanceof Timestamp) {
    // Firestore backend truncates precision down to microseconds. To ensure
    // offline mode works the same with regards to truncation, perform the
    // truncation immediately without waiting for the backend to do that.
    const timestamp = new Timestamp(
      value.seconds,
      Math.floor(value.nanoseconds / 1000) * 1000
    );
    return {
      timestampValue: toTimestamp(context.serializer, timestamp)
    };
  } else if (value instanceof GeoPoint) {
    return {
      geoPointValue: {
        latitude: value.latitude,
        longitude: value.longitude
      }
    };
  } else if (value instanceof Bytes) {
    return { bytesValue: toBytes(context.serializer, value._byteString) };
  } else if (value instanceof DocumentReference) {
    const thisDb = context.databaseId;
    const otherDb = value.firestore._databaseId;
    if (!otherDb.isEqual(thisDb)) {
      throw context.createError(
        'Document reference is for database ' +
          `${otherDb.projectId}/${otherDb.database} but should be ` +
          `for database ${thisDb.projectId}/${thisDb.database}`
      );
    }
    return {
      referenceValue: toResourceName(
        value.firestore._databaseId || context.databaseId,
        value._key.path
      )
    };
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
    !(input instanceof Bytes) &&
    !(input instanceof DocumentReference) &&
    !(input instanceof FieldValue)
  );
}

function validatePlainObject(
  message: string,
  context: ParseContextImpl,
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
  path: string | PublicFieldPath | Compat<PublicFieldPath>,
  targetDoc?: DocumentKey
): InternalFieldPath {
  // If required, replace the FieldPath Compat class with with the firestore-exp
  // FieldPath.
  path = getModularInstance(path);

  if (path instanceof FieldPath) {
    return path._internalPath;
  } else if (typeof path === 'string') {
    return fieldPathFromDotSeparatedString(methodName, path);
  } else {
    const message = 'Field path arguments must be of type string or ';
    throw createError(
      message,
      methodName,
      /* hasConverter= */ false,
      /* path= */ undefined,
      targetDoc
    );
  }
}

/**
 * Matches any characters in a field path string that are reserved.
 */
const FIELD_PATH_RESERVED = new RegExp('[~\\*/\\[\\]]');

/**
 * Wraps fromDotSeparatedString with an error message about the method that
 * was thrown.
 * @param methodName - The publicly visible method name
 * @param path - The dot-separated string form of a field path which will be
 * split on dots.
 * @param targetDoc - The document against which the field path will be
 * evaluated.
 */
export function fieldPathFromDotSeparatedString(
  methodName: string,
  path: string,
  targetDoc?: DocumentKey
): InternalFieldPath {
  const found = path.search(FIELD_PATH_RESERVED);
  if (found >= 0) {
    throw createError(
      `Invalid field path (${path}). Paths must not contain ` +
        `'~', '*', '/', '[', or ']'`,
      methodName,
      /* hasConverter= */ false,
      /* path= */ undefined,
      targetDoc
    );
  }

  try {
    return new FieldPath(...path.split('.'))._internalPath;
  } catch (e) {
    throw createError(
      `Invalid field path (${path}). Paths must not be empty, ` +
        `begin with '.', end with '.', or contain '..'`,
      methodName,
      /* hasConverter= */ false,
      /* path= */ undefined,
      targetDoc
    );
  }
}

function createError(
  reason: string,
  methodName: string,
  hasConverter: boolean,
  path?: InternalFieldPath,
  targetDoc?: DocumentKey
): FirestoreError {
  const hasPath = path && !path.isEmpty();
  const hasDocument = targetDoc !== undefined;
  let message = `Function ${methodName}() called with invalid data`;
  if (hasConverter) {
    message += ' (via `toFirestore()`)';
  }
  message += '. ';

  let description = '';
  if (hasPath || hasDocument) {
    description += ' (found';

    if (hasPath) {
      description += ` in field ${path}`;
    }
    if (hasDocument) {
      description += ` in document ${targetDoc}`;
    }
    description += ')';
  }

  return new FirestoreError(
    Code.INVALID_ARGUMENT,
    message + reason + description
  );
}

/** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */
function fieldMaskContains(
  haystack: InternalFieldPath[],
  needle: InternalFieldPath
): boolean {
  return haystack.some(v => v.isEqual(needle));
}
