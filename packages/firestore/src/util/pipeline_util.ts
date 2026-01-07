/**
 * @license
 * Copyright 2025 Google LLC
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

import { FirestoreError, vector } from '../api';
import {
  _constant,
  AggregateFunction,
  AliasedAggregate,
  array,
  constant,
  Expression,
  AliasedExpression,
  field,
  Field,
  map,
  Selectable
} from '../lite-api/expressions';
import { VectorValue } from '../lite-api/vector_value';

import { fail } from './assert';
import { isPlainObject } from './input_validation';
import { isFirestoreValue } from './proto';
import { isString } from './types';

export function selectablesToMap(
  selectables: Array<Selectable | string>
): Map<string, Expression> {
  const result = new Map<string, Expression>();
  for (const selectable of selectables) {
    let alias: string;
    let expression: Expression;
    if (typeof selectable === 'string') {
      alias = selectable as string;
      expression = field(selectable);
    } else if (selectable instanceof Field) {
      alias = selectable.alias;
      expression = selectable.expr;
    } else if (selectable instanceof AliasedExpression) {
      alias = selectable.alias;
      expression = selectable.expr;
    } else {
      fail(0x5319, '`selectable` has an unsupported type', { selectable });
    }

    if (result.get(alias) !== undefined) {
      throw new FirestoreError(
        'invalid-argument',
        `Duplicate alias or field '${alias}'`
      );
    }

    result.set(alias, expression);
  }
  return result;
}

export function aliasedAggregateToMap(
  aliasedAggregatees: AliasedAggregate[]
): Map<string, AggregateFunction> {
  return aliasedAggregatees.reduce(
    (map: Map<string, AggregateFunction>, selectable: AliasedAggregate) => {
      if (map.get(selectable.alias) !== undefined) {
        throw new FirestoreError(
          'invalid-argument',
          `Duplicate alias or field '${selectable.alias}'`
        );
      }

      map.set(selectable.alias, selectable.aggregate as AggregateFunction);
      return map;
    },
    new Map() as Map<string, AggregateFunction>
  );
}

/**
 * Converts a value to an Expression, Returning either a Constant, MapFunction,
 * ArrayFunction, or the input itself (if it's already an expression).
 *
 * @private
 * @internal
 * @param value
 */
export function vectorToExpr(
  value: VectorValue | number[] | Expression
): Expression {
  if (value instanceof Expression) {
    return value;
  } else if (value instanceof VectorValue) {
    const result = constant(value);
    return result;
  } else if (Array.isArray(value)) {
    const result = constant(vector(value));
    return result;
  } else {
    throw new Error('Unsupported value: ' + typeof value);
  }
}

/**
 * Converts a value to an Expression, Returning either a Constant, MapFunction,
 * ArrayFunction, or the input itself (if it's already an expression).
 * If the input is a string, it is assumed to be a field name, and a
 * field(value) is returned.
 *
 * @private
 * @internal
 * @param value
 */
export function fieldOrExpression(value: unknown): Expression {
  if (isString(value)) {
    const result = field(value);
    return result;
  } else {
    return valueToDefaultExpr(value);
  }
}
/**
 * Converts a value to an Expression, Returning either a Constant, MapFunction,
 * ArrayFunction, or the input itself (if it's already an expression).
 *
 * @private
 * @internal
 * @param value
 */
export function valueToDefaultExpr(value: unknown): Expression {
  let result: Expression | undefined;
  if (isFirestoreValue(value)) {
    return constant(value);
  }
  if (value instanceof Expression) {
    return value;
  } else if (isPlainObject(value)) {
    result = map(value as Record<string, unknown>);
  } else if (value instanceof Array) {
    result = array(value);
  } else {
    result = _constant(value, undefined);
  }

  return result;
}
