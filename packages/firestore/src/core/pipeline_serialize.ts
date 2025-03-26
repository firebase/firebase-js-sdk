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

import {
  BooleanExpr,
  Constant,
  Expr,
  Field,
  FunctionExpr,
  Ordering
} from '../lite-api/expressions';
import {
  CollectionGroupSource,
  CollectionSource,
  DatabaseSource,
  DocumentsSource,
  Limit,
  Sort,
  Stage,
  Where
} from '../lite-api/stage';
import { fieldPathFromArgument } from '../lite-api/user_data_reader';
import {
  Value as ProtoValue,
  Stage as ProtoStage
} from '../protos/firestore_proto_api';

export function stageFromProto(protoStage: ProtoStage): Stage {
  switch (protoStage.name) {
    case 'collection': {
      return new CollectionSource(protoStage.args![0].referenceValue!);
    }
    case 'collection_group': {
      return new CollectionGroupSource(protoStage.args![1].stringValue!);
    }
    case 'database': {
      return new DatabaseSource();
    }
    case 'documents': {
      return new DocumentsSource(
        protoStage.args!.map(arg => arg.referenceValue!)
      );
    }
    case 'where': {
      return new Where(exprFromProto(protoStage.args![0]) as BooleanExpr);
    }
    case 'limit': {
      const limitValue =
        protoStage.args![0].integerValue ?? protoStage.args![0].doubleValue!;
      return new Limit(
        typeof limitValue === 'number' ? limitValue : Number(limitValue)
      );
    }
    case 'sort': {
      return new Sort(protoStage.args!.map(arg => orderingFromProto(arg)));
    }
    default: {
      throw new Error(`Stage type: ${protoStage.name} not supported.`);
    }
  }
}

export function exprFromProto(value: ProtoValue): Expr {
  if (!!value.fieldReferenceValue) {
    return new Field(
      fieldPathFromArgument('_exprFromProto', value.fieldReferenceValue)
    );
  } else if (!!value.functionValue) {
    return functionFromProto(value);
  } else {
    return Constant._fromProto(value);
  }
}

function functionFromProto(value: ProtoValue): FunctionExpr {
  // TODO(pipeline): When aggregation is supported, we need to return AggregateFunction for the functions
  // with aggregate names (sum, count, etc).
  return new FunctionExpr(
    value.functionValue!.name!,
    value.functionValue!.args?.map(exprFromProto) || []
  );
}

function orderingFromProto(value: ProtoValue): Ordering {
  const fields = value.mapValue?.fields!;
  return new Ordering(
    exprFromProto(fields.expression),
    fields.direction?.stringValue! as 'ascending' | 'descending'
  );
}
