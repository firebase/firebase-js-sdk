// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ObjectValue } from '../model/object_value';
import {
  Stage as ProtoStage,
  Value as ProtoValue
} from '../protos/firestore_proto_api';
import { toNumber } from '../remote/number_serializer';
import {
  JsonProtoSerializer,
  toMapValue,
  toStringValue
} from '../remote/serializer';

import {
  Accumulator,
  Expr,
  Field,
  FilterCondition,
  Ordering
} from './expressions';
import { DocumentReference } from './reference';
import { VectorValue } from './vector_value';

/**
 * @beta
 */
export interface Stage {
  name: string;

  /**
   * @internal
   * @private
   */
  _toProto(jsonProtoSerializer: JsonProtoSerializer): ProtoStage;
}

/**
 * @beta
 */
export class AddFields implements Stage {
  name = 'add_fields';

  constructor(private fields: Map<string, Expr>) {}

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      name: this.name,
      args: [toMapValue(serializer, this.fields)]
    };
  }
}

/**
 * @beta
 */
export class Aggregate implements Stage {
  name = 'aggregate';

  constructor(
    private accumulators: Map<string, Accumulator>,
    private groups: Map<string, Expr>
  ) {}

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      name: this.name,
      args: [
        toMapValue(serializer, this.accumulators),
        toMapValue(serializer, this.groups)
      ]
    };
  }
}

/**
 * @beta
 */
export class Distinct implements Stage {
  name = 'distinct';

  constructor(private groups: Map<string, Expr>) {}

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      name: this.name,
      args: [toMapValue(serializer, this.groups)]
    };
  }
}

/**
 * @beta
 */
export class CollectionSource implements Stage {
  name = 'collection';

  constructor(private collectionPath: string) {
    if (!this.collectionPath.startsWith('/')) {
      this.collectionPath = '/' + this.collectionPath;
    }
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      name: this.name,
      args: [{ referenceValue: this.collectionPath }]
    };
  }
}

/**
 * @beta
 */
export class CollectionGroupSource implements Stage {
  name = 'collection_group';

  constructor(private collectionId: string) {}

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      name: this.name,
      args: [{ referenceValue: '' }, { stringValue: this.collectionId }]
    };
  }
}

/**
 * @beta
 */
export class DatabaseSource implements Stage {
  name = 'database';

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      name: this.name
    };
  }
}

/**
 * @beta
 */
export class DocumentsSource implements Stage {
  name = 'documents';

  constructor(private docPaths: string[]) {}

  static of(refs: DocumentReference[]): DocumentsSource {
    return new DocumentsSource(refs.map(ref => '/' + ref.path));
  }

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      name: this.name,
      args: this.docPaths.map(p => {
        return { referenceValue: p };
      })
    };
  }
}

/**
 * @beta
 */
export class Where implements Stage {
  name = 'where';

  constructor(private condition: FilterCondition & Expr) {}

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      name: this.name,
      args: [(this.condition as unknown as Expr)._toProto(serializer)]
    };
  }
}

/**
 * @beta
 */
export interface FindNearestOptions {
  field: Field;
  vectorValue: VectorValue | number[];
  distanceMeasure: 'euclidean' | 'cosine' | 'dot_product';
  limit?: number;
  distanceField?: string;
}

/**
 * @beta
 */
export class FindNearest implements Stage {
  name = 'find_nearest';

  /**
   * @private
   * @internal
   *
   * @param _field
   * @param _vectorValue
   * @param _distanceMeasure
   * @param _limit
   * @param _distanceField
   */
  constructor(
    private _field: Field,
    private _vectorValue: ObjectValue,
    private _distanceMeasure: 'euclidean' | 'cosine' | 'dot_product',
    private _limit?: number,
    private _distanceField?: string
  ) {}

  /**
   * @private
   * @internal
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    const options: { [k: string]: ProtoValue } = {};

    if (this._limit) {
      options.limit = toNumber(serializer, this._limit)!;
    }

    if (this._distanceField) {
      // eslint-disable-next-line camelcase
      options.distance_field = Field.of(this._distanceField)._toProto(
        serializer
      );
    }

    return {
      name: this.name,
      args: [
        this._field._toProto(serializer),
        this._vectorValue.value,
        toStringValue(this._distanceMeasure)
      ],
      options
    };
  }
}

/**
 * @beta
 */
export class Limit implements Stage {
  name = 'limit';

  constructor(private limit: number) {}

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      name: this.name,
      args: [toNumber(serializer, this.limit)]
    };
  }
}

/**
 * @beta
 */
export class Offset implements Stage {
  name = 'offset';

  constructor(private offset: number) {}

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      name: this.name,
      args: [toNumber(serializer, this.offset)]
    };
  }
}

/**
 * @beta
 */
export class Select implements Stage {
  name = 'select';

  constructor(private projections: Map<string, Expr>) {}

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      name: this.name,
      args: [toMapValue(serializer, this.projections)]
    };
  }
}

/**
 * @beta
 */
export class Sort implements Stage {
  name = 'sort';

  constructor(private orders: Ordering[]) {}

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    return {
      name: this.name,
      args: this.orders.map(o => o._toProto(serializer))
    };
  }
}

/**
 * @beta
 */
export class GenericStage implements Stage {
  constructor(public name: string, params: unknown[]) {}

  /**
   * @internal
   * @private
   */
  _toProto(serializer: JsonProtoSerializer): ProtoStage {
    // TODO support generic stage
    return {};
  }
}
