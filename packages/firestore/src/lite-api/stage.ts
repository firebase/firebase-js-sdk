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

import {
  AggregateFunction,
  BooleanExpression,
  Expression,
  Field,
  field,
  Ordering
} from './expressions';
import { Pipeline } from './pipeline';
import { StageOptions } from './stage_options';
import { isUserData, UserData } from './user_data_reader';

import Value = firestoreV1ApiClientInterfaces.Value;

/**
 * @beta
 */
export abstract class Stage implements ProtoSerializable<ProtoStage>, UserData {
  /**
   * Store optionsProto parsed by _readUserData.
   * @private
   * @internal
   * @protected
   */
  protected optionsProto: ApiClientObjectMap<Value> | undefined = undefined;
  protected knownOptions: Record<string, unknown>;
  protected rawOptions?: Record<string, unknown>;

  constructor(options: StageOptions) {
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

/**
 * @beta
 */
export class AddFields extends Stage {
  get _name(): string {
    return 'add_fields';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(private fields: Map<string, Expression>, options: StageOptions) {
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

/**
 * @beta
 */
export class RemoveFields extends Stage {
  get _name(): string {
    return 'remove_fields';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(private fields: Field[], options: StageOptions) {
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
 * @beta
 */
export class Aggregate extends Stage {
  get _name(): string {
    return 'aggregate';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(
    private groups: Map<string, Expression>,
    private accumulators: Map<string, AggregateFunction>,
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

/**
 * @beta
 */
export class Distinct extends Stage {
  get _name(): string {
    return 'distinct';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(private groups: Map<string, Expression>, options: StageOptions) {
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

/**
 * @beta
 */
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

  private formattedCollectionPath: string;

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

/**
 * @beta
 */
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

  constructor(private collectionId: string, options: StageOptions) {
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

/**
 * @beta
 */
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

/**
 * @beta
 */
export class DocumentsSource extends Stage {
  get _name(): string {
    return 'documents';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  private formattedPaths: string[];

  constructor(docPaths: string[], options: StageOptions) {
    super(options);
    this.formattedPaths = docPaths.map(path =>
      path.startsWith('/') ? path : '/' + path
    );
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

/**
 * @beta
 */
export class Where extends Stage {
  get _name(): string {
    return 'where';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(private condition: BooleanExpression, options: StageOptions) {
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

/**
 * @beta
 */
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

/**
 * @beta
 */
export class Limit extends Stage {
  get _name(): string {
    return 'limit';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(private limit: number, options: StageOptions) {
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

/**
 * @beta
 */
export class Offset extends Stage {
  get _name(): string {
    return 'offset';
  }
  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(private offset: number, options: StageOptions) {
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

/**
 * @beta
 */
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

/**
 * @beta
 */
export class Sort extends Stage {
  get _name(): string {
    return 'sort';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(private orderings: Ordering[], options: StageOptions) {
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

/**
 * @beta
 */
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

/**
 * @beta
 */
export class Union extends Stage {
  get _name(): string {
    return 'union';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(private other: Pipeline, options: StageOptions) {
    super(options);
  }

  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      ...super._toProto(serializer),
      args: [toPipelineValue(this.other._toProto(serializer))]
    };
  }

  _readUserData(context: ParseContext): void {
    super._readUserData(context);
  }
}

/**
 * @beta
 */
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

/**
 * @beta
 */
export class Replace extends Stage {
  static readonly MODE = 'full_replace';

  get _name(): string {
    return 'replace_with';
  }

  get _optionsUtil(): OptionsUtil {
    return new OptionsUtil({});
  }

  constructor(private map: Expression, options: StageOptions) {
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
 * Helper to read user data across a number of different formats.
 * @param name Name of the calling function. Used for error messages when invalid user data is encountered.
 * @param expressionMap
 * @return the expressionMap argument.
 * @private
 */
function readUserDataHelper<
  T extends Map<string, UserData> | UserData[] | UserData
>(expressionMap: T, context: ParseContext): T {
  if (isUserData(expressionMap)) {
    expressionMap._readUserData(context);
  } else if (Array.isArray(expressionMap)) {
    expressionMap.forEach(readableData => readableData._readUserData(context));
  } else {
    expressionMap.forEach(expr => expr._readUserData(context));
  }
  return expressionMap;
}
