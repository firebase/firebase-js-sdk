import { vector} from "../api";
import {
  _constant,
  AggregateFunction, AggregateWithAlias, array, constant,
  Expr,
  ExprWithAlias,
  field,
  Field, map,
  Selectable
} from "../lite-api/expressions";
import {VectorValue} from "../lite-api/vector_value";

import {isPlainObject} from "./input_validation";
import {isFirestoreValue} from "./proto";
import {isString} from "./types";

export function selectablesToMap(
  selectables: Array<Selectable | string>
): Map<string, Expr> {
  const result = new Map<string, Expr>();
  for (const selectable of selectables) {
    if (typeof selectable === 'string') {
      result.set(selectable as string, field(selectable));
    } else if (selectable instanceof Field) {
      result.set(selectable.alias, selectable.expr);
    } else if (selectable instanceof ExprWithAlias) {
      result.set(selectable.alias, selectable.expr);
    }
  }
  return result;
}

export function aliasedAggregateToMap(
  aliasedAggregatees: AggregateWithAlias[]
): Map<string, AggregateFunction> {
  return aliasedAggregatees.reduce(
    (
      map: Map<string, AggregateFunction>,
      selectable: AggregateWithAlias
    ) => {
      map.set(selectable.alias, selectable.aggregate as AggregateFunction);
      return map;
    },
    new Map() as Map<string, AggregateFunction>
  );
}

/**
 * Converts a value to an Expr, Returning either a Constant, MapFunction,
 * ArrayFunction, or the input itself (if it's already an expression).
 *
 * @private
 * @internal
 * @param value
 */
export function vectorToExpr(
  value: VectorValue | number[] | Expr
): Expr {
  if (value instanceof Expr) {
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
 * Converts a value to an Expr, Returning either a Constant, MapFunction,
 * ArrayFunction, or the input itself (if it's already an expression).
 * If the input is a string, it is assumed to be a field name, and a
 * field(value) is returned.
 *
 * @private
 * @internal
 * @param value
 */
export function fieldOrExpression(value: unknown): Expr {
  if (isString(value)) {
    const result = field(value);
    return result;
  } else {
    return valueToDefaultExpr(value);
  }
}
/**
 * Converts a value to an Expr, Returning either a Constant, MapFunction,
 * ArrayFunction, or the input itself (if it's already an expression).
 *
 * @private
 * @internal
 * @param value
 */
export function valueToDefaultExpr(value: unknown): Expr {
  let result: Expr | undefined;
  if (isFirestoreValue(value)) {
    return constant(value);
  }
  if (value instanceof Expr) {
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
