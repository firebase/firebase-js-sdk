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

import { ParseContext } from '../api/parse_context';
import { OptionsUtil } from '../core/options_util';
import {
  ApiClientObjectMap,
  firestoreV1ApiClientInterfaces,
  Stage as ProtoStage
} from '../protos/firestore_proto_api';
import { toNumber } from '../remote/number_serializer';
import {
  JsonProtoSerializer,
  ProtoSerializable,
  toMapValue,
  toPipelineValue,
  toStringValue
} from '../remote/serializer';
import { hardAssert } from '../util/assert';
import { Code, FirestoreError } from '../util/error';

import {
  AggregateFunction,
  AliasedExpression,
  BooleanExpression,
  constant,
  _constant,
  Expression,
  Field,
  field,
  isExpr,
  Ordering
} from './expressions';
import { Pipeline } from './pipeline';
import { CollectionReference } from './reference';
import {
  InsertStageOptions,
  LiteralsStageOptions,
  QueryEnhancement,
  StageOptions,
  UpsertStageOptions
} from './stage_options';
import { isUserData, UserData } from './user_data_reader';
import { selectablesToMap } from '../util/pipeline_util';
import { isPlainObject } from '../util/input_validation';

export abstract class Stage implements ProtoSerializable<ProtoStage>, UserData {
  /**
   * Store _optionsProto parsed by _readUserData.
   * @private
   * @internal
   * @protected
   */
  protected optionsProto:
    ApiClientObjectMap<firestoreV1ApiClientInterfaces.Value> | undefined =
    undefined;
  protected knownOptions: Record<string, unknown>;
  protected rawOptions?: Record<string, unknown>;

  constructor(options: Record<string, unknown> & StageOptions) {
    ({ rawOptions: this.rawOptions, ...this.knownOptions } = options);
  }

  _readUserData(context: ParseContext): void {
    this.optionsProto = this._optionsUtil.getOptionsProto(
      context,
      this.knownOptions,
      this.rawOptions
    );
  }

  _toProto(_: JsonProtoSerializer): ProtoStage {
    return {
      name: this._name,
      options: this.optionsProto
    };
  }

  abstract get _optionsUtil(): OptionsUtil;
  abstract get _name(): string;
}

export class AddFields extends Stage {
  get _name(): string {
    return 'add_fields';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    public readonly fields: Map<string, Expression>,
    options: StageOptions
  ) {
    super(options);
  }

  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [toMapValue(serializer, this.fields)]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    readUserDataHelper(this.fields, context);
  }
}

export class RemoveFields extends Stage {
  get _name(): string {
    return 'remove_fields';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    private fields: Field[],
    options: StageOptions
  ) {
    super(options);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: this.fields.map(f => f._toProto(serializer))
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    readUserDataHelper(this.fields, context);
  }
}

/**
 * @public
 */
export class Define extends Stage {
  get _name(): string {
    return 'let';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    private aliasedExpressions: Map<string, Expression>,
    options: StageOptions
  ) {
    super(options);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [toMapValue(serializer, this.aliasedExpressions)]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    readUserDataHelper(this.aliasedExpressions, context);
  }
}

export class Aggregate extends Stage {
  get _name(): string {
    return 'aggregate';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    public readonly groups: Map<string, Expression>,
    public readonly accumulators: Map<string, AggregateFunction>,
    options: StageOptions
  ) {
    super(options);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [
        toMapValue(serializer, this.accumulators),
        toMapValue(serializer, this.groups)
      ]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    readUserDataHelper(this.groups, context);
    readUserDataHelper(this.accumulators, context);
  }
}

export class Distinct extends Stage {
  get _name(): string {
    return 'distinct';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    public readonly groups: Map<string, Expression>,
    options: StageOptions
  ) {
    super(options);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [toMapValue(serializer, this.groups)]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    readUserDataHelper(this.groups, context);
  }
}

export class CollectionSource extends Stage {
  get _name(): string {
    return 'collection';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({
      forceIndex: {
        serverName: 'force_index'
      }
    });
  }

  readonly formattedCollectionPath: string;

  constructor(collection: string, options: StageOptions) {
    super(options);

    // prepend slash to collection string
    this.formattedCollectionPath = collection.startsWith('/')
      ? collection
      : '/' + collection;
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [{ referenceValue: this.formattedCollectionPath }]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
  }
}

export class CollectionGroupSource extends Stage {
  get _name(): string {
    return 'collection_group';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({
      forceIndex: {
        serverName: 'force_index'
      }
    });
  }

  constructor(
    public readonly collectionId: string,
    options: StageOptions
  ) {
    super(options);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [{ referenceValue: '' }, { stringValue: this.collectionId }]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
  }
}

export class SubcollectionSource extends Stage {
  get _name(): string {
    return 'subcollection';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    private path: string,
    options: StageOptions
  ) {
    super(options);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [{ stringValue: this.path }]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
  }
}

export class DatabaseSource extends Stage {
  get _name(): string {
    return 'database';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer)
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
  }
}

export class DocumentsSource extends Stage {
  get _name(): string {
    return 'documents';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  readonly formattedPaths: string[];
  readonly formattedPathsSet: Set<string>;

  constructor(docPaths: string[], options: StageOptions) {
    super(options);
    if (!docPaths || docPaths.length === 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Empty document paths are not allowed in DocumentsSource'
      );
    }
    const paths = docPaths.map(path =>
      path.startsWith('/') ? path : '/' + path
    );
    const uniqueDocPaths = new Set(paths);
    if (uniqueDocPaths.size !== paths.length) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Duplicate document paths are not allowed in DocumentsSource'
      );
    }
    this.formattedPaths = paths;
    this.formattedPathsSet = uniqueDocPaths;
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: this.formattedPaths.map(p => {
        return { referenceValue: p };
      })
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
  }
}

export class LiteralsSource extends Stage {
  get _name(): string {
    return 'literals';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  private parseContext?: ParseContext;

  constructor(
    readonly documents: Array<Record<string, unknown>>,
    options: LiteralsStageOptions = {}
  ) {
    super(options);
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    this.parseContext = context;
    readUserDataInLiteralMaps(this.documents, context);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    const ctx = this.parseContext;
    const args = this.documents.map(doc =>
      encodeLiteralMap(doc, serializer, ctx)
    );
    return {
      ...super._toProto(serializer),
      args
    };
  }
}

function readUserDataInLiteralMaps(val: unknown, context: ParseContext): void {
  if (isExpr(val)) {
    (val as Expression)._readUserData(context);
  } else if (Array.isArray(val)) {
    val.forEach(item => readUserDataInLiteralMaps(item, context));
  } else if (isPlainObject(val)) {
    for (const k of Object.keys(val as Record<string, unknown>)) {
      readUserDataInLiteralMaps((val as Record<string, unknown>)[k], context);
    }
  }
}

function encodeLiteralMap(
  map: Record<string, unknown>,
  serializer: JsonProtoSerializer,
  context?: ParseContext
): ProtoValue {
  const fields: ApiClientObjectMap<ProtoValue> = {};
  for (const key of Object.keys(map)) {
    const val = map[key];
    if (isExpr(val)) {
      fields[key] = (val as Expression)._toProto(serializer);
    } else if (isPlainObject(val)) {
      fields[key] = encodeLiteralMap(
        val as Record<string, unknown>,
        serializer,
        context
      );
    } else {
      const expr = _constant(val, 'literals');
      if (context) {
        expr._readUserData(context);
      }
      fields[key] = expr._toProto(serializer);
    }
  }
  return {
    mapValue: { fields }
  };
}

export class Where extends Stage {
  get _name(): string {
    return 'where';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    public readonly condition: BooleanExpression,
    options: StageOptions
  ) {
    super(options);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [this.condition._toProto(serializer)]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    readUserDataHelper(this.condition, context);
  }
}

export class FindNearest extends Stage {
  get _name(): string {
    return 'find_nearest';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({
      limit: {
        serverName: 'limit'
      },
      distanceField: {
        serverName: 'distance_field'
      }
    });
  }

  constructor(
    private vectorValue: Expression,
    private field: Field,
    private distanceMeasure: 'euclidean' | 'cosine' | 'dot_product',
    options: StageOptions
  ) {
    super(options);
  }

  /**
   * @private
   * @internal
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [
        this.field._toProto(serializer),
        this.vectorValue._toProto(serializer),
        toStringValue(this.distanceMeasure)
      ]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    readUserDataHelper(this.vectorValue, context);
    readUserDataHelper(this.field, context);
  }
}

export class Limit extends Stage {
  get _name(): string {
    return 'limit';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    public readonly limit: number,
    options: StageOptions
  ) {
    hardAssert(
      !isNaN(limit) && limit !== Infinity && limit !== -Infinity,
      0x882c,
      'Invalid limit value'
    );
    super(options);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [toNumber(serializer, this.limit)]
    };
  }
}

export class Offset extends Stage {
  get _name(): string {
    return 'offset';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    public readonly offset: number,
    options: StageOptions
  ) {
    super(options);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [toNumber(serializer, this.offset)]
    };
  }
}

export class Select extends Stage {
  get _name(): string {
    return 'select';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    private selections: Map<string, Expression>,
    options: StageOptions
  ) {
    super(options);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [toMapValue(serializer, this.selections)]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    readUserDataHelper(this.selections, context);
  }
}

export class Sort extends Stage {
  get _name(): string {
    return 'sort';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    public readonly orderings: Ordering[],
    options: StageOptions
  ) {
    super(options);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: this.orderings.map(o => o._toProto(serializer))
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    readUserDataHelper(this.orderings, context);
  }
}

export class Sample extends Stage {
  get _name(): string {
    return 'sample';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    private rate: number,
    private mode: 'percent' | 'documents',
    options: StageOptions
  ) {
    super(options);
  }

  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [toNumber(serializer, this.rate)!, toStringValue(this.mode)!]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
  }
}

export class Union extends Stage {
  get _name(): string {
    return 'union';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    private other: Pipeline,
    options: StageOptions
  ) {
    super(options);
  }

  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [toPipelineValue(this.other._toProto(serializer))]
    };
  }

  _readUserData(context: ParseContext): void {
    this.other._readUserData(context);
    super._readUserData(context);
  }
}

export class Unnest extends Stage {
  get _name(): string {
    return 'unnest';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({
      indexField: {
        serverName: 'index_field'
      }
    });
  }

  constructor(
    private alias: string,
    private expr: Expression,
    options: StageOptions
  ) {
    super(options);
  }

  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [
        this.expr._toProto(serializer),
        field(this.alias)._toProto(serializer)
      ]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    readUserDataHelper(this.expr, context);
  }
}

export class Replace extends Stage {
  static readonly MODE = 'full_replace';

  get _name(): string {
    return 'replace_with';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    private map: Expression,
    options: StageOptions
  ) {
    super(options);
  }

  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [this.map._toProto(serializer), toStringValue(Replace.MODE)]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    readUserDataHelper(this.map, context);
  }
}

// eslint-disable-next-line -- eslint should not convert this type to an interface
type InternalSearchOptions = {
  // These are constrained from the public type
  query: BooleanExpression;
  sort?: Ordering[];
  select?: Record<string, Expression>;
  addFields?: Record<string, Expression>;

  // These are the same as the public type
  languageCode?: string;
  retrievalDepth?: number;
  offset?: number;
  limit?: number;
  queryEnhancement?: QueryEnhancement;
};

/**
 * @beta
 */
export class Search extends Stage {
  constructor(private _searchOptions: InternalSearchOptions) {
    super(_searchOptions);
  }

  get _name(): string {
    return 'search';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({
      query: {
        serverName: 'query'
      },
      limit: {
        serverName: 'limit'
      },
      retrievalDepth: {
        serverName: 'retrieval_depth'
      },
      sort: {
        serverName: 'sort'
      },
      addFields: {
        serverName: 'add_fields'
      },
      select: {
        serverName: 'select'
      },
      offset: {
        serverName: 'offset'
      },
      queryEnhancement: {
        serverName: 'query_enhancement'
      },
      languageCode: {
        serverName: 'language_code'
      }
    });
  }

  /**
   * @private
   * @internal
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: []
    };
  }

  _readUserData(context: ParseContext): void {
    readUserDataHelper(this._searchOptions.query, context);
    if (this._searchOptions.addFields) {
      readUserDataHelper(this._searchOptions.addFields, context);
    }
    if (this._searchOptions.select) {
      readUserDataHelper(this._searchOptions.select, context);
    }
    if (this._searchOptions.sort) {
      readUserDataHelper(this._searchOptions.sort, context);
    }

    super._readUserData(context);
  }
}

/**
 * @beta
 */
export class RawStage extends Stage {
  /**
   * @private
   * @internal
   */
  constructor(
    private name: string,
    private params: Array<AggregateFunction | Expression>,
    rawOptions: Record<string, unknown>
  ) {
    super({ rawOptions });
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      name: this.name,
      args: this.params.map(o => o._toProto(serializer)),
      options: this.optionsProto
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    readUserDataHelper(this.params, context);
  }

  get _name(): string {
    return this.name;
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }
}

/**
 * @beta
 */
export class Delete extends Stage {
  get _name(): string {
    return 'delete';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(options: StageOptions = {}) {
    super(options);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: []
    };
  }
}

/**
 * @beta
 */
export class Update extends Stage {
  get _name(): string {
    return 'update';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    private transformedFields?: Map<string, Expression>,
    options: StageOptions = {}
  ) {
    super(options);
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    const args = [];
    if (this.transformedFields && this.transformedFields.size > 0) {
      args.push(toMapValue(serializer, this.transformedFields));
    } else {
      args.push(toMapValue(serializer, new Map()));
    }
    return {
      ...super._toProto(serializer),
      args
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    if (this.transformedFields) {
      readUserDataHelper(this.transformedFields, context);
    }
  }
}

/**
 * @beta
 */
export class Insert extends Stage {
  get _name(): string {
    return 'insert';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  private readonly collectionPath?: string;
  private readonly documentIdExpr?: Expression;

  constructor(options: InsertStageOptions = {}) {
    const { collection, documentId, ...rest } = options;
    super(rest);
    if (collection) {
      this.collectionPath = typeof collection === 'string' ? collection : collection.path;
      if (!this.collectionPath.startsWith('/')) {
        this.collectionPath = '/' + this.collectionPath;
      }
    }
    if (documentId) {
      this.documentIdExpr = typeof documentId === 'string' ? field(documentId) : documentId;
    }
  }

  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    const proto = super._toProto(serializer);
    const options = proto.options ? { ...proto.options } : {};

    if (this.collectionPath) {
      options['collection'] = { referenceValue: this.collectionPath };
    }
    if (this.documentIdExpr) {
      options['document_id'] = this.documentIdExpr._toProto(serializer);
    }

    return {
      ...proto,
      options: Object.keys(options).length > 0 ? options : undefined,
      args: []
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    if (this.documentIdExpr) {
      readUserDataHelper(this.documentIdExpr, context);
    }
  }
}

/**
 * @beta
 */
export class Upsert extends Stage {
  get _name(): string {
    return 'upsert';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  private readonly collectionPath?: string;
  private readonly documentIdExpr?: Expression;
  private readonly transforms: Map<string, Expression>;

  constructor(
    transforms: AliasedExpression[],
    options: Omit<UpsertStageOptions, 'transforms'> = {}
  ) {
    const { collection, documentId, ...rest } = options;
    super(rest);
    this.transforms = selectablesToMap(transforms);
    if (collection) {
      this.collectionPath = typeof collection === 'string' ? collection : collection.path;
      if (!this.collectionPath.startsWith('/')) {
        this.collectionPath = '/' + this.collectionPath;
      }
    }
    if (documentId) {
      this.documentIdExpr = typeof documentId === 'string' ? field(documentId) : documentId;
    }
  }

  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    const proto = super._toProto(serializer);
    const options = proto.options ? { ...proto.options } : {};

    if (this.collectionPath) {
      options['collection'] = { referenceValue: this.collectionPath };
    }
    if (this.documentIdExpr) {
      options['document_id'] = this.documentIdExpr._toProto(serializer);
    }

    const args = [toMapValue(serializer, this.transforms)];

    return {
      ...proto,
      options: Object.keys(options).length > 0 ? options : undefined,
      args
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
    readUserDataHelper(this.transforms, context);
    if (this.documentIdExpr) {
      readUserDataHelper(this.documentIdExpr, context);
    }
  }
}

/**
 * Helper to read user data across a number of different formats.
 * @param name - Name of the calling function. Used for error messages when invalid user data is encountered.
 * @param expressionMap
 * @returns the expressionMap argument.
 * @private
 */
function readUserDataHelper<
  T extends
    Map<string, UserData> | Record<string, UserData> | UserData[] | UserData
>(expressionMap: T, context: ParseContext): T {
  if (isUserData(expressionMap)) {
    expressionMap._readUserData(context);
  } else if (Array.isArray(expressionMap)) {
    expressionMap.forEach(readableData => readableData._readUserData(context));
  } else if (expressionMap instanceof Map) {
    expressionMap.forEach(expr => expr._readUserData(context));
  } else {
    Object.values(expressionMap).forEach(expression =>
      expression._readUserData(context)
    );
  }
  return expressionMap;
}
