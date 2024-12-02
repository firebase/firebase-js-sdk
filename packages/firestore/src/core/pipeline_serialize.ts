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
  Value as ProtoValue,
  Stage as ProtoStage
} from '../protos/firestore_proto_api';
import { fieldPathFromArgument } from '../lite-api/user_data_reader';
import {
  Constant,
  Eq,
  Expr,
  Field,
  FilterCondition,
  FirestoreFunction,
  Ordering
} from '../lite-api/expressions';
import {
  CoreAdd,
  CoreAnd,
  CoreArrayConcat,
  CoreArrayContains,
  CoreArrayContainsAll,
  CoreArrayContainsAny,
  CoreArrayReverse,
  CoreAvg,
  CoreByteLength,
  CoreCharLength,
  CoreCount,
  CoreDivide,
  CoreEndsWith,
  CoreEq,
  CoreExists,
  CoreIf,
  CoreIn,
  CoreIsNan,
  CoreLike,
  CoreLogicalMax,
  CoreLogicalMin,
  CoreMapGet,
  CoreMod,
  CoreMultiply,
  CoreNot,
  CoreOr,
  CoreRegexContains,
  CoreRegexMatch,
  CoreReplaceAll,
  CoreReplaceFirst,
  CoreReverse,
  CoreStartsWith,
  CoreStrConcat,
  CoreStrContains,
  CoreSubtract,
  CoreSum,
  CoreToLower,
  CoreToUpper,
  CoreTrim,
  CoreXor
} from './expressions';
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
      return new Where(
        exprFromProto(protoStage.args![0]) as Expr & FilterCondition
      );
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

function functionFromProto(value: ProtoValue): FirestoreFunction {
  switch (value.functionValue!.name) {
    case 'add': {
      return CoreAdd.fromProtoToApiObj(value.functionValue!);
    }
    case 'subtract': {
      return CoreSubtract.fromProtoToApiObj(value.functionValue!);
    }
    case 'multiply': {
      return CoreMultiply.fromProtoToApiObj(value.functionValue!);
    }
    case 'divide': {
      return CoreDivide.fromProtoToApiObj(value.functionValue!);
    }
    case 'mod': {
      return CoreMod.fromProtoToApiObj(value.functionValue!);
    }
    case 'and': {
      return CoreAnd.fromProtoToApiObj(value.functionValue!);
    }
    case 'not': {
      return CoreNot.fromProtoToApiObj(value.functionValue!);
    }
    case 'or': {
      return CoreOr.fromProtoToApiObj(value.functionValue!);
    }
    case 'xor': {
      return CoreXor.fromProtoToApiObj(value.functionValue!);
    }
    case 'in': {
      return CoreIn.fromProtoToApiObj(value.functionValue!);
    }
    case 'isnan': {
      return CoreIsNan.fromProtoToApiObj(value.functionValue!);
    }
    case 'exists': {
      return CoreExists.fromProtoToApiObj(value.functionValue!);
    }
    case 'if': {
      return CoreIf.fromProtoToApiObj(value.functionValue!);
    }
    case 'logical_max': {
      return CoreLogicalMax.fromProtoToApiObj(value.functionValue!);
    }
    case 'logical_min': {
      return CoreLogicalMin.fromProtoToApiObj(value.functionValue!);
    }
    case 'array_concat': {
      return CoreArrayConcat.fromProtoToApiObj(value.functionValue!);
    }
    case 'array_reverse': {
      return CoreArrayReverse.fromProtoToApiObj(value.functionValue!);
    }
    case 'array_contains': {
      return CoreArrayContains.fromProtoToApiObj(value.functionValue!);
    }
    case 'array_contains_all': {
      return CoreArrayContainsAll.fromProtoToApiObj(value.functionValue!);
    }
    case 'array_contains_any': {
      return CoreArrayContainsAny.fromProtoToApiObj(value.functionValue!);
    }
    case 'eq': {
      return CoreEq.fromProtoToApiObj(value.functionValue!);
    }
    case 'neq': {
      return CoreEq.fromProtoToApiObj(value.functionValue!);
    }
    case 'lt': {
      return CoreEq.fromProtoToApiObj(value.functionValue!);
    }
    case 'lte': {
      return CoreEq.fromProtoToApiObj(value.functionValue!);
    }
    case 'gt': {
      return CoreEq.fromProtoToApiObj(value.functionValue!);
    }
    case 'gte': {
      return CoreEq.fromProtoToApiObj(value.functionValue!);
    }
    case 'reverse': {
      return CoreReverse.fromProtoToApiObj(value.functionValue!);
    }
    case 'replace_first': {
      return CoreReplaceFirst.fromProtoToApiObj(value.functionValue!);
    }
    case 'replace_all': {
      return CoreReplaceAll.fromProtoToApiObj(value.functionValue!);
    }
    case 'char_length': {
      return CoreCharLength.fromProtoToApiObj(value.functionValue!);
    }
    case 'byte_length': {
      return CoreByteLength.fromProtoToApiObj(value.functionValue!);
    }
    case 'like': {
      return CoreLike.fromProtoToApiObj(value.functionValue!);
    }
    case 'regex_contains': {
      return CoreRegexContains.fromProtoToApiObj(value.functionValue!);
    }
    case 'regex_match': {
      return CoreRegexMatch.fromProtoToApiObj(value.functionValue!);
    }
    case 'str_contains': {
      return CoreStrContains.fromProtoToApiObj(value.functionValue!);
    }
    case 'starts_with': {
      return CoreStartsWith.fromProtoToApiObj(value.functionValue!);
    }
    case 'ends_with': {
      return CoreEndsWith.fromProtoToApiObj(value.functionValue!);
    }
    case 'to_lower': {
      return CoreToLower.fromProtoToApiObj(value.functionValue!);
    }
    case 'to_upper': {
      return CoreToUpper.fromProtoToApiObj(value.functionValue!);
    }
    case 'trim': {
      return CoreTrim.fromProtoToApiObj(value.functionValue!);
    }
    case 'str_concat': {
      return CoreStrConcat.fromProtoToApiObj(value.functionValue!);
    }
    case 'map_get': {
      return CoreMapGet.fromProtoToApiObj(value.functionValue!);
    }
    case 'count': {
      return CoreCount.fromProtoToApiObj(value.functionValue!);
    }
    case 'sum': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'avg': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'min': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'max': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'cosine_distance': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'dot_product': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'euclidean_distance': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'vector_length': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'unix_micros_to_timestamp': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'timestamp_to_unix_micros': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'unix_millis_to_timestamp': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'timestamp_to_unix_millis': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'unix_seconds_to_timestamp': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'timestamp_to_unix_seconds': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'timestamp_add': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'timestamp_sub': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    case 'array_element': {
      return CoreSum.fromProtoToApiObj(value.functionValue!);
    }
    default: {
      throw new Error(`Unknown function name: ${value.functionValue!.name}`);
    }
  }
}

function orderingFromProto(value: ProtoValue): Ordering {
  const fields = value.mapValue?.fields!;
  return new Ordering(
    exprFromProto(fields.expression),
    fields.direction?.stringValue! as 'ascending' | 'descending'
  );
}
