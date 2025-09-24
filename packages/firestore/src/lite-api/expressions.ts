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

import { vector } from '../api';
import { ParseContext } from '../api/parse_context';
import {
  DOCUMENT_KEY_NAME,
  FieldPath as InternalFieldPath
} from '../model/path';
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import {
  JsonProtoSerializer,
  ProtoValueSerializable,
  toMapValue,
  toStringValue
} from '../remote/serializer';
import { hardAssert } from '../util/assert';
import { isPlainObject } from '../util/input_validation';
import { isFirestoreValue } from '../util/proto';
import { isString } from '../util/types';

import { Bytes } from './bytes';
import { documentId as documentIdFieldPath, FieldPath } from './field_path';
import { GeoPoint } from './geo_point';
import { DocumentReference } from './reference';
import { Timestamp } from './timestamp';
import { fieldPathFromArgument, parseData, UserData } from './user_data_reader';
import { VectorValue } from './vector_value';

/**
 * @beta
 *
 * An enumeration of the different types of expressions.
 */
export type ExpressionType =
  | 'Field'
  | 'Constant'
  | 'Function'
  | 'AggregateFunction'
  | 'ListOfExpressions'
  | 'AliasedExpression';

/**
 * Converts a value to an Expr, Returning either a Constant, MapFunction,
 * ArrayFunction, or the input itself (if it's already an expression).
 *
 * @private
 * @internal
 * @param value
 */
function valueToDefaultExpr(value: unknown): Expression {
  let result: Expression | undefined;
  if (value instanceof Expression) {
    return value;
  } else if (isPlainObject(value)) {
    result = _map(value as Record<string, unknown>, undefined);
  } else if (value instanceof Array) {
    result = array(value);
  } else {
    result = _constant(value, undefined);
  }

  return result;
}

/**
 * Converts a value to an Expr, Returning either a Constant, MapFunction,
 * ArrayFunction, or the input itself (if it's already an expression).
 *
 * @private
 * @internal
 * @param value
 */
function vectorToExpr(value: VectorValue | number[] | Expression): Expression {
  if (value instanceof Expression) {
    return value;
  } else if (value instanceof VectorValue) {
    return constant(value);
  } else if (Array.isArray(value)) {
    return constant(vector(value));
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
function fieldOrExpression(value: unknown): Expression {
  if (isString(value)) {
    const result = field(value);
    return result;
  } else {
    return valueToDefaultExpr(value);
  }
}

/**
 * @beta
 *
 * Represents an expression that can be evaluated to a value within the execution of a {@link
 * Pipeline}.
 *
 * Expressions are the building blocks for creating complex queries and transformations in
 * Firestore pipelines. They can represent:
 *
 * - **Field references:** Access values from document fields.
 * - **Literals:** Represent constant values (strings, numbers, booleans).
 * - **Function calls:** Apply functions to one or more expressions.
 *
 * The `Expr` class provides a fluent API for building expressions. You can chain together
 * method calls to create complex expressions.
 */
export abstract class Expression implements ProtoValueSerializable, UserData {
  abstract readonly expressionType: ExpressionType;

  abstract readonly _methodName?: string;

  /**
   * @private
   * @internal
   */
  abstract _toProto(serializer: JsonProtoSerializer): ProtoValue;
  _protoValueType = 'ProtoValue' as const;

  /**
   * @private
   * @internal
   */
  abstract _readUserData(context: ParseContext): void;

  /**
   * Creates an expression that adds this expression to another expression.
   *
   * ```typescript
   * // Add the value of the 'quantity' field and the 'reserve' field.
   * field("quantity").add(field("reserve"));
   * ```
   *
   * @param second The expression or literal to add to this expression.
   * @param others Optional additional expressions or literals to add to this expression.
   * @return A new `Expr` representing the addition operation.
   */
  add(second: Expression | unknown): FunctionExpression {
    return new FunctionExpression(
      'add',
      [this, valueToDefaultExpr(second)],
      'add'
    );
  }

  /**
   * Creates an expression that subtracts another expression from this expression.
   *
   * ```typescript
   * // Subtract the 'discount' field from the 'price' field
   * field("price").subtract(field("discount"));
   * ```
   *
   * @param subtrahend The expression to subtract from this expression.
   * @return A new `Expr` representing the subtraction operation.
   */
  subtract(subtrahend: Expression): FunctionExpression;

  /**
   * Creates an expression that subtracts a constant value from this expression.
   *
   * ```typescript
   * // Subtract 20 from the value of the 'total' field
   * field("total").subtract(20);
   * ```
   *
   * @param subtrahend The constant value to subtract.
   * @return A new `Expr` representing the subtraction operation.
   */
  subtract(subtrahend: number): FunctionExpression;
  subtract(subtrahend: number | Expression): FunctionExpression {
    return new FunctionExpression(
      'subtract',
      [this, valueToDefaultExpr(subtrahend)],
      'subtract'
    );
  }

  /**
   * Creates an expression that multiplies this expression by another expression.
   *
   * ```typescript
   * // Multiply the 'quantity' field by the 'price' field
   * field("quantity").multiply(field("price"));
   * ```
   *
   * @param second The second expression or literal to multiply by.
   * @param others Optional additional expressions or literals to multiply by.
   * @return A new `Expr` representing the multiplication operation.
   */
  multiply(second: Expression | number): FunctionExpression {
    return new FunctionExpression(
      'multiply',
      [this, valueToDefaultExpr(second)],
      'multiply'
    );
  }

  /**
   * Creates an expression that divides this expression by another expression.
   *
   * ```typescript
   * // Divide the 'total' field by the 'count' field
   * field("total").divide(field("count"));
   * ```
   *
   * @param divisor The expression to divide by.
   * @return A new `Expr` representing the division operation.
   */
  divide(divisor: Expression): FunctionExpression;

  /**
   * Creates an expression that divides this expression by a constant value.
   *
   * ```typescript
   * // Divide the 'value' field by 10
   * field("value").divide(10);
   * ```
   *
   * @param divisor The constant value to divide by.
   * @return A new `Expr` representing the division operation.
   */
  divide(divisor: number): FunctionExpression;
  divide(divisor: number | Expression): FunctionExpression {
    return new FunctionExpression(
      'divide',
      [this, valueToDefaultExpr(divisor)],
      'divide'
    );
  }

  /**
   * Creates an expression that calculates the modulo (remainder) of dividing this expression by another expression.
   *
   * ```typescript
   * // Calculate the remainder of dividing the 'value' field by the 'divisor' field
   * field("value").mod(field("divisor"));
   * ```
   *
   * @param expression The expression to divide by.
   * @return A new `Expr` representing the modulo operation.
   */
  mod(expression: Expression): FunctionExpression;

  /**
   * Creates an expression that calculates the modulo (remainder) of dividing this expression by a constant value.
   *
   * ```typescript
   * // Calculate the remainder of dividing the 'value' field by 10
   * field("value").mod(10);
   * ```
   *
   * @param value The constant value to divide by.
   * @return A new `Expr` representing the modulo operation.
   */
  mod(value: number): FunctionExpression;
  mod(other: number | Expression): FunctionExpression {
    return new FunctionExpression(
      'mod',
      [this, valueToDefaultExpr(other)],
      'mod'
    );
  }

  /**
   * Creates an expression that checks if this expression is equal to another expression.
   *
   * ```typescript
   * // Check if the 'age' field is equal to 21
   * field("age").equal(21);
   * ```
   *
   * @param expression The expression to compare for equality.
   * @return A new `Expr` representing the equality comparison.
   */
  equal(expression: Expression): BooleanExpression;

  /**
   * Creates an expression that checks if this expression is equal to a constant value.
   *
   * ```typescript
   * // Check if the 'city' field is equal to "London"
   * field("city").equal("London");
   * ```
   *
   * @param value The constant value to compare for equality.
   * @return A new `Expr` representing the equality comparison.
   */
  equal(value: unknown): BooleanExpression;
  equal(other: unknown): BooleanExpression {
    return new BooleanExpression(
      'equal',
      [this, valueToDefaultExpr(other)],
      'equal'
    );
  }

  /**
   * Creates an expression that checks if this expression is not equal to another expression.
   *
   * ```typescript
   * // Check if the 'status' field is not equal to "completed"
   * field("status").notEqual("completed");
   * ```
   *
   * @param expression The expression to compare for inequality.
   * @return A new `Expr` representing the inequality comparison.
   */
  notEqual(expression: Expression): BooleanExpression;

  /**
   * Creates an expression that checks if this expression is not equal to a constant value.
   *
   * ```typescript
   * // Check if the 'country' field is not equal to "USA"
   * field("country").notEqual("USA");
   * ```
   *
   * @param value The constant value to compare for inequality.
   * @return A new `Expr` representing the inequality comparison.
   */
  notEqual(value: unknown): BooleanExpression;
  notEqual(other: unknown): BooleanExpression {
    return new BooleanExpression(
      'not_equal',
      [this, valueToDefaultExpr(other)],
      'notEqual'
    );
  }

  /**
   * Creates an expression that checks if this expression is less than another expression.
   *
   * ```typescript
   * // Check if the 'age' field is less than 'limit'
   * field("age").lessThan(field('limit'));
   * ```
   *
   * @param experession The expression to compare for less than.
   * @return A new `Expr` representing the less than comparison.
   */
  lessThan(experession: Expression): BooleanExpression;

  /**
   * Creates an expression that checks if this expression is less than a constant value.
   *
   * ```typescript
   * // Check if the 'price' field is less than 50
   * field("price").lessThan(50);
   * ```
   *
   * @param value The constant value to compare for less than.
   * @return A new `Expr` representing the less than comparison.
   */
  lessThan(value: unknown): BooleanExpression;
  lessThan(other: unknown): BooleanExpression {
    return new BooleanExpression(
      'less_than',
      [this, valueToDefaultExpr(other)],
      'lessThan'
    );
  }

  /**
   * Creates an expression that checks if this expression is less than or equal to another
   * expression.
   *
   * ```typescript
   * // Check if the 'quantity' field is less than or equal to 20
   * field("quantity").lessThan(constant(20));
   * ```
   *
   * @param expression The expression to compare for less than or equal to.
   * @return A new `Expr` representing the less than or equal to comparison.
   */
  lessThanOrEqual(expression: Expression): BooleanExpression;

  /**
   * Creates an expression that checks if this expression is less than or equal to a constant value.
   *
   * ```typescript
   * // Check if the 'score' field is less than or equal to 70
   * field("score").lessThan(70);
   * ```
   *
   * @param value The constant value to compare for less than or equal to.
   * @return A new `Expr` representing the less than or equal to comparison.
   */
  lessThanOrEqual(value: unknown): BooleanExpression;
  lessThanOrEqual(other: unknown): BooleanExpression {
    return new BooleanExpression(
      'less_than_or_equal',
      [this, valueToDefaultExpr(other)],
      'lessThanOrEqual'
    );
  }

  /**
   * Creates an expression that checks if this expression is greater than another expression.
   *
   * ```typescript
   * // Check if the 'age' field is greater than the 'limit' field
   * field("age").greaterThan(field("limit"));
   * ```
   *
   * @param expression The expression to compare for greater than.
   * @return A new `Expr` representing the greater than comparison.
   */
  greaterThan(expression: Expression): BooleanExpression;

  /**
   * Creates an expression that checks if this expression is greater than a constant value.
   *
   * ```typescript
   * // Check if the 'price' field is greater than 100
   * field("price").greaterThan(100);
   * ```
   *
   * @param value The constant value to compare for greater than.
   * @return A new `Expr` representing the greater than comparison.
   */
  greaterThan(value: unknown): BooleanExpression;
  greaterThan(other: unknown): BooleanExpression {
    return new BooleanExpression(
      'greater_than',
      [this, valueToDefaultExpr(other)],
      'greaterThan'
    );
  }

  /**
   * Creates an expression that checks if this expression is greater than or equal to another
   * expression.
   *
   * ```typescript
   * // Check if the 'quantity' field is greater than or equal to field 'requirement' plus 1
   * field("quantity").greaterThanOrEqual(field('requirement').add(1));
   * ```
   *
   * @param expression The expression to compare for greater than or equal to.
   * @return A new `Expr` representing the greater than or equal to comparison.
   */
  greaterThanOrEqual(expression: Expression): BooleanExpression;

  /**
   * Creates an expression that checks if this expression is greater than or equal to a constant
   * value.
   *
   * ```typescript
   * // Check if the 'score' field is greater than or equal to 80
   * field("score").greaterThanOrEqual(80);
   * ```
   *
   * @param value The constant value to compare for greater than or equal to.
   * @return A new `Expr` representing the greater than or equal to comparison.
   */
  greaterThanOrEqual(value: unknown): BooleanExpression;
  greaterThanOrEqual(other: unknown): BooleanExpression {
    return new BooleanExpression(
      'greater_than_or_equal',
      [this, valueToDefaultExpr(other)],
      'greaterThanOrEqual'
    );
  }

  /**
   * Creates an expression that concatenates an array expression with one or more other arrays.
   *
   * ```typescript
   * // Combine the 'items' array with another array field.
   * field("items").arrayConcat(field("otherItems"));
   * ```
   * @param secondArray Second array expression or array literal to concatenate.
   * @param otherArrays Optional additional array expressions or array literals to concatenate.
   * @return A new `Expr` representing the concatenated array.
   */
  arrayConcat(
    secondArray: Expression | unknown[],
    ...otherArrays: Array<Expression | unknown[]>
  ): FunctionExpression {
    const elements = [secondArray, ...otherArrays];
    const exprValues = elements.map(value => valueToDefaultExpr(value));
    return new FunctionExpression(
      'array_concat',
      [this, ...exprValues],
      'arrayConcat'
    );
  }

  /**
   * Creates an expression that checks if an array contains a specific element.
   *
   * ```typescript
   * // Check if the 'sizes' array contains the value from the 'selectedSize' field
   * field("sizes").arrayContains(field("selectedSize"));
   * ```
   *
   * @param expression The element to search for in the array.
   * @return A new `Expr` representing the 'array_contains' comparison.
   */
  arrayContains(expression: Expression): BooleanExpression;

  /**
   * Creates an expression that checks if an array contains a specific value.
   *
   * ```typescript
   * // Check if the 'colors' array contains "red"
   * field("colors").arrayContains("red");
   * ```
   *
   * @param value The element to search for in the array.
   * @return A new `Expr` representing the 'array_contains' comparison.
   */
  arrayContains(value: unknown): BooleanExpression;
  arrayContains(element: unknown): BooleanExpression {
    return new BooleanExpression(
      'array_contains',
      [this, valueToDefaultExpr(element)],
      'arrayContains'
    );
  }

  /**
   * Creates an expression that checks if an array contains all the specified elements.
   *
   * ```typescript
   * // Check if the 'tags' array contains both the value in field "tag1" and the literal value "tag2"
   * field("tags").arrayContainsAll([field("tag1"), "tag2"]);
   * ```
   *
   * @param values The elements to check for in the array.
   * @return A new `Expr` representing the 'array_contains_all' comparison.
   */
  arrayContainsAll(values: Array<Expression | unknown>): BooleanExpression;

  /**
   * Creates an expression that checks if an array contains all the specified elements.
   *
   * ```typescript
   * // Check if the 'tags' array contains both of the values from field "tag1" and the literal value "tag2"
   * field("tags").arrayContainsAll(array([field("tag1"), "tag2"]));
   * ```
   *
   * @param arrayExpression The elements to check for in the array.
   * @return A new `Expr` representing the 'array_contains_all' comparison.
   */
  arrayContainsAll(arrayExpression: Expression): BooleanExpression;
  arrayContainsAll(values: unknown[] | Expression): BooleanExpression {
    const normalizedExpr = Array.isArray(values)
      ? new ListOfExprs(values.map(valueToDefaultExpr), 'arrayContainsAll')
      : values;
    return new BooleanExpression(
      'array_contains_all',
      [this, normalizedExpr],
      'arrayContainsAll'
    );
  }

  /**
   * Creates an expression that checks if an array contains any of the specified elements.
   *
   * ```typescript
   * // Check if the 'categories' array contains either values from field "cate1" or "cate2"
   * field("categories").arrayContainsAny([field("cate1"), field("cate2")]);
   * ```
   *
   * @param values The elements to check for in the array.
   * @return A new `Expr` representing the 'array_contains_any' comparison.
   */
  arrayContainsAny(values: Array<Expression | unknown>): BooleanExpression;

  /**
   * Creates an expression that checks if an array contains any of the specified elements.
   *
   * ```typescript
   * // Check if the 'groups' array contains either the value from the 'userGroup' field
   * // or the value "guest"
   * field("groups").arrayContainsAny(array([field("userGroup"), "guest"]));
   * ```
   *
   * @param arrayExpression The elements to check for in the array.
   * @return A new `Expr` representing the 'array_contains_any' comparison.
   */
  arrayContainsAny(arrayExpression: Expression): BooleanExpression;
  arrayContainsAny(
    values: Array<unknown | Expression> | Expression
  ): BooleanExpression {
    const normalizedExpr = Array.isArray(values)
      ? new ListOfExprs(values.map(valueToDefaultExpr), 'arrayContainsAny')
      : values;
    return new BooleanExpression(
      'array_contains_any',
      [this, normalizedExpr],
      'arrayContainsAny'
    );
  }

  /**
   * Creates an expression that reverses an array.
   *
   * ```typescript
   * // Reverse the value of the 'myArray' field.
   * field("myArray").arrayReverse();
   * ```
   *
   * @return A new {@code Expr} representing the reversed array.
   */
  arrayReverse(): FunctionExpression {
    return new FunctionExpression('array_reverse', [this]);
  }

  /**
   * Creates an expression that calculates the length of an array.
   *
   * ```typescript
   * // Get the number of items in the 'cart' array
   * field("cart").arrayLength();
   * ```
   *
   * @return A new `Expr` representing the length of the array.
   */
  arrayLength(): FunctionExpression {
    return new FunctionExpression('array_length', [this], 'arrayLength');
  }

  /**
   * Creates an expression that checks if this expression is equal to any of the provided values or
   * expressions.
   *
   * ```typescript
   * // Check if the 'category' field is either "Electronics" or value of field 'primaryType'
   * field("category").equalAny("Electronics", field("primaryType"));
   * ```
   *
   * @param values The values or expressions to check against.
   * @return A new `Expr` representing the 'IN' comparison.
   */
  equalAny(values: Array<Expression | unknown>): BooleanExpression;

  /**
   * Creates an expression that checks if this expression is equal to any of the provided values or
   * expressions.
   *
   * ```typescript
   * // Check if the 'category' field is either "Electronics" or value of field 'primaryType'
   * field("category").equalAny(array(["Electronics", field("primaryType")]));
   * ```
   *
   * @param arrayExpression An expression that evaluates to an array of values to check against.
   * @return A new `Expr` representing the 'IN' comparison.
   */
  equalAny(arrayExpression: Expression): BooleanExpression;
  equalAny(others: unknown[] | Expression): BooleanExpression {
    const exprOthers = Array.isArray(others)
      ? new ListOfExprs(others.map(valueToDefaultExpr), 'equalAny')
      : others;
    return new BooleanExpression('equal_any', [this, exprOthers], 'equalAny');
  }

  /**
   * Creates an expression that checks if this expression is not equal to any of the provided values or
   * expressions.
   *
   * ```typescript
   * // Check if the 'status' field is neither "pending" nor the value of 'rejectedStatus'
   * field("status").notEqualAny(["pending", field("rejectedStatus")]);
   * ```
   *
   * @param values The values or expressions to check against.
   * @return A new `Expr` representing the 'notEqualAny' comparison.
   */
  notEqualAny(values: Array<Expression | unknown>): BooleanExpression;

  /**
   * Creates an expression that checks if this expression is not equal to any of the values in the evaluated expression.
   *
   * ```typescript
   * // Check if the 'status' field is not equal to any value in the field 'rejectedStatuses'
   * field("status").notEqualAny(field('rejectedStatuses'));
   * ```
   *
   * @param arrayExpression The values or expressions to check against.
   * @return A new `Expr` representing the 'notEqualAny' comparison.
   */
  notEqualAny(arrayExpression: Expression): BooleanExpression;
  notEqualAny(others: unknown[] | Expression): BooleanExpression {
    const exprOthers = Array.isArray(others)
      ? new ListOfExprs(others.map(valueToDefaultExpr), 'notEqualAny')
      : others;
    return new BooleanExpression(
      'not_equal_any',
      [this, exprOthers],
      'notEqualAny'
    );
  }

  /**
   * Creates an expression that checks if this expression evaluates to 'NaN' (Not a Number).
   *
   * ```typescript
   * // Check if the result of a calculation is NaN
   * field("value").divide(0).isNaN();
   * ```
   *
   * @return A new `Expr` representing the 'isNaN' check.
   */
  isNan(): BooleanExpression {
    return new BooleanExpression('is_nan', [this], 'isNan');
  }

  /**
   * Creates an expression that checks if this expression evaluates to 'Null'.
   *
   * ```typescript
   * // Check if the result of a calculation is NaN
   * field("value").isNull();
   * ```
   *
   * @return A new `Expr` representing the 'isNull' check.
   */
  isNull(): BooleanExpression {
    return new BooleanExpression('is_null', [this], 'isNull');
  }

  /**
   * Creates an expression that checks if a field exists in the document.
   *
   * ```typescript
   * // Check if the document has a field named "phoneNumber"
   * field("phoneNumber").exists();
   * ```
   *
   * @return A new `Expr` representing the 'exists' check.
   */
  exists(): BooleanExpression {
    return new BooleanExpression('exists', [this], 'exists');
  }

  /**
   * Creates an expression that calculates the character length of a string in UTF-8.
   *
   * ```typescript
   * // Get the character length of the 'name' field in its UTF-8 form.
   * field("name").charLength();
   * ```
   *
   * @return A new `Expr` representing the length of the string.
   */
  charLength(): FunctionExpression {
    return new FunctionExpression('char_length', [this], 'charLength');
  }

  /**
   * Creates an expression that performs a case-sensitive string comparison.
   *
   * ```typescript
   * // Check if the 'title' field contains the word "guide" (case-sensitive)
   * field("title").like("%guide%");
   * ```
   *
   * @param pattern The pattern to search for. You can use "%" as a wildcard character.
   * @return A new `Expr` representing the 'like' comparison.
   */
  like(pattern: string): BooleanExpression;

  /**
   * Creates an expression that performs a case-sensitive string comparison.
   *
   * ```typescript
   * // Check if the 'title' field contains the word "guide" (case-sensitive)
   * field("title").like("%guide%");
   * ```
   *
   * @param pattern The pattern to search for. You can use "%" as a wildcard character.
   * @return A new `Expr` representing the 'like' comparison.
   */
  like(pattern: Expression): BooleanExpression;
  like(stringOrExpr: string | Expression): BooleanExpression {
    return new BooleanExpression(
      'like',
      [this, valueToDefaultExpr(stringOrExpr)],
      'like'
    );
  }

  /**
   * Creates an expression that checks if a string contains a specified regular expression as a
   * substring.
   *
   * ```typescript
   * // Check if the 'description' field contains "example" (case-insensitive)
   * field("description").regexContains("(?i)example");
   * ```
   *
   * @param pattern The regular expression to use for the search.
   * @return A new `Expr` representing the 'contains' comparison.
   */
  regexContains(pattern: string): BooleanExpression;

  /**
   * Creates an expression that checks if a string contains a specified regular expression as a
   * substring.
   *
   * ```typescript
   * // Check if the 'description' field contains the regular expression stored in field 'regex'
   * field("description").regexContains(field("regex"));
   * ```
   *
   * @param pattern The regular expression to use for the search.
   * @return A new `Expr` representing the 'contains' comparison.
   */
  regexContains(pattern: Expression): BooleanExpression;
  regexContains(stringOrExpr: string | Expression): BooleanExpression {
    return new BooleanExpression(
      'regex_contains',
      [this, valueToDefaultExpr(stringOrExpr)],
      'regexContains'
    );
  }

  /**
   * Creates an expression that checks if a string matches a specified regular expression.
   *
   * ```typescript
   * // Check if the 'email' field matches a valid email pattern
   * field("email").regexMatch("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
   * ```
   *
   * @param pattern The regular expression to use for the match.
   * @return A new `Expr` representing the regular expression match.
   */
  regexMatch(pattern: string): BooleanExpression;

  /**
   * Creates an expression that checks if a string matches a specified regular expression.
   *
   * ```typescript
   * // Check if the 'email' field matches a regular expression stored in field 'regex'
   * field("email").regexMatch(field("regex"));
   * ```
   *
   * @param pattern The regular expression to use for the match.
   * @return A new `Expr` representing the regular expression match.
   */
  regexMatch(pattern: Expression): BooleanExpression;
  regexMatch(stringOrExpr: string | Expression): BooleanExpression {
    return new BooleanExpression(
      'regex_match',
      [this, valueToDefaultExpr(stringOrExpr)],
      'regexMatch'
    );
  }

  /**
   * Creates an expression that checks if a string contains a specified substring.
   *
   * ```typescript
   * // Check if the 'description' field contains "example".
   * field("description").stringContains("example");
   * ```
   *
   * @param substring The substring to search for.
   * @return A new `Expr` representing the 'contains' comparison.
   */
  stringContains(substring: string): BooleanExpression;

  /**
   * Creates an expression that checks if a string contains the string represented by another expression.
   *
   * ```typescript
   * // Check if the 'description' field contains the value of the 'keyword' field.
   * field("description").stringContains(field("keyword"));
   * ```
   *
   * @param expr The expression representing the substring to search for.
   * @return A new `Expr` representing the 'contains' comparison.
   */
  stringContains(expr: Expression): BooleanExpression;
  stringContains(stringOrExpr: string | Expression): BooleanExpression {
    return new BooleanExpression(
      'string_contains',
      [this, valueToDefaultExpr(stringOrExpr)],
      'stringContains'
    );
  }

  /**
   * Creates an expression that checks if a string starts with a given prefix.
   *
   * ```typescript
   * // Check if the 'name' field starts with "Mr."
   * field("name").startsWith("Mr.");
   * ```
   *
   * @param prefix The prefix to check for.
   * @return A new `Expr` representing the 'starts with' comparison.
   */
  startsWith(prefix: string): BooleanExpression;

  /**
   * Creates an expression that checks if a string starts with a given prefix (represented as an
   * expression).
   *
   * ```typescript
   * // Check if the 'fullName' field starts with the value of the 'firstName' field
   * field("fullName").startsWith(field("firstName"));
   * ```
   *
   * @param prefix The prefix expression to check for.
   * @return A new `Expr` representing the 'starts with' comparison.
   */
  startsWith(prefix: Expression): BooleanExpression;
  startsWith(stringOrExpr: string | Expression): BooleanExpression {
    return new BooleanExpression(
      'starts_with',
      [this, valueToDefaultExpr(stringOrExpr)],
      'startsWith'
    );
  }

  /**
   * Creates an expression that checks if a string ends with a given postfix.
   *
   * ```typescript
   * // Check if the 'filename' field ends with ".txt"
   * field("filename").endsWith(".txt");
   * ```
   *
   * @param suffix The postfix to check for.
   * @return A new `Expr` representing the 'ends with' comparison.
   */
  endsWith(suffix: string): BooleanExpression;

  /**
   * Creates an expression that checks if a string ends with a given postfix (represented as an
   * expression).
   *
   * ```typescript
   * // Check if the 'url' field ends with the value of the 'extension' field
   * field("url").endsWith(field("extension"));
   * ```
   *
   * @param suffix The postfix expression to check for.
   * @return A new `Expr` representing the 'ends with' comparison.
   */
  endsWith(suffix: Expression): BooleanExpression;
  endsWith(stringOrExpr: string | Expression): BooleanExpression {
    return new BooleanExpression(
      'ends_with',
      [this, valueToDefaultExpr(stringOrExpr)],
      'endsWith'
    );
  }

  /**
   * Creates an expression that converts a string to lowercase.
   *
   * ```typescript
   * // Convert the 'name' field to lowercase
   * field("name").toLower();
   * ```
   *
   * @return A new `Expr` representing the lowercase string.
   */
  toLower(): FunctionExpression {
    return new FunctionExpression('to_lower', [this], 'toLower');
  }

  /**
   * Creates an expression that converts a string to uppercase.
   *
   * ```typescript
   * // Convert the 'title' field to uppercase
   * field("title").toUpper();
   * ```
   *
   * @return A new `Expr` representing the uppercase string.
   */
  toUpper(): FunctionExpression {
    return new FunctionExpression('to_upper', [this], 'toUpper');
  }

  /**
   * Creates an expression that removes leading and trailing whitespace from a string.
   *
   * ```typescript
   * // Trim whitespace from the 'userInput' field
   * field("userInput").trim();
   * ```
   *
   * @return A new `Expr` representing the trimmed string.
   */
  trim(): FunctionExpression {
    return new FunctionExpression('trim', [this], 'trim');
  }

  /**
   * Creates an expression that concatenates string expressions together.
   *
   * ```typescript
   * // Combine the 'firstName', " ", and 'lastName' fields into a single string
   * field("firstName").stringConcat(constant(" "), field("lastName"));
   * ```
   *
   * @param secondString The additional expression or string literal to concatenate.
   * @param otherStrings Optional additional expressions or string literals to concatenate.
   * @return A new `Expr` representing the concatenated string.
   */
  stringConcat(
    secondString: Expression | string,
    ...otherStrings: Array<Expression | string>
  ): FunctionExpression {
    const elements = [secondString, ...otherStrings];
    const exprs = elements.map(valueToDefaultExpr);
    return new FunctionExpression(
      'string_concat',
      [this, ...exprs],
      'stringConcat'
    );
  }

  /**
   * Creates an expression that reverses this string expression.
   *
   * ```typescript
   * // Reverse the value of the 'myString' field.
   * field("myString").reverse();
   * ```
   *
   * @return A new {@code Expr} representing the reversed string.
   */
  reverse(): FunctionExpression {
    return new FunctionExpression('reverse', [this], 'reverse');
  }

  /**
   * Creates an expression that calculates the length of this string expression in bytes.
   *
   * ```typescript
   * // Calculate the length of the 'myString' field in bytes.
   * field("myString").byteLength();
   * ```
   *
   * @return A new {@code Expr} representing the length of the string in bytes.
   */
  byteLength(): FunctionExpression {
    return new FunctionExpression('byte_length', [this], 'byteLength');
  }

  /**
   * Creates an expression that computes the ceiling of a numeric value.
   *
   * ```typescript
   * // Compute the ceiling of the 'price' field.
   * field("price").ceil();
   * ```
   *
   * @return A new {@code Expr} representing the ceiling of the numeric value.
   */
  ceil(): FunctionExpression {
    return new FunctionExpression('ceil', [this]);
  }

  /**
   * Creates an expression that computes the floor of a numeric value.
   *
   * ```typescript
   * // Compute the floor of the 'price' field.
   * field("price").floor();
   * ```
   *
   * @return A new {@code Expr} representing the floor of the numeric value.
   */
  floor(): FunctionExpression {
    return new FunctionExpression('floor', [this]);
  }

  /**
   * Creates an expression that computes e to the power of this expression.
   *
   * ```typescript
   * // Compute e to the power of the 'value' field.
   * field("value").exp();
   * ```
   *
   * @return A new {@code Expr} representing the exp of the numeric value.
   */
  exp(): FunctionExpression {
    return new FunctionExpression('exp', [this]);
  }

  /**
   * Accesses a value from a map (object) field using the provided key.
   *
   * ```typescript
   * // Get the 'city' value from the 'address' map field
   * field("address").mapGet("city");
   * ```
   *
   * @param subfield The key to access in the map.
   * @return A new `Expr` representing the value associated with the given key in the map.
   */
  mapGet(subfield: string): FunctionExpression {
    return new FunctionExpression(
      'map_get',
      [this, constant(subfield)],
      'mapGet'
    );
  }

  /**
   * Creates an aggregation that counts the number of stage inputs with valid evaluations of the
   * expression or field.
   *
   * ```typescript
   * // Count the total number of products
   * field("productId").count().as("totalProducts");
   * ```
   *
   * @return A new `AggregateFunction` representing the 'count' aggregation.
   */
  count(): AggregateFunction {
    return new AggregateFunction('count', [this], 'count');
  }

  /**
   * Creates an aggregation that calculates the sum of a numeric field across multiple stage inputs.
   *
   * ```typescript
   * // Calculate the total revenue from a set of orders
   * field("orderAmount").sum().as("totalRevenue");
   * ```
   *
   * @return A new `AggregateFunction` representing the 'sum' aggregation.
   */
  sum(): AggregateFunction {
    return new AggregateFunction('sum', [this], 'sum');
  }

  /**
   * Creates an aggregation that calculates the average (mean) of a numeric field across multiple
   * stage inputs.
   *
   * ```typescript
   * // Calculate the average age of users
   * field("age").average().as("averageAge");
   * ```
   *
   * @return A new `AggregateFunction` representing the 'average' aggregation.
   */
  average(): AggregateFunction {
    return new AggregateFunction('average', [this], 'average');
  }

  /**
   * Creates an aggregation that finds the minimum value of a field across multiple stage inputs.
   *
   * ```typescript
   * // Find the lowest price of all products
   * field("price").minimum().as("lowestPrice");
   * ```
   *
   * @return A new `AggregateFunction` representing the 'minimum' aggregation.
   */
  minimum(): AggregateFunction {
    return new AggregateFunction('minimum', [this], 'minimum');
  }

  /**
   * Creates an aggregation that finds the maximum value of a field across multiple stage inputs.
   *
   * ```typescript
   * // Find the highest score in a leaderboard
   * field("score").maximum().as("highestScore");
   * ```
   *
   * @return A new `AggregateFunction` representing the 'maximum' aggregation.
   */
  maximum(): AggregateFunction {
    return new AggregateFunction('maximum', [this], 'maximum');
  }

  /**
   * Creates an aggregation that counts the number of distinct values of the expression or field.
   *
   * ```typescript
   * // Count the distinct number of products
   * field("productId").countDistinct().as("distinctProducts");
   * ```
   *
   * @return A new `AggregateFunction` representing the 'count_distinct' aggregation.
   */
  countDistinct(): AggregateFunction {
    return new AggregateFunction('count_distinct', [this], 'countDistinct');
  }

  /**
   * Creates an expression that returns the larger value between this expression and another expression, based on Firestore's value type ordering.
   *
   * ```typescript
   * // Returns the larger value between the 'timestamp' field and the current timestamp.
   * field("timestamp").logicalMaximum(Function.currentTimestamp());
   * ```
   *
   * @param second The second expression or literal to compare with.
   * @param others Optional additional expressions or literals to compare with.
   * @return A new {@code Expr} representing the logical maximum operation.
   */
  logicalMaximum(
    second: Expression | unknown,
    ...others: Array<Expression | unknown>
  ): FunctionExpression {
    const values = [second, ...others];
    return new FunctionExpression(
      'maximum',
      [this, ...values.map(valueToDefaultExpr)],
      'logicalMaximum'
    );
  }

  /**
   * Creates an expression that returns the smaller value between this expression and another expression, based on Firestore's value type ordering.
   *
   * ```typescript
   * // Returns the smaller value between the 'timestamp' field and the current timestamp.
   * field("timestamp").logicalMinimum(Function.currentTimestamp());
   * ```
   *
   * @param second The second expression or literal to compare with.
   * @param others Optional additional expressions or literals to compare with.
   * @return A new {@code Expr} representing the logical minimum operation.
   */
  logicalMinimum(
    second: Expression | unknown,
    ...others: Array<Expression | unknown>
  ): FunctionExpression {
    const values = [second, ...others];
    return new FunctionExpression(
      'minimum',
      [this, ...values.map(valueToDefaultExpr)],
      'minimum'
    );
  }

  /**
   * Creates an expression that calculates the length (number of dimensions) of this Firestore Vector expression.
   *
   * ```typescript
   * // Get the vector length (dimension) of the field 'embedding'.
   * field("embedding").vectorLength();
   * ```
   *
   * @return A new {@code Expr} representing the length of the vector.
   */
  vectorLength(): FunctionExpression {
    return new FunctionExpression('vector_length', [this], 'vectorLength');
  }

  /**
   * Calculates the cosine distance between two vectors.
   *
   * ```typescript
   * // Calculate the cosine distance between the 'userVector' field and the 'itemVector' field
   * field("userVector").cosineDistance(field("itemVector"));
   * ```
   *
   * @param vectorExpression The other vector (represented as an Expr) to compare against.
   * @return A new `Expr` representing the cosine distance between the two vectors.
   */
  cosineDistance(vectorExpression: Expression): FunctionExpression;
  /**
   * Calculates the Cosine distance between two vectors.
   *
   * ```typescript
   * // Calculate the Cosine distance between the 'location' field and a target location
   * field("location").cosineDistance(new VectorValue([37.7749, -122.4194]));
   * ```
   *
   * @param vector The other vector (as a VectorValue) to compare against.
   * @return A new `Expr` representing the Cosine* distance between the two vectors.
   */
  cosineDistance(vector: VectorValue | number[]): FunctionExpression;
  cosineDistance(
    other: Expression | VectorValue | number[]
  ): FunctionExpression {
    return new FunctionExpression(
      'cosine_distance',
      [this, vectorToExpr(other)],
      'cosineDistance'
    );
  }

  /**
   * Calculates the dot product between two vectors.
   *
   * ```typescript
   * // Calculate the dot product between a feature vector and a target vector
   * field("features").dotProduct([0.5, 0.8, 0.2]);
   * ```
   *
   * @param vectorExpression The other vector (as an array of numbers) to calculate with.
   * @return A new `Expr` representing the dot product between the two vectors.
   */
  dotProduct(vectorExpression: Expression): FunctionExpression;

  /**
   * Calculates the dot product between two vectors.
   *
   * ```typescript
   * // Calculate the dot product between a feature vector and a target vector
   * field("features").dotProduct(new VectorValue([0.5, 0.8, 0.2]));
   * ```
   *
   * @param vector The other vector (as an array of numbers) to calculate with.
   * @return A new `Expr` representing the dot product between the two vectors.
   */
  dotProduct(vector: VectorValue | number[]): FunctionExpression;
  dotProduct(other: Expression | VectorValue | number[]): FunctionExpression {
    return new FunctionExpression(
      'dot_product',
      [this, vectorToExpr(other)],
      'dotProduct'
    );
  }

  /**
   * Calculates the Euclidean distance between two vectors.
   *
   * ```typescript
   * // Calculate the Euclidean distance between the 'location' field and a target location
   * field("location").euclideanDistance([37.7749, -122.4194]);
   * ```
   *
   * @param vectorExpression The other vector (as an array of numbers) to calculate with.
   * @return A new `Expr` representing the Euclidean distance between the two vectors.
   */
  euclideanDistance(vectorExpression: Expression): FunctionExpression;

  /**
   * Calculates the Euclidean distance between two vectors.
   *
   * ```typescript
   * // Calculate the Euclidean distance between the 'location' field and a target location
   * field("location").euclideanDistance(new VectorValue([37.7749, -122.4194]));
   * ```
   *
   * @param vector The other vector (as a VectorValue) to compare against.
   * @return A new `Expr` representing the Euclidean distance between the two vectors.
   */
  euclideanDistance(vector: VectorValue | number[]): FunctionExpression;
  euclideanDistance(
    other: Expression | VectorValue | number[]
  ): FunctionExpression {
    return new FunctionExpression(
      'euclidean_distance',
      [this, vectorToExpr(other)],
      'euclideanDistance'
    );
  }

  /**
   * Creates an expression that interprets this expression as the number of microseconds since the Unix epoch (1970-01-01 00:00:00 UTC)
   * and returns a timestamp.
   *
   * ```typescript
   * // Interpret the 'microseconds' field as microseconds since epoch.
   * field("microseconds").unixMicrosToTimestamp();
   * ```
   *
   * @return A new {@code Expr} representing the timestamp.
   */
  unixMicrosToTimestamp(): FunctionExpression {
    return new FunctionExpression(
      'unix_micros_to_timestamp',
      [this],
      'unixMicrosToTimestamp'
    );
  }

  /**
   * Creates an expression that converts this timestamp expression to the number of microseconds since the Unix epoch (1970-01-01 00:00:00 UTC).
   *
   * ```typescript
   * // Convert the 'timestamp' field to microseconds since epoch.
   * field("timestamp").timestampToUnixMicros();
   * ```
   *
   * @return A new {@code Expr} representing the number of microseconds since epoch.
   */
  timestampToUnixMicros(): FunctionExpression {
    return new FunctionExpression(
      'timestamp_to_unix_micros',
      [this],
      'timestampToUnixMicros'
    );
  }

  /**
   * Creates an expression that interprets this expression as the number of milliseconds since the Unix epoch (1970-01-01 00:00:00 UTC)
   * and returns a timestamp.
   *
   * ```typescript
   * // Interpret the 'milliseconds' field as milliseconds since epoch.
   * field("milliseconds").unixMillisToTimestamp();
   * ```
   *
   * @return A new {@code Expr} representing the timestamp.
   */
  unixMillisToTimestamp(): FunctionExpression {
    return new FunctionExpression(
      'unix_millis_to_timestamp',
      [this],
      'unixMillisToTimestamp'
    );
  }

  /**
   * Creates an expression that converts this timestamp expression to the number of milliseconds since the Unix epoch (1970-01-01 00:00:00 UTC).
   *
   * ```typescript
   * // Convert the 'timestamp' field to milliseconds since epoch.
   * field("timestamp").timestampToUnixMillis();
   * ```
   *
   * @return A new {@code Expr} representing the number of milliseconds since epoch.
   */
  timestampToUnixMillis(): FunctionExpression {
    return new FunctionExpression(
      'timestamp_to_unix_millis',
      [this],
      'timestampToUnixMillis'
    );
  }

  /**
   * Creates an expression that interprets this expression as the number of seconds since the Unix epoch (1970-01-01 00:00:00 UTC)
   * and returns a timestamp.
   *
   * ```typescript
   * // Interpret the 'seconds' field as seconds since epoch.
   * field("seconds").unixSecondsToTimestamp();
   * ```
   *
   * @return A new {@code Expr} representing the timestamp.
   */
  unixSecondsToTimestamp(): FunctionExpression {
    return new FunctionExpression(
      'unix_seconds_to_timestamp',
      [this],
      'unixSecondsToTimestamp'
    );
  }

  /**
   * Creates an expression that converts this timestamp expression to the number of seconds since the Unix epoch (1970-01-01 00:00:00 UTC).
   *
   * ```typescript
   * // Convert the 'timestamp' field to seconds since epoch.
   * field("timestamp").timestampToUnixSeconds();
   * ```
   *
   * @return A new {@code Expr} representing the number of seconds since epoch.
   */
  timestampToUnixSeconds(): FunctionExpression {
    return new FunctionExpression(
      'timestamp_to_unix_seconds',
      [this],
      'timestampToUnixSeconds'
    );
  }

  /**
   * Creates an expression that adds a specified amount of time to this timestamp expression.
   *
   * ```typescript
   * // Add some duration determined by field 'unit' and 'amount' to the 'timestamp' field.
   * field("timestamp").timestampAdd(field("unit"), field("amount"));
   * ```
   *
   * @param unit The expression evaluates to unit of time, must be one of 'microsecond', 'millisecond', 'second', 'minute', 'hour', 'day'.
   * @param amount The expression evaluates to amount of the unit.
   * @return A new {@code Expr} representing the resulting timestamp.
   */
  timestampAdd(unit: Expression, amount: Expression): FunctionExpression;

  /**
   * Creates an expression that adds a specified amount of time to this timestamp expression.
   *
   * ```typescript
   * // Add 1 day to the 'timestamp' field.
   * field("timestamp").timestampAdd("day", 1);
   * ```
   *
   * @param unit The unit of time to add (e.g., "day", "hour").
   * @param amount The amount of time to add.
   * @return A new {@code Expr} representing the resulting timestamp.
   */
  timestampAdd(
    unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
    amount: number
  ): FunctionExpression;
  timestampAdd(
    unit:
      | Expression
      | 'microsecond'
      | 'millisecond'
      | 'second'
      | 'minute'
      | 'hour'
      | 'day',
    amount: Expression | number
  ): FunctionExpression {
    return new FunctionExpression(
      'timestamp_add',
      [this, valueToDefaultExpr(unit), valueToDefaultExpr(amount)],
      'timestampAdd'
    );
  }

  /**
   * Creates an expression that subtracts a specified amount of time from this timestamp expression.
   *
   * ```typescript
   * // Subtract some duration determined by field 'unit' and 'amount' from the 'timestamp' field.
   * field("timestamp").timestampSubtract(field("unit"), field("amount"));
   * ```
   *
   * @param unit The expression evaluates to unit of time, must be one of 'microsecond', 'millisecond', 'second', 'minute', 'hour', 'day'.
   * @param amount The expression evaluates to amount of the unit.
   * @return A new {@code Expr} representing the resulting timestamp.
   */
  timestampSubtract(unit: Expression, amount: Expression): FunctionExpression;

  /**
   * Creates an expression that subtracts a specified amount of time from this timestamp expression.
   *
   * ```typescript
   * // Subtract 1 day from the 'timestamp' field.
   * field("timestamp").timestampSubtract("day", 1);
   * ```
   *
   * @param unit The unit of time to subtract (e.g., "day", "hour").
   * @param amount The amount of time to subtract.
   * @return A new {@code Expr} representing the resulting timestamp.
   */
  timestampSubtract(
    unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
    amount: number
  ): FunctionExpression;
  timestampSubtract(
    unit:
      | Expression
      | 'microsecond'
      | 'millisecond'
      | 'second'
      | 'minute'
      | 'hour'
      | 'day',
    amount: Expression | number
  ): FunctionExpression {
    return new FunctionExpression(
      'timestamp_subtract',
      [this, valueToDefaultExpr(unit), valueToDefaultExpr(amount)],
      'timestampSubtract'
    );
  }

  /**
   * @beta
   *
   * Creates an expression that returns the document ID from a path.
   *
   * ```typescript
   * // Get the document ID from a path.
   * field("__path__").documentId();
   * ```
   *
   * @return A new {@code Expr} representing the documentId operation.
   */
  documentId(): FunctionExpression {
    return new FunctionExpression('document_id', [this], 'documentId');
  }

  /**
   * @beta
   *
   * Creates an expression that returns a substring of the results of this expression.
   *
   * @param position Index of the first character of the substring.
   * @param length Length of the substring. If not provided, the substring will
   * end at the end of the input.
   */
  substring(position: number, length?: number): FunctionExpression;

  /**
   * @beta
   *
   * Creates an expression that returns a substring of the results of this expression.
   *
   * @param position An expression returning the index of the first character of the substring.
   * @param length An expression returning the length of the substring. If not provided the
   * substring will end at the end of the input.
   */
  substring(position: Expression, length?: Expression): FunctionExpression;
  substring(
    position: Expression | number,
    length?: Expression | number
  ): FunctionExpression {
    const positionExpr = valueToDefaultExpr(position);
    if (length === undefined) {
      return new FunctionExpression(
        'substring',
        [this, positionExpr],
        'substring'
      );
    } else {
      return new FunctionExpression(
        'substring',
        [this, positionExpr, valueToDefaultExpr(length)],
        'substring'
      );
    }
  }

  /**
   * @beta
   * Creates an expression that indexes into an array from the beginning or end
   * and returns the element. If the offset exceeds the array length, an error is
   * returned. A negative offset, starts from the end.
   *
   * ```typescript
   * // Return the value in the 'tags' field array at index `1`.
   * field('tags').arrayGet(1);
   * ```
   *
   * @param offset The index of the element to return.
   * @return A new Expr representing the 'arrayGet' operation.
   */
  arrayGet(offset: number): FunctionExpression;

  /**
   * @beta
   * Creates an expression that indexes into an array from the beginning or end
   * and returns the element. If the offset exceeds the array length, an error is
   * returned. A negative offset, starts from the end.
   *
   * ```typescript
   * // Return the value in the tags field array at index specified by field
   * // 'favoriteTag'.
   * field('tags').arrayGet(field('favoriteTag'));
   * ```
   *
   * @param offsetExpr An Expr evaluating to the index of the element to return.
   * @return A new Expr representing the 'arrayGet' operation.
   */
  arrayGet(offsetExpr: Expression): FunctionExpression;
  arrayGet(offset: Expression | number): FunctionExpression {
    return new FunctionExpression(
      'array_get',
      [this, valueToDefaultExpr(offset)],
      'arrayGet'
    );
  }

  /**
   * @beta
   *
   * Creates an expression that checks if a given expression produces an error.
   *
   * ```typescript
   * // Check if the result of a calculation is an error
   * field("title").arrayContains(1).isError();
   * ```
   *
   * @return A new {@code BooleanExpr} representing the 'isError' check.
   */
  isError(): BooleanExpression {
    return new BooleanExpression('is_error', [this], 'isError');
  }

  /**
   * @beta
   *
   * Creates an expression that returns the result of the `catchExpr` argument
   * if there is an error, else return the result of this expression.
   *
   * ```typescript
   * // Returns the first item in the title field arrays, or returns
   * // the entire title field if the array is empty or the field is another type.
   * field("title").arrayGet(0).ifError(field("title"));
   * ```
   *
   * @param catchExpr The catch expression that will be evaluated and
   * returned if this expression produces an error.
   * @return A new {@code Expr} representing the 'ifError' operation.
   */
  ifError(catchExpr: Expression): FunctionExpression;

  /**
   * @beta
   *
   * Creates an expression that returns the `catch` argument if there is an
   * error, else return the result of this expression.
   *
   * ```typescript
   * // Returns the first item in the title field arrays, or returns
   * // "Default Title"
   * field("title").arrayGet(0).ifError("Default Title");
   * ```
   *
   * @param catchValue The value that will be returned if this expression
   * produces an error.
   * @return A new {@code Expr} representing the 'ifError' operation.
   */
  ifError(catchValue: unknown): FunctionExpression;
  ifError(catchValue: unknown): FunctionExpression {
    return new FunctionExpression(
      'if_error',
      [this, valueToDefaultExpr(catchValue)],
      'ifError'
    );
  }

  /**
   * @beta
   *
   * Creates an expression that returns `true` if the result of this expression
   * is absent. Otherwise, returns `false` even if the value is `null`.
   *
   * ```typescript
   * // Check if the field `value` is absent.
   * field("value").isAbsent();
   * ```
   *
   * @return A new {@code BooleanExpr} representing the 'isAbsent' check.
   */
  isAbsent(): BooleanExpression {
    return new BooleanExpression('is_absent', [this], 'isAbsent');
  }

  /**
   * @beta
   *
   * Creates an expression that checks if tbe result of an expression is not null.
   *
   * ```typescript
   * // Check if the value of the 'name' field is not null
   * field("name").isNotNull();
   * ```
   *
   * @return A new {@code BooleanExpr} representing the 'isNotNull' check.
   */
  isNotNull(): BooleanExpression {
    return new BooleanExpression('is_not_null', [this], 'isNotNull');
  }

  /**
   * @beta
   *
   * Creates an expression that checks if the results of this expression is NOT 'NaN' (Not a Number).
   *
   * ```typescript
   * // Check if the result of a calculation is NOT NaN
   * field("value").divide(0).isNotNan();
   * ```
   *
   * @return A new {@code Expr} representing the 'isNaN' check.
   */
  isNotNan(): BooleanExpression {
    return new BooleanExpression('is_not_nan', [this], 'isNotNan');
  }

  /**
   * @beta
   *
   * Creates an expression that removes a key from the map produced by evaluating this expression.
   *
   * ```
   * // Removes the key 'baz' from the input map.
   * map({foo: 'bar', baz: true}).mapRemove('baz');
   * ```
   *
   * @param key The name of the key to remove from the input map.
   * @returns A new {@code FirestoreFunction} representing the 'mapRemove' operation.
   */
  mapRemove(key: string): FunctionExpression;
  /**
   * @beta
   *
   * Creates an expression that removes a key from the map produced by evaluating this expression.
   *
   * ```
   * // Removes the key 'baz' from the input map.
   * map({foo: 'bar', baz: true}).mapRemove(constant('baz'));
   * ```
   *
   * @param keyExpr An expression that produces the name of the key to remove from the input map.
   * @returns A new {@code FirestoreFunction} representing the 'mapRemove' operation.
   */
  mapRemove(keyExpr: Expression): FunctionExpression;
  mapRemove(stringExpr: Expression | string): FunctionExpression {
    return new FunctionExpression(
      'map_remove',
      [this, valueToDefaultExpr(stringExpr)],
      'mapRemove'
    );
  }

  /**
   * @beta
   *
   * Creates an expression that merges multiple map values.
   *
   * ```
   * // Merges the map in the settings field with, a map literal, and a map in
   * // that is conditionally returned by another expression
   * field('settings').mapMerge({ enabled: true }, conditional(field('isAdmin'), { admin: true}, {})
   * ```
   *
   * @param secondMap A required second map to merge. Represented as a literal or
   * an expression that returns a map.
   * @param otherMaps Optional additional maps to merge. Each map is represented
   * as a literal or an expression that returns a map.
   *
   * @returns A new {@code FirestoreFunction} representing the 'mapMerge' operation.
   */
  mapMerge(
    secondMap: Record<string, unknown> | Expression,
    ...otherMaps: Array<Record<string, unknown> | Expression>
  ): FunctionExpression {
    const secondMapExpr = valueToDefaultExpr(secondMap);
    const otherMapExprs = otherMaps.map(valueToDefaultExpr);
    return new FunctionExpression(
      'map_merge',
      [this, secondMapExpr, ...otherMapExprs],
      'mapMerge'
    );
  }

  /**
   * Creates an expression that returns the value of this expression raised to the power of another expression.
   *
   * ```typescript
   * // Raise the value of the 'base' field to the power of the 'exponent' field.
   * field("base").pow(field("exponent"));
   * ```
   *
   * @param exponent The expression to raise this expression to the power of.
   * @return A new `Expr` representing the power operation.
   */
  pow(exponent: Expression): FunctionExpression;

  /**
   * Creates an expression that returns the value of this expression raised to the power of a constant value.
   *
   * ```typescript
   * // Raise the value of the 'base' field to the power of 2.
   * field("base").pow(2);
   * ```
   *
   * @param exponent The constant value to raise this expression to the power of.
   * @return A new `Expr` representing the power operation.
   */
  pow(exponent: number): FunctionExpression;
  pow(exponent: number | Expression): FunctionExpression {
    return new FunctionExpression('pow', [this, valueToDefaultExpr(exponent)]);
  }

  /**
   * Creates an expression that rounds a numeric value to the nearest whole number.
   *
   * ```typescript
   * // Round the value of the 'price' field.
   * field("price").round();
   * ```
   *
   * @return A new `Expr` representing the rounded value.
   */
  round(): FunctionExpression {
    return new FunctionExpression('round', [this]);
  }

  /**
   * Creates an expression that returns the collection ID from a path.
   *
   * ```typescript
   * // Get the collection ID from a path.
   * field("__path__").collectionId();
   * ```
   *
   * @return A new {@code Expr} representing the collectionId operation.
   */
  collectionId(): FunctionExpression {
    return new FunctionExpression('collection_id', [this]);
  }

  /**
   * Creates an expression that calculates the length of a string, array, map, vector, or bytes.
   *
   * ```typescript
   * // Get the length of the 'name' field.
   * field("name").length();
   *
   * // Get the number of items in the 'cart' array.
   * field("cart").length();
   * ```
   *
   * @return A new `Expr` representing the length of the string, array, map, vector, or bytes.
   */
  length(): FunctionExpression {
    return new FunctionExpression('length', [this]);
  }

  /**
   * Creates an expression that computes the natural logarithm of a numeric value.
   *
   * ```typescript
   * // Compute the natural logarithm of the 'value' field.
   * field("value").ln();
   * ```
   *
   * @return A new {@code Expr} representing the natural logarithm of the numeric value.
   */
  ln(): FunctionExpression {
    return new FunctionExpression('ln', [this]);
  }

  /**
   * Creates an expression that computes the logarithm of this expression to a given base.
   *
   * ```typescript
   * // Compute the logarithm of the 'value' field with base 10.
   * field("value").log(10);
   * ```
   *
   * @param base The base of the logarithm.
   * @return A new {@code Expr} representing the logarithm of the numeric value.
   */
  log(base: number): FunctionExpression;

  /**
   * Creates an expression that computes the logarithm of this expression to a given base.
   *
   * ```typescript
   * // Compute the logarithm of the 'value' field with the base in the 'base' field.
   * field("value").log(field("base"));
   * ```
   *
   * @param base The base of the logarithm.
   * @return A new {@code Expr} representing the logarithm of the numeric value.
   */
  log(base: Expression): FunctionExpression;
  log(base: number | Expression): FunctionExpression {
    return new FunctionExpression('log', [this, valueToDefaultExpr(base)]);
  }

  /**
   * Creates an expression that computes the square root of a numeric value.
   *
   * ```typescript
   * // Compute the square root of the 'value' field.
   * field("value").sqrt();
   * ```
   *
   * @return A new {@code Expr} representing the square root of the numeric value.
   */
  sqrt(): FunctionExpression {
    return new FunctionExpression('sqrt', [this]);
  }

  /**
   * Creates an expression that reverses a string.
   *
   * ```typescript
   * // Reverse the value of the 'myString' field.
   * field("myString").stringReverse();
   * ```
   *
   * @return A new {@code Expr} representing the reversed string.
   */
  stringReverse(): FunctionExpression {
    return new FunctionExpression('string_reverse', [this]);
  }

  // TODO(new-expression): Add new expression method definitions above this line

  /**
   * Creates an {@link Ordering} that sorts documents in ascending order based on this expression.
   *
   * ```typescript
   * // Sort documents by the 'name' field in ascending order
   * pipeline().collection("users")
   *   .sort(field("name").ascending());
   * ```
   *
   * @return A new `Ordering` for ascending sorting.
   */
  ascending(): Ordering {
    return ascending(this);
  }

  /**
   * Creates an {@link Ordering} that sorts documents in descending order based on this expression.
   *
   * ```typescript
   * // Sort documents by the 'createdAt' field in descending order
   * firestore.pipeline().collection("users")
   *   .sort(field("createdAt").descending());
   * ```
   *
   * @return A new `Ordering` for descending sorting.
   */
  descending(): Ordering {
    return descending(this);
  }

  /**
   * Assigns an alias to this expression.
   *
   * Aliases are useful for renaming fields in the output of a stage or for giving meaningful
   * names to calculated values.
   *
   * ```typescript
   * // Calculate the total price and assign it the alias "totalPrice" and add it to the output.
   * firestore.pipeline().collection("items")
   *   .addFields(field("price").multiply(field("quantity")).as("totalPrice"));
   * ```
   *
   * @param name The alias to assign to this expression.
   * @return A new {@link AliasedExpression} that wraps this
   *     expression and associates it with the provided alias.
   */
  as(name: string): AliasedExpression {
    return new AliasedExpression(this, name, 'as');
  }
}

/**
 * @beta
 *
 * An interface that represents a selectable expression.
 */
export interface Selectable {
  selectable: true;
  /**
   * @private
   * @internal
   */
  readonly alias: string;
  /**
   * @private
   * @internal
   */
  readonly expr: Expression;
}

/**
 * @beta
 *
 * A class that represents an aggregate function.
 */
export class AggregateFunction implements ProtoValueSerializable, UserData {
  exprType: ExpressionType = 'AggregateFunction';

  constructor(name: string, params: Expression[]);
  /**
   * INTERNAL Constructor with method name for validation.
   * @hideconstructor
   * @param name
   * @param params
   * @param _methodName
   */
  constructor(
    name: string,
    params: Expression[],
    _methodName: string | undefined
  );
  constructor(
    private name: string,
    private params: Expression[],
    readonly _methodName?: string
  ) {}

  /**
   * Assigns an alias to this AggregateFunction. The alias specifies the name that
   * the aggregated value will have in the output document.
   *
   * ```typescript
   * // Calculate the average price of all items and assign it the alias "averagePrice".
   * firestore.pipeline().collection("items")
   *   .aggregate(field("price").average().as("averagePrice"));
   * ```
   *
   * @param name The alias to assign to this AggregateFunction.
   * @return A new {@link AggregateWithAlias} that wraps this
   *     AggregateFunction and associates it with the provided alias.
   */
  as(name: string): AggregateWithAlias {
    return new AggregateWithAlias(this, name, 'as');
  }

  /**
   * @private
   * @internal
   */
  _toProto(serializer: JsonProtoSerializer): ProtoValue {
    return {
      functionValue: {
        name: this.name,
        args: this.params.map(p => p._toProto(serializer))
      }
    };
  }

  _protoValueType = 'ProtoValue' as const;

  /**
   * @private
   * @internal
   */
  _readUserData(context: ParseContext): void {
    context = this._methodName
      ? context.contextWith({ methodName: this._methodName })
      : context;
    this.params.forEach(expr => {
      return expr._readUserData(context);
    });
  }
}

/**
 * @beta
 *
 * An AggregateFunction with alias.
 */
export class AggregateWithAlias implements UserData {
  constructor(
    readonly aggregate: AggregateFunction,
    readonly alias: string,
    readonly _methodName: string | undefined
  ) {}

  /**
   * @private
   * @internal
   */
  _readUserData(context: ParseContext): void {
    this.aggregate._readUserData(context);
  }
}

/**
 * @beta
 */
export class AliasedExpression implements Selectable, UserData {
  exprType: ExpressionType = 'AliasedExpression';
  selectable = true as const;

  constructor(
    readonly expr: Expression,
    readonly alias: string,
    readonly _methodName: string | undefined
  ) {}

  /**
   * @private
   * @internal
   */
  _readUserData(context: ParseContext): void {
    this.expr._readUserData(context);
  }
}

/**
 * @internal
 */
class ListOfExprs extends Expression implements UserData {
  expressionType: ExpressionType = 'ListOfExpressions';

  constructor(
    private exprs: Expression[],
    readonly _methodName: string | undefined
  ) {
    super();
  }

  /**
   * @private
   * @internal
   */
  _toProto(serializer: JsonProtoSerializer): ProtoValue {
    return {
      arrayValue: {
        values: this.exprs.map(p => p._toProto(serializer)!)
      }
    };
  }

  /**
   * @private
   * @internal
   */
  _readUserData(context: ParseContext): void {
    this.exprs.forEach((expr: Expression) => expr._readUserData(context));
  }
}

/**
 * @beta
 *
 * Represents a reference to a field in a Firestore document, or outputs of a {@link Pipeline} stage.
 *
 * <p>Field references are used to access document field values in expressions and to specify fields
 * for sorting, filtering, and projecting data in Firestore pipelines.
 *
 * <p>You can create a `Field` instance using the static {@link #of} method:
 *
 * ```typescript
 * // Create a Field instance for the 'name' field
 * const nameField = field("name");
 *
 * // Create a Field instance for a nested field 'address.city'
 * const cityField = field("address.city");
 * ```
 */
export class Field extends Expression implements Selectable {
  readonly expressionType: ExpressionType = 'Field';
  selectable = true as const;

  /**
   * @internal
   * @private
   * @hideconstructor
   * @param fieldPath
   */
  constructor(
    private fieldPath: InternalFieldPath,
    readonly _methodName: string | undefined
  ) {
    super();
  }

  get fieldName(): string {
    return this.fieldPath.canonicalString();
  }

  get alias(): string {
    return this.fieldName;
  }

  get expr(): Expression {
    return this;
  }

  /**
   * @private
   * @internal
   */
  _toProto(serializer: JsonProtoSerializer): ProtoValue {
    return {
      fieldReferenceValue: this.fieldPath.canonicalString()
    };
  }

  /**
   * @private
   * @internal
   */
  _readUserData(context: ParseContext): void {}
}

/**
 * Creates a {@code Field} instance representing the field at the given path.
 *
 * The path can be a simple field name (e.g., "name") or a dot-separated path to a nested field
 * (e.g., "address.city").
 *
 * ```typescript
 * // Create a Field instance for the 'title' field
 * const titleField = field("title");
 *
 * // Create a Field instance for a nested field 'author.firstName'
 * const authorFirstNameField = field("author.firstName");
 * ```
 *
 * @param name The path to the field.
 * @return A new {@code Field} instance representing the specified field.
 */
export function field(name: string): Field;
export function field(path: FieldPath): Field;
export function field(nameOrPath: string | FieldPath): Field {
  return _field(nameOrPath, 'field');
}

export function _field(
  nameOrPath: string | FieldPath,
  methodName: string | undefined
): Field {
  if (typeof nameOrPath === 'string') {
    if (DOCUMENT_KEY_NAME === nameOrPath) {
      return new Field(documentIdFieldPath()._internalPath, methodName);
    }
    return new Field(fieldPathFromArgument('field', nameOrPath), methodName);
  } else {
    return new Field(nameOrPath._internalPath, methodName);
  }
}

/**
 * @internal
 *
 * Represents a constant value that can be used in a Firestore pipeline expression.
 *
 * You can create a `Constant` instance using the static {@link #of} method:
 *
 * ```typescript
 * // Create a Constant instance for the number 10
 * const ten = constant(10);
 *
 * // Create a Constant instance for the string "hello"
 * const hello = constant("hello");
 * ```
 */
export class Constant extends Expression {
  readonly expressionType: ExpressionType = 'Constant';

  private _protoValue?: ProtoValue;

  /**
   * @private
   * @internal
   * @hideconstructor
   * @param value The value of the constant.
   */
  constructor(
    private value: unknown,
    readonly _methodName: string | undefined
  ) {
    super();
  }

  /**
   * @private
   * @internal
   */
  static _fromProto(value: ProtoValue): Constant {
    const result = new Constant(value, undefined);
    result._protoValue = value;
    return result;
  }

  /**
   * @private
   * @internal
   */
  _toProto(_: JsonProtoSerializer): ProtoValue {
    hardAssert(
      this._protoValue !== undefined,
      0x00ed,
      'Value of this constant has not been serialized to proto value'
    );
    return this._protoValue;
  }

  /**
   * @private
   * @internal
   */
  _readUserData(context: ParseContext): void {
    context = this._methodName
      ? context.contextWith({ methodName: this._methodName })
      : context;
    if (isFirestoreValue(this._protoValue)) {
      return;
    } else {
      this._protoValue = parseData(this.value, context)!;
    }
  }
}

/**
 * Creates a `Constant` instance for a number value.
 *
 * @param value The number value.
 * @return A new `Constant` instance.
 */
export function constant(value: number): Expression;

/**
 * Creates a `Constant` instance for a string value.
 *
 * @param value The string value.
 * @return A new `Constant` instance.
 */
export function constant(value: string): Expression;

/**
 * Creates a `BooleanExpression` instance for a boolean value.
 *
 * @param value The boolean value.
 * @return A new `Constant` instance.
 */
export function constant(value: boolean): BooleanExpression;

/**
 * Creates a `Constant` instance for a null value.
 *
 * @param value The null value.
 * @return A new `Constant` instance.
 */
export function constant(value: null): Expression;

/**
 * Creates a `Constant` instance for a GeoPoint value.
 *
 * @param value The GeoPoint value.
 * @return A new `Constant` instance.
 */
export function constant(value: GeoPoint): Expression;

/**
 * Creates a `Constant` instance for a Timestamp value.
 *
 * @param value The Timestamp value.
 * @return A new `Constant` instance.
 */
export function constant(value: Timestamp): Expression;

/**
 * Creates a `Constant` instance for a Date value.
 *
 * @param value The Date value.
 * @return A new `Constant` instance.
 */
export function constant(value: Date): Expression;

/**
 * Creates a `Constant` instance for a Bytes value.
 *
 * @param value The Bytes value.
 * @return A new `Constant` instance.
 */
export function constant(value: Bytes): Expression;

/**
 * Creates a `Constant` instance for a DocumentReference value.
 *
 * @param value The DocumentReference value.
 * @return A new `Constant` instance.
 */
export function constant(value: DocumentReference): Expression;

/**
 * Creates a `Constant` instance for a Firestore proto value.
 * For internal use only.
 * @private
 * @internal
 * @param value The Firestore proto value.
 * @return A new `Constant` instance.
 */
export function constant(value: ProtoValue): Expression;

/**
 * Creates a `Constant` instance for a VectorValue value.
 *
 * @param value The VectorValue value.
 * @return A new `Constant` instance.
 */
export function constant(value: VectorValue): Expression;

export function constant(value: unknown): Expression | BooleanExpression {
  return _constant(value, 'constant');
}

/**
 * @internal
 * @private
 * @param value
 * @param methodName
 */
export function _constant(
  value: unknown,
  methodName: string | undefined
): Constant | BooleanExpression {
  if (typeof value === 'boolean') {
    return new BooleanConstant(value, methodName);
  } else {
    return new Constant(value, methodName);
  }
}

/**
 * Internal only
 * @internal
 * @private
 */
export class MapValue extends Expression {
  constructor(
    private plainObject: Map<string, Expression>,
    readonly _methodName: string | undefined
  ) {
    super();
  }

  expressionType: ExpressionType = 'Constant';

  _readUserData(context: ParseContext): void {
    context = this._methodName
      ? context.contextWith({ methodName: this._methodName })
      : context;
    this.plainObject.forEach(expr => {
      expr._readUserData(context);
    });
  }

  _toProto(serializer: JsonProtoSerializer): ProtoValue {
    return toMapValue(serializer, this.plainObject);
  }
}

/**
 * @beta
 *
 * This class defines the base class for Firestore {@link Pipeline} functions, which can be evaluated within pipeline
 * execution.
 *
 * Typically, you would not use this class or its children directly. Use either the functions like {@link and}, {@link equal},
 * or the methods on {@link Expression} ({@link Expression#equal}, {@link Expression#lessThan}, etc.) to construct new Function instances.
 */
export class FunctionExpression extends Expression {
  readonly expressionType: ExpressionType = 'Function';

  constructor(name: string, params: Expression[]);
  constructor(
    name: string,
    params: Expression[],
    _methodName: string | undefined
  );
  constructor(
    private name: string,
    private params: Expression[],
    readonly _methodName?: string
  ) {
    super();
  }

  /**
   * @private
   * @internal
   */
  _toProto(serializer: JsonProtoSerializer): ProtoValue {
    return {
      functionValue: {
        name: this.name,
        args: this.params.map(p => p._toProto(serializer))
      }
    };
  }

  /**
   * @private
   * @internal
   */
  _readUserData(context: ParseContext): void {
    context = this._methodName
      ? context.contextWith({ methodName: this._methodName })
      : context;
    this.params.forEach(expr => {
      return expr._readUserData(context);
    });
  }
}

/**
 * @beta
 *
 * An interface that represents a filter condition.
 */
export class BooleanExpression extends FunctionExpression {
  filterable: true = true;

  /**
   * Creates an aggregation that finds the count of input documents satisfying
   * this boolean expression.
   *
   * ```typescript
   * // Find the count of documents with a score greater than 90
   * field("score").greaterThan(90).countIf().as("highestScore");
   * ```
   *
   * @return A new `AggregateFunction` representing the 'countIf' aggregation.
   */
  countIf(): AggregateFunction {
    return new AggregateFunction('count_if', [this], 'countIf');
  }

  /**
   * Creates an expression that negates this boolean expression.
   *
   * ```typescript
   * // Find documents where the 'tags' field does not contain 'completed'
   * field("tags").arrayContains("completed").not();
   * ```
   *
   * @return A new {@code Expr} representing the negated filter condition.
   */
  not(): BooleanExpression {
    return new BooleanExpression('not', [this], 'not');
  }

  /**
   * Creates a conditional expression that evaluates to the 'then' expression
   * if `this` expression evaluates to `true`,
   * or evaluates to the 'else' expression if `this` expressions evaluates `false`.
   *
   * ```typescript
   * // If 'age' is greater than 18, return "Adult"; otherwise, return "Minor".
   * field("age").greaterThanOrEqual(18).conditional(constant("Adult"), constant("Minor"));
   * ```
   *
   * @param thenExpr The expression to evaluate if the condition is true.
   * @param elseExpr The expression to evaluate if the condition is false.
   * @return A new {@code Expr} representing the conditional expression.
   */
  conditional(thenExpr: Expression, elseExpr: Expression): FunctionExpression {
    return new FunctionExpression(
      'conditional',
      [this, thenExpr, elseExpr],
      'conditional'
    );
  }
}

/**
 * @private
 * @internal
 *
 * To return a BooleanExpr as a constant, we need to break the pattern that expects a BooleanExpr to be a
 * "pipeline function". Instead of building on serialization logic built into BooleanExpr,
 * we override methods with those of an internally kept Constant value.
 */
export class BooleanConstant extends BooleanExpression {
  private readonly _internalConstant: Constant;

  constructor(value: boolean, readonly _methodName?: string) {
    super('', []);

    this._internalConstant = new Constant(value, _methodName);
  }

  /**
   * @private
   * @internal
   */
  _toProto(serializer: JsonProtoSerializer): ProtoValue {
    return this._internalConstant._toProto(serializer);
  }

  /**
   * @private
   * @internal
   */
  _readUserData(context: ParseContext): void {
    return this._internalConstant._readUserData(context);
  }
}

/**
 * @beta
 * Creates an aggregation that counts the number of stage inputs where the provided
 * boolean expression evaluates to true.
 *
 * ```typescript
 * // Count the number of documents where 'is_active' field equals true
 * countIf(field("is_active").equal(true)).as("numActiveDocuments");
 * ```
 *
 * @param booleanExpr - The boolean expression to evaluate on each input.
 * @returns A new `AggregateFunction` representing the 'countIf' aggregation.
 */
export function countIf(booleanExpr: BooleanExpression): AggregateFunction {
  return booleanExpr.countIf();
}

/**
 * @beta
 * Creates an expression that indexes into an array from the beginning or end
 * and return the element. If the offset exceeds the array length, an error is
 * returned. A negative offset, starts from the end.
 *
 * ```typescript
 * // Return the value in the tags field array at index 1.
 * arrayGet('tags', 1);
 * ```
 *
 * @param arrayField The name of the array field.
 * @param offset The index of the element to return.
 * @return A new Expr representing the 'arrayGet' operation.
 */
export function arrayGet(
  arrayField: string,
  offset: number
): FunctionExpression;

/**
 * @beta
 * Creates an expression that indexes into an array from the beginning or end
 * and return the element. If the offset exceeds the array length, an error is
 * returned. A negative offset, starts from the end.
 *
 * ```typescript
 * // Return the value in the tags field array at index specified by field
 * // 'favoriteTag'.
 * arrayGet('tags', field('favoriteTag'));
 * ```
 *
 * @param arrayField The name of the array field.
 * @param offsetExpr An Expr evaluating to the index of the element to return.
 * @return A new Expr representing the 'arrayGet' operation.
 */
export function arrayGet(
  arrayField: string,
  offsetExpr: Expression
): FunctionExpression;

/**
 * @beta
 * Creates an expression that indexes into an array from the beginning or end
 * and return the element. If the offset exceeds the array length, an error is
 * returned. A negative offset, starts from the end.
 *
 * ```typescript
 * // Return the value in the tags field array at index 1.
 * arrayGet(field('tags'), 1);
 * ```
 *
 * @param arrayExpression An Expr evaluating to an array.
 * @param offset The index of the element to return.
 * @return A new Expr representing the 'arrayGet' operation.
 */
export function arrayGet(
  arrayExpression: Expression,
  offset: number
): FunctionExpression;

/**
 * @beta
 * Creates an expression that indexes into an array from the beginning or end
 * and return the element. If the offset exceeds the array length, an error is
 * returned. A negative offset, starts from the end.
 *
 * ```typescript
 * // Return the value in the tags field array at index specified by field
 * // 'favoriteTag'.
 * arrayGet(field('tags'), field('favoriteTag'));
 * ```
 *
 * @param arrayExpression An Expr evaluating to an array.
 * @param offsetExpr An Expr evaluating to the index of the element to return.
 * @return A new Expr representing the 'arrayGet' operation.
 */
export function arrayGet(
  arrayExpression: Expression,
  offsetExpr: Expression
): FunctionExpression;
export function arrayGet(
  array: Expression | string,
  offset: Expression | number
): FunctionExpression {
  return fieldOrExpression(array).arrayGet(valueToDefaultExpr(offset));
}

/**
 * @beta
 *
 * Creates an expression that checks if a given expression produces an error.
 *
 * ```typescript
 * // Check if the result of a calculation is an error
 * isError(field("title").arrayContains(1));
 * ```
 *
 * @param value The expression to check.
 * @return A new {@code Expr} representing the 'isError' check.
 */
export function isError(value: Expression): BooleanExpression {
  return value.isError();
}

/**
 * @beta
 *
 * Creates an expression that returns the `catch` argument if there is an
 * error, else return the result of the `try` argument evaluation.
 *
 * ```typescript
 * // Returns the first item in the title field arrays, or returns
 * // the entire title field if the array is empty or the field is another type.
 * ifError(field("title").arrayGet(0), field("title"));
 * ```
 *
 * @param tryExpr The try expression.
 * @param catchExpr The catch expression that will be evaluated and
 * returned if the tryExpr produces an error.
 * @return A new {@code Expr} representing the 'ifError' operation.
 */
export function ifError(
  tryExpr: Expression,
  catchExpr: Expression
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that returns the `catch` argument if there is an
 * error, else return the result of the `try` argument evaluation.
 *
 * ```typescript
 * // Returns the first item in the title field arrays, or returns
 * // "Default Title"
 * ifError(field("title").arrayGet(0), "Default Title");
 * ```
 *
 * @param tryExpr The try expression.
 * @param catchValue The value that will be returned if the tryExpr produces an
 * error.
 * @return A new {@code Expr} representing the 'ifError' operation.
 */
export function ifError(
  tryExpr: Expression,
  catchValue: unknown
): FunctionExpression;
export function ifError(
  tryExpr: Expression,
  catchValue: unknown
): FunctionExpression {
  return tryExpr.ifError(valueToDefaultExpr(catchValue));
}

/**
 * @beta
 *
 * Creates an expression that returns `true` if a value is absent. Otherwise,
 * returns `false` even if the value is `null`.
 *
 * ```typescript
 * // Check if the field `value` is absent.
 * isAbsent(field("value"));
 * ```
 *
 * @param value The expression to check.
 * @return A new {@code Expr} representing the 'isAbsent' check.
 */
export function isAbsent(value: Expression): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that returns `true` if a field is absent. Otherwise,
 * returns `false` even if the field value is `null`.
 *
 * ```typescript
 * // Check if the field `value` is absent.
 * isAbsent("value");
 * ```
 *
 * @param field The field to check.
 * @return A new {@code Expr} representing the 'isAbsent' check.
 */
export function isAbsent(field: string): BooleanExpression;
export function isAbsent(value: Expression | string): BooleanExpression {
  return fieldOrExpression(value).isAbsent();
}

/**
 * @beta
 *
 * Creates an expression that checks if an expression evaluates to 'NaN' (Not a Number).
 *
 * ```typescript
 * // Check if the result of a calculation is NaN
 * isNaN(field("value").divide(0));
 * ```
 *
 * @param value The expression to check.
 * @return A new {@code Expr} representing the 'isNaN' check.
 */
export function isNull(value: Expression): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value evaluates to 'NaN' (Not a Number).
 *
 * ```typescript
 * // Check if the result of a calculation is NaN
 * isNaN("value");
 * ```
 *
 * @param value The name of the field to check.
 * @return A new {@code Expr} representing the 'isNaN' check.
 */
export function isNull(value: string): BooleanExpression;
export function isNull(value: Expression | string): BooleanExpression {
  return fieldOrExpression(value).isNull();
}

/**
 * @beta
 *
 * Creates an expression that checks if tbe result of an expression is not null.
 *
 * ```typescript
 * // Check if the value of the 'name' field is not null
 * isNotNull(field("name"));
 * ```
 *
 * @param value The expression to check.
 * @return A new {@code Expr} representing the 'isNaN' check.
 */
export function isNotNull(value: Expression): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if tbe value of a field is not null.
 *
 * ```typescript
 * // Check if the value of the 'name' field is not null
 * isNotNull("name");
 * ```
 *
 * @param value The name of the field to check.
 * @return A new {@code Expr} representing the 'isNaN' check.
 */
export function isNotNull(value: string): BooleanExpression;
export function isNotNull(value: Expression | string): BooleanExpression {
  return fieldOrExpression(value).isNotNull();
}

/**
 * @beta
 *
 * Creates an expression that checks if the results of this expression is NOT 'NaN' (Not a Number).
 *
 * ```typescript
 * // Check if the result of a calculation is NOT NaN
 * isNotNaN(field("value").divide(0));
 * ```
 *
 * @param value The expression to check.
 * @return A new {@code Expr} representing the 'isNotNaN' check.
 */
export function isNotNan(value: Expression): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if the results of this expression is NOT 'NaN' (Not a Number).
 *
 * ```typescript
 * // Check if the value of a field is NOT NaN
 * isNotNaN("value");
 * ```
 *
 * @param value The name of the field to check.
 * @return A new {@code Expr} representing the 'isNotNaN' check.
 */
export function isNotNan(value: string): BooleanExpression;
export function isNotNan(value: Expression | string): BooleanExpression {
  return fieldOrExpression(value).isNotNan();
}

/**
 * @beta
 *
 * Creates an expression that removes a key from the map at the specified field name.
 *
 * ```
 * // Removes the key 'city' field from the map in the address field of the input document.
 * mapRemove('address', 'city');
 * ```
 *
 * @param mapField The name of a field containing a map value.
 * @param key The name of the key to remove from the input map.
 */
export function mapRemove(mapField: string, key: string): FunctionExpression;
/**
 * @beta
 *
 * Creates an expression that removes a key from the map produced by evaluating an expression.
 *
 * ```
 * // Removes the key 'baz' from the input map.
 * mapRemove(map({foo: 'bar', baz: true}), 'baz');
 * ```
 *
 * @param mapExpr An expression return a map value.
 * @param key The name of the key to remove from the input map.
 */
export function mapRemove(mapExpr: Expression, key: string): FunctionExpression;
/**
 * @beta
 *
 * Creates an expression that removes a key from the map at the specified field name.
 *
 * ```
 * // Removes the key 'city' field from the map in the address field of the input document.
 * mapRemove('address', constant('city'));
 * ```
 *
 * @param mapField The name of a field containing a map value.
 * @param keyExpr An expression that produces the name of the key to remove from the input map.
 */
export function mapRemove(
  mapField: string,
  keyExpr: Expression
): FunctionExpression;
/**
 * @beta
 *
 * Creates an expression that removes a key from the map produced by evaluating an expression.
 *
 * ```
 * // Removes the key 'baz' from the input map.
 * mapRemove(map({foo: 'bar', baz: true}), constant('baz'));
 * ```
 *
 * @param mapExpr An expression return a map value.
 * @param keyExpr An expression that produces the name of the key to remove from the input map.
 */
export function mapRemove(
  mapExpr: Expression,
  keyExpr: Expression
): FunctionExpression;

export function mapRemove(
  mapExpr: Expression | string,
  stringExpr: Expression | string
): FunctionExpression {
  return fieldOrExpression(mapExpr).mapRemove(valueToDefaultExpr(stringExpr));
}

/**
 * @beta
 *
 * Creates an expression that merges multiple map values.
 *
 * ```
 * // Merges the map in the settings field with, a map literal, and a map in
 * // that is conditionally returned by another expression
 * mapMerge('settings', { enabled: true }, conditional(field('isAdmin'), { admin: true}, {})
 * ```
 *
 * @param mapField Name of a field containing a map value that will be merged.
 * @param secondMap A required second map to merge. Represented as a literal or
 * an expression that returns a map.
 * @param otherMaps Optional additional maps to merge. Each map is represented
 * as a literal or an expression that returns a map.
 */
export function mapMerge(
  mapField: string,
  secondMap: Record<string, unknown> | Expression,
  ...otherMaps: Array<Record<string, unknown> | Expression>
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that merges multiple map values.
 *
 * ```
 * // Merges the map in the settings field with, a map literal, and a map in
 * // that is conditionally returned by another expression
 * mapMerge(field('settings'), { enabled: true }, conditional(field('isAdmin'), { admin: true}, {})
 * ```
 *
 * @param firstMap An expression or literal map value that will be merged.
 * @param secondMap A required second map to merge. Represented as a literal or
 * an expression that returns a map.
 * @param otherMaps Optional additional maps to merge. Each map is represented
 * as a literal or an expression that returns a map.
 */
export function mapMerge(
  firstMap: Record<string, unknown> | Expression,
  secondMap: Record<string, unknown> | Expression,
  ...otherMaps: Array<Record<string, unknown> | Expression>
): FunctionExpression;

export function mapMerge(
  firstMap: string | Record<string, unknown> | Expression,
  secondMap: Record<string, unknown> | Expression,
  ...otherMaps: Array<Record<string, unknown> | Expression>
): FunctionExpression {
  const secondMapExpr = valueToDefaultExpr(secondMap);
  const otherMapExprs = otherMaps.map(valueToDefaultExpr);
  return fieldOrExpression(firstMap).mapMerge(secondMapExpr, ...otherMapExprs);
}

/**
 * @beta
 *
 * Creates an expression that returns the document ID from a path.
 *
 * ```typescript
 * // Get the document ID from a path.
 * documentId(myDocumentReference);
 * ```
 *
 * @return A new {@code Expr} representing the documentId operation.
 */
export function documentId(
  documentPath: string | DocumentReference
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that returns the document ID from a path.
 *
 * ```typescript
 * // Get the document ID from a path.
 * documentId(field("__path__"));
 * ```
 *
 * @return A new {@code Expr} representing the documentId operation.
 */
export function documentId(documentPathExpr: Expression): FunctionExpression;

export function documentId(
  documentPath: Expression | string | DocumentReference
): FunctionExpression {
  // @ts-ignore
  const documentPathExpr = valueToDefaultExpr(documentPath);
  return documentPathExpr.documentId();
}

/**
 * @beta
 *
 * Creates an expression that returns a substring of a string or byte array.
 *
 * @param field The name of a field containing a string or byte array to compute the substring from.
 * @param position Index of the first character of the substring.
 * @param length Length of the substring.
 */
export function substring(
  field: string,
  position: number,
  length?: number
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that returns a substring of a string or byte array.
 *
 * @param input An expression returning a string or byte array to compute the substring from.
 * @param position Index of the first character of the substring.
 * @param length Length of the substring.
 */
export function substring(
  input: Expression,
  position: number,
  length?: number
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that returns a substring of a string or byte array.
 *
 * @param field The name of a field containing a string or byte array to compute the substring from.
 * @param position An expression that returns the index of the first character of the substring.
 * @param length An expression that returns the length of the substring.
 */
export function substring(
  field: string,
  position: Expression,
  length?: Expression
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that returns a substring of a string or byte array.
 *
 * @param input An expression returning a string or byte array to compute the substring from.
 * @param position An expression that returns the index of the first character of the substring.
 * @param length An expression that returns the length of the substring.
 */
export function substring(
  input: Expression,
  position: Expression,
  length?: Expression
): FunctionExpression;

export function substring(
  field: Expression | string,
  position: Expression | number,
  length?: Expression | number
): FunctionExpression {
  const fieldExpr = fieldOrExpression(field);
  const positionExpr = valueToDefaultExpr(position);
  const lengthExpr =
    length === undefined ? undefined : valueToDefaultExpr(length);
  return fieldExpr.substring(positionExpr, lengthExpr);
}

/**
 * @beta
 *
 * Creates an expression that adds two expressions together.
 *
 * ```typescript
 * // Add the value of the 'quantity' field and the 'reserve' field.
 * add(field("quantity"), field("reserve"));
 * ```
 *
 * @param first The first expression to add.
 * @param second The second expression or literal to add.
 * @param others Optional other expressions or literals to add.
 * @return A new {@code Expr} representing the addition operation.
 */
export function add(
  first: Expression,
  second: Expression | unknown
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that adds a field's value to an expression.
 *
 * ```typescript
 * // Add the value of the 'quantity' field and the 'reserve' field.
 * add("quantity", field("reserve"));
 * ```
 *
 * @param fieldName The name of the field containing the value to add.
 * @param second The second expression or literal to add.
 * @param others Optional other expressions or literals to add.
 * @return A new {@code Expr} representing the addition operation.
 */
export function add(
  fieldName: string,
  second: Expression | unknown
): FunctionExpression;

export function add(
  first: Expression | string,
  second: Expression | unknown
): FunctionExpression {
  return fieldOrExpression(first).add(valueToDefaultExpr(second));
}

/**
 * @beta
 *
 * Creates an expression that subtracts two expressions.
 *
 * ```typescript
 * // Subtract the 'discount' field from the 'price' field
 * subtract(field("price"), field("discount"));
 * ```
 *
 * @param left The expression to subtract from.
 * @param right The expression to subtract.
 * @return A new {@code Expr} representing the subtraction operation.
 */
export function subtract(
  left: Expression,
  right: Expression
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that subtracts a constant value from an expression.
 *
 * ```typescript
 * // Subtract the constant value 2 from the 'value' field
 * subtract(field("value"), 2);
 * ```
 *
 * @param expression The expression to subtract from.
 * @param value The constant value to subtract.
 * @return A new {@code Expr} representing the subtraction operation.
 */
export function subtract(
  expression: Expression,
  value: unknown
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that subtracts an expression from a field's value.
 *
 * ```typescript
 * // Subtract the 'discount' field from the 'price' field
 * subtract("price", field("discount"));
 * ```
 *
 * @param fieldName The field name to subtract from.
 * @param expression The expression to subtract.
 * @return A new {@code Expr} representing the subtraction operation.
 */
export function subtract(
  fieldName: string,
  expression: Expression
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that subtracts a constant value from a field's value.
 *
 * ```typescript
 * // Subtract 20 from the value of the 'total' field
 * subtract("total", 20);
 * ```
 *
 * @param fieldName The field name to subtract from.
 * @param value The constant value to subtract.
 * @return A new {@code Expr} representing the subtraction operation.
 */
export function subtract(fieldName: string, value: unknown): FunctionExpression;
export function subtract(
  left: Expression | string,
  right: Expression | unknown
): FunctionExpression {
  const normalizedLeft = typeof left === 'string' ? field(left) : left;
  const normalizedRight = valueToDefaultExpr(right);
  return normalizedLeft.subtract(normalizedRight);
}

/**
 * @beta
 *
 * Creates an expression that multiplies two expressions together.
 *
 * ```typescript
 * // Multiply the 'quantity' field by the 'price' field
 * multiply(field("quantity"), field("price"));
 * ```
 *
 * @param first The first expression to multiply.
 * @param second The second expression or literal to multiply.
 * @param others Optional additional expressions or literals to multiply.
 * @return A new {@code Expr} representing the multiplication operation.
 */
export function multiply(
  first: Expression,
  second: Expression | unknown
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that multiplies a field's value by an expression.
 *
 * ```typescript
 * // Multiply the 'quantity' field by the 'price' field
 * multiply("quantity", field("price"));
 * ```
 *
 * @param fieldName The name of the field containing the value to add.
 * @param second The second expression or literal to add.
 * @param others Optional other expressions or literals to add.
 * @return A new {@code Expr} representing the multiplication operation.
 */
export function multiply(
  fieldName: string,
  second: Expression | unknown
): FunctionExpression;

export function multiply(
  first: Expression | string,
  second: Expression | unknown
): FunctionExpression {
  return fieldOrExpression(first).multiply(valueToDefaultExpr(second));
}

/**
 * @beta
 *
 * Creates an expression that divides two expressions.
 *
 * ```typescript
 * // Divide the 'total' field by the 'count' field
 * divide(field("total"), field("count"));
 * ```
 *
 * @param left The expression to be divided.
 * @param right The expression to divide by.
 * @return A new {@code Expr} representing the division operation.
 */
export function divide(left: Expression, right: Expression): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that divides an expression by a constant value.
 *
 * ```typescript
 * // Divide the 'value' field by 10
 * divide(field("value"), 10);
 * ```
 *
 * @param expression The expression to be divided.
 * @param value The constant value to divide by.
 * @return A new {@code Expr} representing the division operation.
 */
export function divide(
  expression: Expression,
  value: unknown
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that divides a field's value by an expression.
 *
 * ```typescript
 * // Divide the 'total' field by the 'count' field
 * divide("total", field("count"));
 * ```
 *
 * @param fieldName The field name to be divided.
 * @param expressions The expression to divide by.
 * @return A new {@code Expr} representing the division operation.
 */
export function divide(
  fieldName: string,
  expressions: Expression
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that divides a field's value by a constant value.
 *
 * ```typescript
 * // Divide the 'value' field by 10
 * divide("value", 10);
 * ```
 *
 * @param fieldName The field name to be divided.
 * @param value The constant value to divide by.
 * @return A new {@code Expr} representing the division operation.
 */
export function divide(fieldName: string, value: unknown): FunctionExpression;
export function divide(
  left: Expression | string,
  right: Expression | unknown
): FunctionExpression {
  const normalizedLeft = typeof left === 'string' ? field(left) : left;
  const normalizedRight = valueToDefaultExpr(right);
  return normalizedLeft.divide(normalizedRight);
}

/**
 * @beta
 *
 * Creates an expression that calculates the modulo (remainder) of dividing two expressions.
 *
 * ```typescript
 * // Calculate the remainder of dividing 'field1' by 'field2'.
 * mod(field("field1"), field("field2"));
 * ```
 *
 * @param left The dividend expression.
 * @param right The divisor expression.
 * @return A new {@code Expr} representing the modulo operation.
 */
export function mod(left: Expression, right: Expression): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that calculates the modulo (remainder) of dividing an expression by a constant.
 *
 * ```typescript
 * // Calculate the remainder of dividing 'field1' by 5.
 * mod(field("field1"), 5);
 * ```
 *
 * @param expression The dividend expression.
 * @param value The divisor constant.
 * @return A new {@code Expr} representing the modulo operation.
 */
export function mod(expression: Expression, value: unknown): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that calculates the modulo (remainder) of dividing a field's value by an expression.
 *
 * ```typescript
 * // Calculate the remainder of dividing 'field1' by 'field2'.
 * mod("field1", field("field2"));
 * ```
 *
 * @param fieldName The dividend field name.
 * @param expression The divisor expression.
 * @return A new {@code Expr} representing the modulo operation.
 */
export function mod(
  fieldName: string,
  expression: Expression
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that calculates the modulo (remainder) of dividing a field's value by a constant.
 *
 * ```typescript
 * // Calculate the remainder of dividing 'field1' by 5.
 * mod("field1", 5);
 * ```
 *
 * @param fieldName The dividend field name.
 * @param value The divisor constant.
 * @return A new {@code Expr} representing the modulo operation.
 */
export function mod(fieldName: string, value: unknown): FunctionExpression;
export function mod(
  left: Expression | string,
  right: Expression | unknown
): FunctionExpression {
  const normalizedLeft = typeof left === 'string' ? field(left) : left;
  const normalizedRight = valueToDefaultExpr(right);
  return normalizedLeft.mod(normalizedRight);
}

/**
 * @beta
 *
 * Creates an expression that creates a Firestore map value from an input object.
 *
 * ```typescript
 * // Create a map from the input object and reference the 'baz' field value from the input document.
 * map({foo: 'bar', baz: Field.of('baz')}).as('data');
 * ```
 *
 * @param elements The input map to evaluate in the expression.
 * @return A new {@code Expr} representing the map function.
 */
export function map(elements: Record<string, unknown>): FunctionExpression {
  return _map(elements, 'map');
}
export function _map(
  elements: Record<string, unknown>,
  methodName: string | undefined
): FunctionExpression {
  const result: Expression[] = [];
  for (const key in elements) {
    if (Object.prototype.hasOwnProperty.call(elements, key)) {
      const value = elements[key];
      result.push(constant(key));
      result.push(valueToDefaultExpr(value));
    }
  }
  return new FunctionExpression('map', result, 'map');
}

/**
 * Internal use only
 * Converts a plainObject to a mapValue in the proto representation,
 * rather than a functionValue+map that is the result of the map(...) function.
 * This behaves different from constant(plainObject) because it
 * traverses the input object, converts values in the object to expressions,
 * and calls _readUserData on each of these expressions.
 * @private
 * @internal
 * @param plainObject
 */
export function _mapValue(plainObject: Record<string, unknown>): MapValue {
  const result: Map<string, Expression> = new Map<string, Expression>();
  for (const key in plainObject) {
    if (Object.prototype.hasOwnProperty.call(plainObject, key)) {
      const value = plainObject[key];
      result.set(key, valueToDefaultExpr(value));
    }
  }
  return new MapValue(result, undefined);
}

/**
 * @beta
 *
 * Creates an expression that creates a Firestore array value from an input array.
 *
 * ```typescript
 * // Create an array value from the input array and reference the 'baz' field value from the input document.
 * array(['bar', Field.of('baz')]).as('foo');
 * ```
 *
 * @param elements The input array to evaluate in the expression.
 * @return A new {@code Expr} representing the array function.
 */
export function array(elements: unknown[]): FunctionExpression {
  return _array(elements, 'array');
}
export function _array(
  elements: unknown[],
  methodName: string | undefined
): FunctionExpression {
  return new FunctionExpression(
    'array',
    elements.map(element => valueToDefaultExpr(element)),
    methodName
  );
}

/**
 * @beta
 *
 * Creates an expression that checks if two expressions are equal.
 *
 * ```typescript
 * // Check if the 'age' field is equal to an expression
 * equal(field("age"), field("minAge").add(10));
 * ```
 *
 * @param left The first expression to compare.
 * @param right The second expression to compare.
 * @return A new `Expr` representing the equality comparison.
 */
export function equal(left: Expression, right: Expression): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is equal to a constant value.
 *
 * ```typescript
 * // Check if the 'age' field is equal to 21
 * equal(field("age"), 21);
 * ```
 *
 * @param expression The expression to compare.
 * @param value The constant value to compare to.
 * @return A new `Expr` representing the equality comparison.
 */
export function equal(
  expression: Expression,
  value: unknown
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is equal to an expression.
 *
 * ```typescript
 * // Check if the 'age' field is equal to the 'limit' field
 * equal("age", field("limit"));
 * ```
 *
 * @param fieldName The field name to compare.
 * @param expression The expression to compare to.
 * @return A new `Expr` representing the equality comparison.
 */
export function equal(
  fieldName: string,
  expression: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is equal to a constant value.
 *
 * ```typescript
 * // Check if the 'city' field is equal to string constant "London"
 * equal("city", "London");
 * ```
 *
 * @param fieldName The field name to compare.
 * @param value The constant value to compare to.
 * @return A new `Expr` representing the equality comparison.
 */
export function equal(fieldName: string, value: unknown): BooleanExpression;
export function equal(
  left: Expression | string,
  right: unknown
): BooleanExpression {
  const leftExpr = left instanceof Expression ? left : field(left);
  const rightExpr = valueToDefaultExpr(right);
  return leftExpr.equal(rightExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if two expressions are not equal.
 *
 * ```typescript
 * // Check if the 'status' field is not equal to field 'finalState'
 * notEqual(field("status"), field("finalState"));
 * ```
 *
 * @param left The first expression to compare.
 * @param right The second expression to compare.
 * @return A new `Expr` representing the inequality comparison.
 */
export function notEqual(
  left: Expression,
  right: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is not equal to a constant value.
 *
 * ```typescript
 * // Check if the 'status' field is not equal to "completed"
 * notEqual(field("status"), "completed");
 * ```
 *
 * @param expression The expression to compare.
 * @param value The constant value to compare to.
 * @return A new `Expr` representing the inequality comparison.
 */
export function notEqual(
  expression: Expression,
  value: unknown
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is not equal to an expression.
 *
 * ```typescript
 * // Check if the 'status' field is not equal to the value of 'expectedStatus'
 * notEqual("status", field("expectedStatus"));
 * ```
 *
 * @param fieldName The field name to compare.
 * @param expression The expression to compare to.
 * @return A new `Expr` representing the inequality comparison.
 */
export function notEqual(
  fieldName: string,
  expression: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is not equal to a constant value.
 *
 * ```typescript
 * // Check if the 'country' field is not equal to "USA"
 * notEqual("country", "USA");
 * ```
 *
 * @param fieldName The field name to compare.
 * @param value The constant value to compare to.
 * @return A new `Expr` representing the inequality comparison.
 */
export function notEqual(fieldName: string, value: unknown): BooleanExpression;
export function notEqual(
  left: Expression | string,
  right: unknown
): BooleanExpression {
  const leftExpr = left instanceof Expression ? left : field(left);
  const rightExpr = valueToDefaultExpr(right);
  return leftExpr.notEqual(rightExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if the first expression is less than the second expression.
 *
 * ```typescript
 * // Check if the 'age' field is less than 30
 * lessThan(field("age"), field("limit"));
 * ```
 *
 * @param left The first expression to compare.
 * @param right The second expression to compare.
 * @return A new `Expr` representing the less than comparison.
 */
export function lessThan(
  left: Expression,
  right: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is less than a constant value.
 *
 * ```typescript
 * // Check if the 'age' field is less than 30
 * lessThan(field("age"), 30);
 * ```
 *
 * @param expression The expression to compare.
 * @param value The constant value to compare to.
 * @return A new `Expr` representing the less than comparison.
 */
export function lessThan(
  expression: Expression,
  value: unknown
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is less than an expression.
 *
 * ```typescript
 * // Check if the 'age' field is less than the 'limit' field
 * lessThan("age", field("limit"));
 * ```
 *
 * @param fieldName The field name to compare.
 * @param expression The expression to compare to.
 * @return A new `Expr` representing the less than comparison.
 */
export function lessThan(
  fieldName: string,
  expression: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is less than a constant value.
 *
 * ```typescript
 * // Check if the 'price' field is less than 50
 * lessThan("price", 50);
 * ```
 *
 * @param fieldName The field name to compare.
 * @param value The constant value to compare to.
 * @return A new `Expr` representing the less than comparison.
 */
export function lessThan(fieldName: string, value: unknown): BooleanExpression;
export function lessThan(
  left: Expression | string,
  right: unknown
): BooleanExpression {
  const leftExpr = left instanceof Expression ? left : field(left);
  const rightExpr = valueToDefaultExpr(right);
  return leftExpr.lessThan(rightExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if the first expression is less than or equal to the second
 * expression.
 *
 * ```typescript
 * // Check if the 'quantity' field is less than or equal to 20
 * lessThan(field("quantity"), field("limit"));
 * ```
 *
 * @param left The first expression to compare.
 * @param right The second expression to compare.
 * @return A new `Expr` representing the less than or equal to comparison.
 */
export function lessThanOrEqual(
  left: Expression,
  right: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is less than or equal to a constant value.
 *
 * ```typescript
 * // Check if the 'quantity' field is less than or equal to 20
 * lessThan(field("quantity"), 20);
 * ```
 *
 * @param expression The expression to compare.
 * @param value The constant value to compare to.
 * @return A new `Expr` representing the less than or equal to comparison.
 */
export function lessThanOrEqual(
  expression: Expression,
  value: unknown
): BooleanExpression;

/**
 * Creates an expression that checks if a field's value is less than or equal to an expression.
 *
 * ```typescript
 * // Check if the 'quantity' field is less than or equal to the 'limit' field
 * lessThan("quantity", field("limit"));
 * ```
 *
 * @param fieldName The field name to compare.
 * @param expression The expression to compare to.
 * @return A new `Expr` representing the less than or equal to comparison.
 */
export function lessThanOrEqual(
  fieldName: string,
  expression: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is less than or equal to a constant value.
 *
 * ```typescript
 * // Check if the 'score' field is less than or equal to 70
 * lessThan("score", 70);
 * ```
 *
 * @param fieldName The field name to compare.
 * @param value The constant value to compare to.
 * @return A new `Expr` representing the less than or equal to comparison.
 */
export function lessThanOrEqual(
  fieldName: string,
  value: unknown
): BooleanExpression;
export function lessThanOrEqual(
  left: Expression | string,
  right: unknown
): BooleanExpression {
  const leftExpr = left instanceof Expression ? left : field(left);
  const rightExpr = valueToDefaultExpr(right);
  return leftExpr.lessThanOrEqual(rightExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if the first expression is greater than the second
 * expression.
 *
 * ```typescript
 * // Check if the 'age' field is greater than 18
 * greaterThan(field("age"), Constant(9).add(9));
 * ```
 *
 * @param left The first expression to compare.
 * @param right The second expression to compare.
 * @return A new `Expr` representing the greater than comparison.
 */
export function greaterThan(
  left: Expression,
  right: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is greater than a constant value.
 *
 * ```typescript
 * // Check if the 'age' field is greater than 18
 * greaterThan(field("age"), 18);
 * ```
 *
 * @param expression The expression to compare.
 * @param value The constant value to compare to.
 * @return A new `Expr` representing the greater than comparison.
 */
export function greaterThan(
  expression: Expression,
  value: unknown
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is greater than an expression.
 *
 * ```typescript
 * // Check if the value of field 'age' is greater than the value of field 'limit'
 * greaterThan("age", field("limit"));
 * ```
 *
 * @param fieldName The field name to compare.
 * @param expression The expression to compare to.
 * @return A new `Expr` representing the greater than comparison.
 */
export function greaterThan(
  fieldName: string,
  expression: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is greater than a constant value.
 *
 * ```typescript
 * // Check if the 'price' field is greater than 100
 * greaterThan("price", 100);
 * ```
 *
 * @param fieldName The field name to compare.
 * @param value The constant value to compare to.
 * @return A new `Expr` representing the greater than comparison.
 */
export function greaterThan(
  fieldName: string,
  value: unknown
): BooleanExpression;
export function greaterThan(
  left: Expression | string,
  right: unknown
): BooleanExpression {
  const leftExpr = left instanceof Expression ? left : field(left);
  const rightExpr = valueToDefaultExpr(right);
  return leftExpr.greaterThan(rightExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if the first expression is greater than or equal to the
 * second expression.
 *
 * ```typescript
 * // Check if the 'quantity' field is greater than or equal to the field "threshold"
 * greaterThanOrEqual(field("quantity"), field("threshold"));
 * ```
 *
 * @param left The first expression to compare.
 * @param right The second expression to compare.
 * @return A new `Expr` representing the greater than or equal to comparison.
 */
export function greaterThanOrEqual(
  left: Expression,
  right: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is greater than or equal to a constant
 * value.
 *
 * ```typescript
 * // Check if the 'quantity' field is greater than or equal to 10
 * greaterThanOrEqual(field("quantity"), 10);
 * ```
 *
 * @param expression The expression to compare.
 * @param value The constant value to compare to.
 * @return A new `Expr` representing the greater than or equal to comparison.
 */
export function greaterThanOrEqual(
  expression: Expression,
  value: unknown
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is greater than or equal to an expression.
 *
 * ```typescript
 * // Check if the value of field 'age' is greater than or equal to the value of field 'limit'
 * greaterThanOrEqual("age", field("limit"));
 * ```
 *
 * @param fieldName The field name to compare.
 * @param value The expression to compare to.
 * @return A new `Expr` representing the greater than or equal to comparison.
 */
export function greaterThanOrEqual(
  fieldName: string,
  value: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is greater than or equal to a constant
 * value.
 *
 * ```typescript
 * // Check if the 'score' field is greater than or equal to 80
 * greaterThanOrEqual("score", 80);
 * ```
 *
 * @param fieldName The field name to compare.
 * @param value The constant value to compare to.
 * @return A new `Expr` representing the greater than or equal to comparison.
 */
export function greaterThanOrEqual(
  fieldName: string,
  value: unknown
): BooleanExpression;
export function greaterThanOrEqual(
  left: Expression | string,
  right: unknown
): BooleanExpression {
  const leftExpr = left instanceof Expression ? left : field(left);
  const rightExpr = valueToDefaultExpr(right);
  return leftExpr.greaterThanOrEqual(rightExpr);
}

/**
 * @beta
 *
 * Creates an expression that concatenates an array expression with other arrays.
 *
 * ```typescript
 * // Combine the 'items' array with two new item arrays
 * arrayConcat(field("items"), [field("newItems"), field("otherItems")]);
 * ```
 *
 * @param firstArray The first array expression to concatenate to.
 * @param secondArray The second array expression or array literal to concatenate to.
 * @param otherArrays Optional additional array expressions or array literals to concatenate.
 * @return A new {@code Expr} representing the concatenated array.
 */
export function arrayConcat(
  firstArray: Expression,
  secondArray: Expression | unknown[],
  ...otherArrays: Array<Expression | unknown[]>
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that concatenates a field's array value with other arrays.
 *
 * ```typescript
 * // Combine the 'items' array with two new item arrays
 * arrayConcat("items", [field("newItems"), field("otherItems")]);
 * ```
 *
 * @param firstArrayField The first array to concatenate to.
 * @param secondArray The second array expression or array literal to concatenate to.
 * @param otherArrays Optional additional array expressions or array literals to concatenate.
 * @return A new {@code Expr} representing the concatenated array.
 */
export function arrayConcat(
  firstArrayField: string,
  secondArray: Expression | unknown[],
  ...otherArrays: Array<Expression | unknown[]>
): FunctionExpression;

export function arrayConcat(
  firstArray: Expression | string,
  secondArray: Expression | unknown[],
  ...otherArrays: Array<Expression | unknown[]>
): FunctionExpression {
  const exprValues = otherArrays.map(element => valueToDefaultExpr(element));
  return fieldOrExpression(firstArray).arrayConcat(
    fieldOrExpression(secondArray),
    ...exprValues
  );
}

/**
 * @beta
 *
 * Creates an expression that checks if an array expression contains a specific element.
 *
 * ```typescript
 * // Check if the 'colors' array contains the value of field 'selectedColor'
 * arrayContains(field("colors"), field("selectedColor"));
 * ```
 *
 * @param array The array expression to check.
 * @param element The element to search for in the array.
 * @return A new {@code Expr} representing the 'array_contains' comparison.
 */
export function arrayContains(
  array: Expression,
  element: Expression
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that checks if an array expression contains a specific element.
 *
 * ```typescript
 * // Check if the 'colors' array contains "red"
 * arrayContains(field("colors"), "red");
 * ```
 *
 * @param array The array expression to check.
 * @param element The element to search for in the array.
 * @return A new {@code Expr} representing the 'array_contains' comparison.
 */
export function arrayContains(
  array: Expression,
  element: unknown
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's array value contains a specific element.
 *
 * ```typescript
 * // Check if the 'colors' array contains the value of field 'selectedColor'
 * arrayContains("colors", field("selectedColor"));
 * ```
 *
 * @param fieldName The field name to check.
 * @param element The element to search for in the array.
 * @return A new {@code Expr} representing the 'array_contains' comparison.
 */
export function arrayContains(
  fieldName: string,
  element: Expression
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's array value contains a specific value.
 *
 * ```typescript
 * // Check if the 'colors' array contains "red"
 * arrayContains("colors", "red");
 * ```
 *
 * @param fieldName The field name to check.
 * @param element The element to search for in the array.
 * @return A new {@code Expr} representing the 'array_contains' comparison.
 */
export function arrayContains(
  fieldName: string,
  element: unknown
): BooleanExpression;
export function arrayContains(
  array: Expression | string,
  element: unknown
): BooleanExpression {
  const arrayExpr = fieldOrExpression(array);
  const elementExpr = valueToDefaultExpr(element);
  return arrayExpr.arrayContains(elementExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if an array expression contains any of the specified
 * elements.
 *
 * ```typescript
 * // Check if the 'categories' array contains either values from field "cate1" or "Science"
 * arrayContainsAny(field("categories"), [field("cate1"), "Science"]);
 * ```
 *
 * @param array The array expression to check.
 * @param values The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_any' comparison.
 */
export function arrayContainsAny(
  array: Expression,
  values: Array<Expression | unknown>
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's array value contains any of the specified
 * elements.
 *
 * ```typescript
 * // Check if the 'groups' array contains either the value from the 'userGroup' field
 * // or the value "guest"
 * arrayContainsAny("categories", [field("cate1"), "Science"]);
 * ```
 *
 * @param fieldName The field name to check.
 * @param values The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_any' comparison.
 */
export function arrayContainsAny(
  fieldName: string,
  values: Array<Expression | unknown>
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if an array expression contains any of the specified
 * elements.
 *
 * ```typescript
 * // Check if the 'categories' array contains either values from field "cate1" or "Science"
 * arrayContainsAny(field("categories"), array([field("cate1"), "Science"]));
 * ```
 *
 * @param array The array expression to check.
 * @param values An expression that evaluates to an array, whose elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_any' comparison.
 */
export function arrayContainsAny(
  array: Expression,
  values: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's array value contains any of the specified
 * elements.
 *
 * ```typescript
 * // Check if the 'groups' array contains either the value from the 'userGroup' field
 * // or the value "guest"
 * arrayContainsAny("categories", array([field("cate1"), "Science"]));
 * ```
 *
 * @param fieldName The field name to check.
 * @param values An expression that evaluates to an array, whose elements to check for in the array field.
 * @return A new {@code Expr} representing the 'array_contains_any' comparison.
 */
export function arrayContainsAny(
  fieldName: string,
  values: Expression
): BooleanExpression;
export function arrayContainsAny(
  array: Expression | string,
  values: unknown[] | Expression
): BooleanExpression {
  // @ts-ignore implementation accepts both types
  return fieldOrExpression(array).arrayContainsAny(values);
}

/**
 * @beta
 *
 * Creates an expression that checks if an array expression contains all the specified elements.
 *
 * ```typescript
 * // Check if the "tags" array contains all of the values: "SciFi", "Adventure", and the value from field "tag1"
 * arrayContainsAll(field("tags"), [field("tag1"), constant("SciFi"), "Adventure"]);
 * ```
 *
 * @param array The array expression to check.
 * @param values The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_all' comparison.
 */
export function arrayContainsAll(
  array: Expression,
  values: Array<Expression | unknown>
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's array value contains all the specified values or
 * expressions.
 *
 * ```typescript
 * // Check if the 'tags' array contains both of the values from field 'tag1', the value "SciFi", and "Adventure"
 * arrayContainsAll("tags", [field("tag1"), "SciFi", "Adventure"]);
 * ```
 *
 * @param fieldName The field name to check.
 * @param values The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_all' comparison.
 */
export function arrayContainsAll(
  fieldName: string,
  values: Array<Expression | unknown>
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if an array expression contains all the specified elements.
 *
 * ```typescript
 * // Check if the "tags" array contains all of the values: "SciFi", "Adventure", and the value from field "tag1"
 * arrayContainsAll(field("tags"), [field("tag1"), constant("SciFi"), "Adventure"]);
 * ```
 *
 * @param array The array expression to check.
 * @param arrayExpression The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_all' comparison.
 */
export function arrayContainsAll(
  array: Expression,
  arrayExpression: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's array value contains all the specified values or
 * expressions.
 *
 * ```typescript
 * // Check if the 'tags' array contains both of the values from field 'tag1', the value "SciFi", and "Adventure"
 * arrayContainsAll("tags", [field("tag1"), "SciFi", "Adventure"]);
 * ```
 *
 * @param fieldName The field name to check.
 * @param arrayExpression The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_all' comparison.
 */
export function arrayContainsAll(
  fieldName: string,
  arrayExpression: Expression
): BooleanExpression;
export function arrayContainsAll(
  array: Expression | string,
  values: unknown[] | Expression
): BooleanExpression {
  // @ts-ignore implementation accepts both types
  return fieldOrExpression(array).arrayContainsAll(values);
}

/**
 * @beta
 *
 * Creates an expression that calculates the length of an array in a specified field.
 *
 * ```typescript
 * // Get the number of items in field 'cart'
 * arrayLength('cart');
 * ```
 *
 * @param fieldName The name of the field containing an array to calculate the length of.
 * @return A new {@code Expr} representing the length of the array.
 */
export function arrayLength(fieldName: string): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that calculates the length of an array expression.
 *
 * ```typescript
 * // Get the number of items in the 'cart' array
 * arrayLength(field("cart"));
 * ```
 *
 * @param array The array expression to calculate the length of.
 * @return A new {@code Expr} representing the length of the array.
 */
export function arrayLength(array: Expression): FunctionExpression;
export function arrayLength(array: Expression | string): FunctionExpression {
  return fieldOrExpression(array).arrayLength();
}

/**
 * @beta
 *
 * Creates an expression that checks if an expression, when evaluated, is equal to any of the provided values or
 * expressions.
 *
 * ```typescript
 * // Check if the 'category' field is either "Electronics" or value of field 'primaryType'
 * equalAny(field("category"), [constant("Electronics"), field("primaryType")]);
 * ```
 *
 * @param expression The expression whose results to compare.
 * @param values The values to check against.
 * @return A new {@code Expr} representing the 'IN' comparison.
 */
export function equalAny(
  expression: Expression,
  values: Array<Expression | unknown>
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is equal to any of the provided values.
 *
 * ```typescript
 * // Check if the 'category' field is set to a value in the disabledCategories field
 * equalAny(field("category"), field('disabledCategories'));
 * ```
 *
 * @param expression The expression whose results to compare.
 * @param arrayExpression An expression that evaluates to an array, whose elements to check for equality to the input.
 * @return A new {@code Expr} representing the 'IN' comparison.
 */
export function equalAny(
  expression: Expression,
  arrayExpression: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is equal to any of the provided values or
 * expressions.
 *
 * ```typescript
 * // Check if the 'category' field is either "Electronics" or value of field 'primaryType'
 * equalAny("category", [constant("Electronics"), field("primaryType")]);
 * ```
 *
 * @param fieldName The field to compare.
 * @param values The values to check against.
 * @return A new {@code Expr} representing the 'IN' comparison.
 */
export function equalAny(
  fieldName: string,
  values: Array<Expression | unknown>
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is equal to any of the provided values or
 * expressions.
 *
 * ```typescript
 * // Check if the 'category' field is either "Electronics" or value of field 'primaryType'
 * equalAny("category", ["Electronics", field("primaryType")]);
 * ```
 *
 * @param fieldName The field to compare.
 * @param arrayExpression An expression that evaluates to an array, whose elements to check for equality to the input field.
 * @return A new {@code Expr} representing the 'IN' comparison.
 */
export function equalAny(
  fieldName: string,
  arrayExpression: Expression
): BooleanExpression;
export function equalAny(
  element: Expression | string,
  values: unknown[] | Expression
): BooleanExpression {
  // @ts-ignore implementation accepts both types
  return fieldOrExpression(element).equalAny(values);
}

/**
 * @beta
 *
 * Creates an expression that checks if an expression is not equal to any of the provided values
 * or expressions.
 *
 * ```typescript
 * // Check if the 'status' field is neither "pending" nor the value of 'rejectedStatus'
 * notEqualAny(field("status"), ["pending", field("rejectedStatus")]);
 * ```
 *
 * @param element The expression to compare.
 * @param values The values to check against.
 * @return A new {@code Expr} representing the 'NOT IN' comparison.
 */
export function notEqualAny(
  element: Expression,
  values: Array<Expression | unknown>
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is not equal to any of the provided values
 * or expressions.
 *
 * ```typescript
 * // Check if the 'status' field is neither "pending" nor the value of 'rejectedStatus'
 * notEqualAny("status", [constant("pending"), field("rejectedStatus")]);
 * ```
 *
 * @param fieldName The field name to compare.
 * @param values The values to check against.
 * @return A new {@code Expr} representing the 'NOT IN' comparison.
 */
export function notEqualAny(
  fieldName: string,
  values: Array<Expression | unknown>
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is not equal to any of the provided values
 * or expressions.
 *
 * ```typescript
 * // Check if the 'status' field is neither "pending" nor the value of the field 'rejectedStatus'
 * notEqualAny(field("status"), ["pending", field("rejectedStatus")]);
 * ```
 *
 * @param element The expression to compare.
 * @param arrayExpression The values to check against.
 * @return A new {@code Expr} representing the 'NOT IN' comparison.
 */
export function notEqualAny(
  element: Expression,
  arrayExpression: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is not equal to any of the values in the evaluated expression.
 *
 * ```typescript
 * // Check if the 'status' field is not equal to any value in the field 'rejectedStatuses'
 * notEqualAny("status", field("rejectedStatuses"));
 * ```
 *
 * @param fieldName The field name to compare.
 * @param arrayExpression The values to check against.
 * @return A new {@code Expr} representing the 'NOT IN' comparison.
 */
export function notEqualAny(
  fieldName: string,
  arrayExpression: Expression
): BooleanExpression;

export function notEqualAny(
  element: Expression | string,
  values: unknown[] | Expression
): BooleanExpression {
  // @ts-ignore implementation accepts both types
  return fieldOrExpression(element).notEqualAny(values);
}

/**
 * @beta
 *
 * Creates an expression that performs a logical 'XOR' (exclusive OR) operation on multiple BooleanExpressions.
 *
 * ```typescript
 * // Check if only one of the conditions is true: 'age' greater than 18, 'city' is "London",
 * // or 'status' is "active".
 * const condition = xor(
 *     greaterThan("age", 18),
 *     equal("city", "London"),
 *     equal("status", "active"));
 * ```
 *
 * @param first The first condition.
 * @param second The second condition.
 * @param additionalConditions Additional conditions to 'XOR' together.
 * @return A new {@code Expr} representing the logical 'XOR' operation.
 */
export function xor(
  first: BooleanExpression,
  second: BooleanExpression,
  ...additionalConditions: BooleanExpression[]
): BooleanExpression {
  return new BooleanExpression(
    'xor',
    [first, second, ...additionalConditions],
    'xor'
  );
}

/**
 * @beta
 *
 * Creates a conditional expression that evaluates to a 'then' expression if a condition is true
 * and an 'else' expression if the condition is false.
 *
 * ```typescript
 * // If 'age' is greater than 18, return "Adult"; otherwise, return "Minor".
 * conditional(
 *     greaterThan("age", 18), constant("Adult"), constant("Minor"));
 * ```
 *
 * @param condition The condition to evaluate.
 * @param thenExpr The expression to evaluate if the condition is true.
 * @param elseExpr The expression to evaluate if the condition is false.
 * @return A new {@code Expr} representing the conditional expression.
 */
export function conditional(
  condition: BooleanExpression,
  thenExpr: Expression,
  elseExpr: Expression
): FunctionExpression {
  return new FunctionExpression(
    'conditional',
    [condition, thenExpr, elseExpr],
    'conditional'
  );
}

/**
 * @beta
 *
 * Creates an expression that negates a filter condition.
 *
 * ```typescript
 * // Find documents where the 'completed' field is NOT true
 * not(equal("completed", true));
 * ```
 *
 * @param booleanExpr The filter condition to negate.
 * @return A new {@code Expr} representing the negated filter condition.
 */
export function not(booleanExpr: BooleanExpression): BooleanExpression {
  return booleanExpr.not();
}

/**
 * @beta
 *
 * Creates an expression that returns the largest value between multiple input
 * expressions or literal values. Based on Firestore's value type ordering.
 *
 * ```typescript
 * // Returns the largest value between the 'field1' field, the 'field2' field,
 * // and 1000
 * logicalMaximum(field("field1"), field("field2"), 1000);
 * ```
 *
 * @param first The first operand expression.
 * @param second The second expression or literal.
 * @param others Optional additional expressions or literals.
 * @return A new {@code Expr} representing the logical maximum operation.
 */
export function logicalMaximum(
  first: Expression,
  second: Expression | unknown,
  ...others: Array<Expression | unknown>
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that returns the largest value between multiple input
 * expressions or literal values. Based on Firestore's value type ordering.
 *
 * ```typescript
 * // Returns the largest value between the 'field1' field, the 'field2' field,
 * // and 1000.
 * logicalMaximum("field1", field("field2"), 1000);
 * ```
 *
 * @param fieldName The first operand field name.
 * @param second The second expression or literal.
 * @param others Optional additional expressions or literals.
 * @return A new {@code Expr} representing the logical maximum operation.
 */
export function logicalMaximum(
  fieldName: string,
  second: Expression | unknown,
  ...others: Array<Expression | unknown>
): FunctionExpression;

export function logicalMaximum(
  first: Expression | string,
  second: Expression | unknown,
  ...others: Array<Expression | unknown>
): FunctionExpression {
  return fieldOrExpression(first).logicalMaximum(
    valueToDefaultExpr(second),
    ...others.map(value => valueToDefaultExpr(value))
  );
}

/**
 * @beta
 *
 * Creates an expression that returns the smallest value between multiple input
 * expressions and literal values. Based on Firestore's value type ordering.
 *
 * ```typescript
 * // Returns the smallest value between the 'field1' field, the 'field2' field,
 * // and 1000.
 * logicalMinimum(field("field1"), field("field2"), 1000);
 * ```
 *
 * @param first The first operand expression.
 * @param second The second expression or literal.
 * @param others Optional additional expressions or literals.
 * @return A new {@code Expr} representing the logical minimum operation.
 */
export function logicalMinimum(
  first: Expression,
  second: Expression | unknown,
  ...others: Array<Expression | unknown>
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that returns the smallest value between a field's value
 * and other input expressions or literal values.
 * Based on Firestore's value type ordering.
 *
 * ```typescript
 * // Returns the smallest value between the 'field1' field, the 'field2' field,
 * // and 1000.
 * logicalMinimum("field1", field("field2"), 1000);
 * ```
 *
 * @param fieldName The first operand field name.
 * @param second The second expression or literal.
 * @param others Optional additional expressions or literals.
 * @return A new {@code Expr} representing the logical minimum operation.
 */
export function logicalMinimum(
  fieldName: string,
  second: Expression | unknown,
  ...others: Array<Expression | unknown>
): FunctionExpression;

export function logicalMinimum(
  first: Expression | string,
  second: Expression | unknown,
  ...others: Array<Expression | unknown>
): FunctionExpression {
  return fieldOrExpression(first).logicalMinimum(
    valueToDefaultExpr(second),
    ...others.map(value => valueToDefaultExpr(value))
  );
}

/**
 * @beta
 *
 * Creates an expression that checks if a field exists.
 *
 * ```typescript
 * // Check if the document has a field named "phoneNumber"
 * exists(field("phoneNumber"));
 * ```
 *
 * @param value An expression evaluates to the name of the field to check.
 * @return A new {@code Expr} representing the 'exists' check.
 */
export function exists(value: Expression): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field exists.
 *
 * ```typescript
 * // Check if the document has a field named "phoneNumber"
 * exists("phoneNumber");
 * ```
 *
 * @param fieldName The field name to check.
 * @return A new {@code Expr} representing the 'exists' check.
 */
export function exists(fieldName: string): BooleanExpression;
export function exists(valueOrField: Expression | string): BooleanExpression {
  return fieldOrExpression(valueOrField).exists();
}

/**
 * @beta
 *
 * Creates an expression that checks if an expression evaluates to 'NaN' (Not a Number).
 *
 * ```typescript
 * // Check if the result of a calculation is NaN
 * isNaN(field("value").divide(0));
 * ```
 *
 * @param value The expression to check.
 * @return A new {@code Expr} representing the 'isNaN' check.
 */
export function isNan(value: Expression): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value evaluates to 'NaN' (Not a Number).
 *
 * ```typescript
 * // Check if the result of a calculation is NaN
 * isNaN("value");
 * ```
 *
 * @param fieldName The name of the field to check.
 * @return A new {@code Expr} representing the 'isNaN' check.
 */
export function isNan(fieldName: string): BooleanExpression;
export function isNan(value: Expression | string): BooleanExpression {
  return fieldOrExpression(value).isNan();
}

/**
 * @beta
 *
 * Creates an expression that reverses a string.
 *
 * ```typescript
 * // Reverse the value of the 'myString' field.
 * reverse(field("myString"));
 * ```
 *
 * @param stringExpression An expression evaluating to a string value, which will be reversed.
 * @return A new {@code Expr} representing the reversed string.
 */
export function reverse(stringExpression: Expression): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that reverses a string value in the specified field.
 *
 * ```typescript
 * // Reverse the value of the 'myString' field.
 * reverse("myString");
 * ```
 *
 * @param field The name of the field representing the string to reverse.
 * @return A new {@code Expr} representing the reversed string.
 */
export function reverse(field: string): FunctionExpression;
export function reverse(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).reverse();
}

/**
 * @beta
 *
 * Creates an expression that calculates the byte length of a string in UTF-8, or just the length of a Blob.
 *
 * ```typescript
 * // Calculate the length of the 'myString' field in bytes.
 * byteLength(field("myString"));
 * ```
 *
 * @param expr The expression representing the string.
 * @return A new {@code Expr} representing the length of the string in bytes.
 */
export function byteLength(expr: Expression): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that calculates the length of a string represented by a field in UTF-8 bytes, or just the length of a Blob.
 *
 * ```typescript
 * // Calculate the length of the 'myString' field in bytes.
 * byteLength("myString");
 * ```
 *
 * @param fieldName The name of the field containing the string.
 * @return A new {@code Expr} representing the length of the string in bytes.
 */
export function byteLength(fieldName: string): FunctionExpression;
export function byteLength(expr: Expression | string): FunctionExpression {
  const normalizedExpr = fieldOrExpression(expr);
  return normalizedExpr.byteLength();
}

/**
 * Creates an expression that reverses an array.
 *
 * ```typescript
 * // Reverse the value of the 'myArray' field.
 * arrayReverse("myArray");
 * ```
 *
 * @param fieldName The name of the field to reverse.
 * @return A new {@code Expr} representing the reversed array.
 */
export function arrayReverse(fieldName: string): FunctionExpression;

/**
 * Creates an expression that reverses an array.
 *
 * ```typescript
 * // Reverse the value of the 'myArray' field.
 * arrayReverse(field("myArray"));
 * ```
 *
 * @param arrayExpression An expression evaluating to an array value, which will be reversed.
 * @return A new {@code Expr} representing the reversed array.
 */
export function arrayReverse(arrayExpression: Expression): FunctionExpression;
export function arrayReverse(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).arrayReverse();
}

/**
 * Creates an expression that computes e to the power of the expression's result.
 *
 * ```typescript
 * // Compute e to the power of 2.
 * exp(constant(2));
 * ```
 *
 * @return A new {@code Expr} representing the exp of the numeric value.
 */
export function exp(expression: Expression): FunctionExpression;

/**
 * Creates an expression that computes e to the power of the expression's result.
 *
 * ```typescript
 * // Compute e to the power of the 'value' field.
 * exp('value');
 * ```
 *
 * @return A new {@code Expr} representing the exp of the numeric value.
 */
export function exp(fieldName: string): FunctionExpression;

export function exp(
  expressionOrFieldName: Expression | string
): FunctionExpression {
  return fieldOrExpression(expressionOrFieldName).exp();
}

/**
 * Creates an expression that computes the ceiling of a numeric value.
 *
 * ```typescript
 * // Compute the ceiling of the 'price' field.
 * ceil("price");
 * ```
 *
 * @param fieldName The name of the field to compute the ceiling of.
 * @return A new {@code Expr} representing the ceiling of the numeric value.
 */
export function ceil(fieldName: string): FunctionExpression;

/**
 * Creates an expression that computes the ceiling of a numeric value.
 *
 * ```typescript
 * // Compute the ceiling of the 'price' field.
 * ceil(field("price"));
 * ```
 *
 * @param expression An expression evaluating to a numeric value, which the ceiling will be computed for.
 * @return A new {@code Expr} representing the ceiling of the numeric value.
 */
export function ceil(expression: Expression): FunctionExpression;
export function ceil(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).ceil();
}

/**
 * Creates an expression that computes the floor of a numeric value.
 *
 * @param expr The expression to compute the floor of.
 * @return A new {@code Expr} representing the floor of the numeric value.
 */
export function floor(expr: Expression): FunctionExpression;

/**
 * Creates an expression that computes the floor of a numeric value.
 *
 * @param fieldName The name of the field to compute the floor of.
 * @return A new {@code Expr} representing the floor of the numeric value.
 */
export function floor(fieldName: string): FunctionExpression;
export function floor(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).floor();
}

/**
 * Creates an aggregation that counts the number of distinct values of a field.
 *
 * @param expr The expression or field to count distinct values of.
 * @return A new `AggregateFunction` representing the 'count_distinct' aggregation.
 */
export function countDistinct(expr: Expression | string): AggregateFunction {
  return fieldOrExpression(expr).countDistinct();
}

/**
 * @beta
 *
 * Creates an expression that calculates the character length of a string field in UTF8.
 *
 * ```typescript
 * // Get the character length of the 'name' field in UTF-8.
 * strLength("name");
 * ```
 *
 * @param fieldName The name of the field containing the string.
 * @return A new {@code Expr} representing the length of the string.
 */
export function charLength(fieldName: string): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that calculates the character length of a string expression in UTF-8.
 *
 * ```typescript
 * // Get the character length of the 'name' field in UTF-8.
 * strLength(field("name"));
 * ```
 *
 * @param stringExpression The expression representing the string to calculate the length of.
 * @return A new {@code Expr} representing the length of the string.
 */
export function charLength(stringExpression: Expression): FunctionExpression;
export function charLength(value: Expression | string): FunctionExpression {
  const valueExpr = fieldOrExpression(value);
  return valueExpr.charLength();
}

/**
 * @beta
 *
 * Creates an expression that performs a case-sensitive wildcard string comparison against a
 * field.
 *
 * ```typescript
 * // Check if the 'title' field contains the string "guide"
 * like("title", "%guide%");
 * ```
 *
 * @param fieldName The name of the field containing the string.
 * @param pattern The pattern to search for. You can use "%" as a wildcard character.
 * @return A new {@code Expr} representing the 'like' comparison.
 */
export function like(fieldName: string, pattern: string): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that performs a case-sensitive wildcard string comparison against a
 * field.
 *
 * ```typescript
 * // Check if the 'title' field contains the string "guide"
 * like("title", field("pattern"));
 * ```
 *
 * @param fieldName The name of the field containing the string.
 * @param pattern The pattern to search for. You can use "%" as a wildcard character.
 * @return A new {@code Expr} representing the 'like' comparison.
 */
export function like(fieldName: string, pattern: Expression): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that performs a case-sensitive wildcard string comparison.
 *
 * ```typescript
 * // Check if the 'title' field contains the string "guide"
 * like(field("title"), "%guide%");
 * ```
 *
 * @param stringExpression The expression representing the string to perform the comparison on.
 * @param pattern The pattern to search for. You can use "%" as a wildcard character.
 * @return A new {@code Expr} representing the 'like' comparison.
 */
export function like(
  stringExpression: Expression,
  pattern: string
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that performs a case-sensitive wildcard string comparison.
 *
 * ```typescript
 * // Check if the 'title' field contains the string "guide"
 * like(field("title"), field("pattern"));
 * ```
 *
 * @param stringExpression The expression representing the string to perform the comparison on.
 * @param pattern The pattern to search for. You can use "%" as a wildcard character.
 * @return A new {@code Expr} representing the 'like' comparison.
 */
export function like(
  stringExpression: Expression,
  pattern: Expression
): BooleanExpression;
export function like(
  left: Expression | string,
  pattern: Expression | string
): BooleanExpression {
  const leftExpr = fieldOrExpression(left);
  const patternExpr = valueToDefaultExpr(pattern);
  return leftExpr.like(patternExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if a string field contains a specified regular expression as
 * a substring.
 *
 * ```typescript
 * // Check if the 'description' field contains "example" (case-insensitive)
 * regexContains("description", "(?i)example");
 * ```
 *
 * @param fieldName The name of the field containing the string.
 * @param pattern The regular expression to use for the search.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function regexContains(
  fieldName: string,
  pattern: string
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a string field contains a specified regular expression as
 * a substring.
 *
 * ```typescript
 * // Check if the 'description' field contains "example" (case-insensitive)
 * regexContains("description", field("pattern"));
 * ```
 *
 * @param fieldName The name of the field containing the string.
 * @param pattern The regular expression to use for the search.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function regexContains(
  fieldName: string,
  pattern: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression contains a specified regular
 * expression as a substring.
 *
 * ```typescript
 * // Check if the 'description' field contains "example" (case-insensitive)
 * regexContains(field("description"), "(?i)example");
 * ```
 *
 * @param stringExpression The expression representing the string to perform the comparison on.
 * @param pattern The regular expression to use for the search.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function regexContains(
  stringExpression: Expression,
  pattern: string
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression contains a specified regular
 * expression as a substring.
 *
 * ```typescript
 * // Check if the 'description' field contains "example" (case-insensitive)
 * regexContains(field("description"), field("pattern"));
 * ```
 *
 * @param stringExpression The expression representing the string to perform the comparison on.
 * @param pattern The regular expression to use for the search.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function regexContains(
  stringExpression: Expression,
  pattern: Expression
): BooleanExpression;
export function regexContains(
  left: Expression | string,
  pattern: Expression | string
): BooleanExpression {
  const leftExpr = fieldOrExpression(left);
  const patternExpr = valueToDefaultExpr(pattern);
  return leftExpr.regexContains(patternExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if a string field matches a specified regular expression.
 *
 * ```typescript
 * // Check if the 'email' field matches a valid email pattern
 * regexMatch("email", "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
 * ```
 *
 * @param fieldName The name of the field containing the string.
 * @param pattern The regular expression to use for the match.
 * @return A new {@code Expr} representing the regular expression match.
 */
export function regexMatch(
  fieldName: string,
  pattern: string
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a string field matches a specified regular expression.
 *
 * ```typescript
 * // Check if the 'email' field matches a valid email pattern
 * regexMatch("email", field("pattern"));
 * ```
 *
 * @param fieldName The name of the field containing the string.
 * @param pattern The regular expression to use for the match.
 * @return A new {@code Expr} representing the regular expression match.
 */
export function regexMatch(
  fieldName: string,
  pattern: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression matches a specified regular
 * expression.
 *
 * ```typescript
 * // Check if the 'email' field matches a valid email pattern
 * regexMatch(field("email"), "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
 * ```
 *
 * @param stringExpression The expression representing the string to match against.
 * @param pattern The regular expression to use for the match.
 * @return A new {@code Expr} representing the regular expression match.
 */
export function regexMatch(
  stringExpression: Expression,
  pattern: string
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression matches a specified regular
 * expression.
 *
 * ```typescript
 * // Check if the 'email' field matches a valid email pattern
 * regexMatch(field("email"), field("pattern"));
 * ```
 *
 * @param stringExpression The expression representing the string to match against.
 * @param pattern The regular expression to use for the match.
 * @return A new {@code Expr} representing the regular expression match.
 */
export function regexMatch(
  stringExpression: Expression,
  pattern: Expression
): BooleanExpression;
export function regexMatch(
  left: Expression | string,
  pattern: Expression | string
): BooleanExpression {
  const leftExpr = fieldOrExpression(left);
  const patternExpr = valueToDefaultExpr(pattern);
  return leftExpr.regexMatch(patternExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if a string field contains a specified substring.
 *
 * ```typescript
 * // Check if the 'description' field contains "example".
 * stringContains("description", "example");
 * ```
 *
 * @param fieldName The name of the field containing the string.
 * @param substring The substring to search for.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function stringContains(
  fieldName: string,
  substring: string
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a string field contains a substring specified by an expression.
 *
 * ```typescript
 * // Check if the 'description' field contains the value of the 'keyword' field.
 * stringContains("description", field("keyword"));
 * ```
 *
 * @param fieldName The name of the field containing the string.
 * @param substring The expression representing the substring to search for.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function stringContains(
  fieldName: string,
  substring: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression contains a specified substring.
 *
 * ```typescript
 * // Check if the 'description' field contains "example".
 * stringContains(field("description"), "example");
 * ```
 *
 * @param stringExpression The expression representing the string to perform the comparison on.
 * @param substring The substring to search for.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function stringContains(
  stringExpression: Expression,
  substring: string
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression contains a substring specified by another expression.
 *
 * ```typescript
 * // Check if the 'description' field contains the value of the 'keyword' field.
 * stringContains(field("description"), field("keyword"));
 * ```
 *
 * @param stringExpression The expression representing the string to perform the comparison on.
 * @param substring The expression representing the substring to search for.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function stringContains(
  stringExpression: Expression,
  substring: Expression
): BooleanExpression;
export function stringContains(
  left: Expression | string,
  substring: Expression | string
): BooleanExpression {
  const leftExpr = fieldOrExpression(left);
  const substringExpr = valueToDefaultExpr(substring);
  return leftExpr.stringContains(substringExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if a field's value starts with a given prefix.
 *
 * ```typescript
 * // Check if the 'name' field starts with "Mr."
 * startsWith("name", "Mr.");
 * ```
 *
 * @param fieldName The field name to check.
 * @param prefix The prefix to check for.
 * @return A new {@code Expr} representing the 'starts with' comparison.
 */
export function startsWith(
  fieldName: string,
  prefix: string
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value starts with a given prefix.
 *
 * ```typescript
 * // Check if the 'fullName' field starts with the value of the 'firstName' field
 * startsWith("fullName", field("firstName"));
 * ```
 *
 * @param fieldName The field name to check.
 * @param prefix The expression representing the prefix.
 * @return A new {@code Expr} representing the 'starts with' comparison.
 */
export function startsWith(
  fieldName: string,
  prefix: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression starts with a given prefix.
 *
 * ```typescript
 * // Check if the result of concatenating 'firstName' and 'lastName' fields starts with "Mr."
 * startsWith(field("fullName"), "Mr.");
 * ```
 *
 * @param stringExpression The expression to check.
 * @param prefix The prefix to check for.
 * @return A new {@code Expr} representing the 'starts with' comparison.
 */
export function startsWith(
  stringExpression: Expression,
  prefix: string
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression starts with a given prefix.
 *
 * ```typescript
 * // Check if the result of concatenating 'firstName' and 'lastName' fields starts with "Mr."
 * startsWith(field("fullName"), field("prefix"));
 * ```
 *
 * @param stringExpression The expression to check.
 * @param prefix The prefix to check for.
 * @return A new {@code Expr} representing the 'starts with' comparison.
 */
export function startsWith(
  stringExpression: Expression,
  prefix: Expression
): BooleanExpression;
export function startsWith(
  expr: Expression | string,
  prefix: Expression | string
): BooleanExpression {
  return fieldOrExpression(expr).startsWith(valueToDefaultExpr(prefix));
}

/**
 * @beta
 *
 * Creates an expression that checks if a field's value ends with a given postfix.
 *
 * ```typescript
 * // Check if the 'filename' field ends with ".txt"
 * endsWith("filename", ".txt");
 * ```
 *
 * @param fieldName The field name to check.
 * @param suffix The postfix to check for.
 * @return A new {@code Expr} representing the 'ends with' comparison.
 */
export function endsWith(fieldName: string, suffix: string): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value ends with a given postfix.
 *
 * ```typescript
 * // Check if the 'url' field ends with the value of the 'extension' field
 * endsWith("url", field("extension"));
 * ```
 *
 * @param fieldName The field name to check.
 * @param suffix The expression representing the postfix.
 * @return A new {@code Expr} representing the 'ends with' comparison.
 */
export function endsWith(
  fieldName: string,
  suffix: Expression
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression ends with a given postfix.
 *
 * ```typescript
 * // Check if the result of concatenating 'firstName' and 'lastName' fields ends with "Jr."
 * endsWith(field("fullName"), "Jr.");
 * ```
 *
 * @param stringExpression The expression to check.
 * @param suffix The postfix to check for.
 * @return A new {@code Expr} representing the 'ends with' comparison.
 */
export function endsWith(
  stringExpression: Expression,
  suffix: string
): BooleanExpression;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression ends with a given postfix.
 *
 * ```typescript
 * // Check if the result of concatenating 'firstName' and 'lastName' fields ends with "Jr."
 * endsWith(field("fullName"), constant("Jr."));
 * ```
 *
 * @param stringExpression The expression to check.
 * @param suffix The postfix to check for.
 * @return A new {@code Expr} representing the 'ends with' comparison.
 */
export function endsWith(
  stringExpression: Expression,
  suffix: Expression
): BooleanExpression;
export function endsWith(
  expr: Expression | string,
  suffix: Expression | string
): BooleanExpression {
  return fieldOrExpression(expr).endsWith(valueToDefaultExpr(suffix));
}

/**
 * @beta
 *
 * Creates an expression that converts a string field to lowercase.
 *
 * ```typescript
 * // Convert the 'name' field to lowercase
 * toLower("name");
 * ```
 *
 * @param fieldName The name of the field containing the string.
 * @return A new {@code Expr} representing the lowercase string.
 */
export function toLower(fieldName: string): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that converts a string expression to lowercase.
 *
 * ```typescript
 * // Convert the 'name' field to lowercase
 * toLower(field("name"));
 * ```
 *
 * @param stringExpression The expression representing the string to convert to lowercase.
 * @return A new {@code Expr} representing the lowercase string.
 */
export function toLower(stringExpression: Expression): FunctionExpression;
export function toLower(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).toLower();
}

/**
 * @beta
 *
 * Creates an expression that converts a string field to uppercase.
 *
 * ```typescript
 * // Convert the 'title' field to uppercase
 * toUpper("title");
 * ```
 *
 * @param fieldName The name of the field containing the string.
 * @return A new {@code Expr} representing the uppercase string.
 */
export function toUpper(fieldName: string): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that converts a string expression to uppercase.
 *
 * ```typescript
 * // Convert the 'title' field to uppercase
 * toUppercase(field("title"));
 * ```
 *
 * @param stringExpression The expression representing the string to convert to uppercase.
 * @return A new {@code Expr} representing the uppercase string.
 */
export function toUpper(stringExpression: Expression): FunctionExpression;
export function toUpper(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).toUpper();
}

/**
 * @beta
 *
 * Creates an expression that removes leading and trailing whitespace from a string field.
 *
 * ```typescript
 * // Trim whitespace from the 'userInput' field
 * trim("userInput");
 * ```
 *
 * @param fieldName The name of the field containing the string.
 * @return A new {@code Expr} representing the trimmed string.
 */
export function trim(fieldName: string): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that removes leading and trailing whitespace from a string expression.
 *
 * ```typescript
 * // Trim whitespace from the 'userInput' field
 * trim(field("userInput"));
 * ```
 *
 * @param stringExpression The expression representing the string to trim.
 * @return A new {@code Expr} representing the trimmed string.
 */
export function trim(stringExpression: Expression): FunctionExpression;
export function trim(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).trim();
}

/**
 * @beta
 *
 * Creates an expression that concatenates string functions, fields or constants together.
 *
 * ```typescript
 * // Combine the 'firstName', " ", and 'lastName' fields into a single string
 * stringConcat("firstName", " ", field("lastName"));
 * ```
 *
 * @param fieldName The field name containing the initial string value.
 * @param secondString An expression or string literal to concatenate.
 * @param otherStrings Optional additional expressions or literals (typically strings) to concatenate.
 * @return A new {@code Expr} representing the concatenated string.
 */
export function stringConcat(
  fieldName: string,
  secondString: Expression | string,
  ...otherStrings: Array<Expression | string>
): FunctionExpression;

/**
 * @beta
 * Creates an expression that concatenates string expressions together.
 *
 * ```typescript
 * // Combine the 'firstName', " ", and 'lastName' fields into a single string
 * stringConcat(field("firstName"), " ", field("lastName"));
 * ```
 *
 * @param firstString The initial string expression to concatenate to.
 * @param secondString An expression or string literal to concatenate.
 * @param otherStrings Optional additional expressions or literals (typically strings) to concatenate.
 * @return A new {@code Expr} representing the concatenated string.
 */
export function stringConcat(
  firstString: Expression,
  secondString: Expression | string,
  ...otherStrings: Array<Expression | string>
): FunctionExpression;
export function stringConcat(
  first: string | Expression,
  second: string | Expression,
  ...elements: Array<string | Expression>
): FunctionExpression {
  return fieldOrExpression(first).stringConcat(
    valueToDefaultExpr(second),
    ...elements.map(valueToDefaultExpr)
  );
}

/**
 * @beta
 *
 * Accesses a value from a map (object) field using the provided key.
 *
 * ```typescript
 * // Get the 'city' value from the 'address' map field
 * mapGet("address", "city");
 * ```
 *
 * @param fieldName The field name of the map field.
 * @param subField The key to access in the map.
 * @return A new {@code Expr} representing the value associated with the given key in the map.
 */
export function mapGet(fieldName: string, subField: string): FunctionExpression;

/**
 * @beta
 *
 * Accesses a value from a map (object) expression using the provided key.
 *
 * ```typescript
 * // Get the 'city' value from the 'address' map field
 * mapGet(field("address"), "city");
 * ```
 *
 * @param mapExpression The expression representing the map.
 * @param subField The key to access in the map.
 * @return A new {@code Expr} representing the value associated with the given key in the map.
 */
export function mapGet(
  mapExpression: Expression,
  subField: string
): FunctionExpression;
export function mapGet(
  fieldOrExpr: string | Expression,
  subField: string
): FunctionExpression {
  return fieldOrExpression(fieldOrExpr).mapGet(subField);
}

/**
 * @beta
 *
 * Creates an aggregation that counts the total number of stage inputs.
 *
 * ```typescript
 * // Count the total number of input documents
 * countAll().as("totalDocument");
 * ```
 *
 * @return A new {@code AggregateFunction} representing the 'countAll' aggregation.
 */
export function countAll(): AggregateFunction {
  return new AggregateFunction('count', [], 'count');
}

/**
 * @beta
 *
 * Creates an aggregation that counts the number of stage inputs with valid evaluations of the
 * provided expression.
 *
 * ```typescript
 * // Count the number of items where the price is greater than 10
 * count(field("price").greaterThan(10)).as("expensiveItemCount");
 * ```
 *
 * @param expression The expression to count.
 * @return A new {@code AggregateFunction} representing the 'count' aggregation.
 */
export function count(expression: Expression): AggregateFunction;

/**
 * Creates an aggregation that counts the number of stage inputs where the input field exists.
 *
 * ```typescript
 * // Count the total number of products
 * count("productId").as("totalProducts");
 * ```
 *
 * @param fieldName The name of the field to count.
 * @return A new {@code AggregateFunction} representing the 'count' aggregation.
 */
export function count(fieldName: string): AggregateFunction;
export function count(value: Expression | string): AggregateFunction {
  return fieldOrExpression(value).count();
}

/**
 * @beta
 *
 * Creates an aggregation that calculates the sum of values from an expression across multiple
 * stage inputs.
 *
 * ```typescript
 * // Calculate the total revenue from a set of orders
 * sum(field("orderAmount")).as("totalRevenue");
 * ```
 *
 * @param expression The expression to sum up.
 * @return A new {@code AggregateFunction} representing the 'sum' aggregation.
 */
export function sum(expression: Expression): AggregateFunction;

/**
 * @beta
 *
 * Creates an aggregation that calculates the sum of a field's values across multiple stage
 * inputs.
 *
 * ```typescript
 * // Calculate the total revenue from a set of orders
 * sum("orderAmount").as("totalRevenue");
 * ```
 *
 * @param fieldName The name of the field containing numeric values to sum up.
 * @return A new {@code AggregateFunction} representing the 'sum' aggregation.
 */
export function sum(fieldName: string): AggregateFunction;
export function sum(value: Expression | string): AggregateFunction {
  return fieldOrExpression(value).sum();
}

/**
 * @beta
 *
 * Creates an aggregation that calculates the average (mean) of values from an expression across
 * multiple stage inputs.
 *
 * ```typescript
 * // Calculate the average age of users
 * average(field("age")).as("averageAge");
 * ```
 *
 * @param expression The expression representing the values to average.
 * @return A new {@code AggregateFunction} representing the 'average' aggregation.
 */
export function average(expression: Expression): AggregateFunction;

/**
 * @beta
 *
 * Creates an aggregation that calculates the average (mean) of a field's values across multiple
 * stage inputs.
 *
 * ```typescript
 * // Calculate the average age of users
 * average("age").as("averageAge");
 * ```
 *
 * @param fieldName The name of the field containing numeric values to average.
 * @return A new {@code AggregateFunction} representing the 'average' aggregation.
 */
export function average(fieldName: string): AggregateFunction;
export function average(value: Expression | string): AggregateFunction {
  return fieldOrExpression(value).average();
}

/**
 * @beta
 *
 * Creates an aggregation that finds the minimum value of an expression across multiple stage
 * inputs.
 *
 * ```typescript
 * // Find the lowest price of all products
 * minimum(field("price")).as("lowestPrice");
 * ```
 *
 * @param expression The expression to find the minimum value of.
 * @return A new {@code AggregateFunction} representing the 'minimum' aggregation.
 */
export function minimum(expression: Expression): AggregateFunction;

/**
 * @beta
 *
 * Creates an aggregation that finds the minimum value of a field across multiple stage inputs.
 *
 * ```typescript
 * // Find the lowest price of all products
 * minimum("price").as("lowestPrice");
 * ```
 *
 * @param fieldName The name of the field to find the minimum value of.
 * @return A new {@code AggregateFunction} representing the 'minimum' aggregation.
 */
export function minimum(fieldName: string): AggregateFunction;
export function minimum(value: Expression | string): AggregateFunction {
  return fieldOrExpression(value).minimum();
}

/**
 * @beta
 *
 * Creates an aggregation that finds the maximum value of an expression across multiple stage
 * inputs.
 *
 * ```typescript
 * // Find the highest score in a leaderboard
 * maximum(field("score")).as("highestScore");
 * ```
 *
 * @param expression The expression to find the maximum value of.
 * @return A new {@code AggregateFunction} representing the 'maximum' aggregation.
 */
export function maximum(expression: Expression): AggregateFunction;

/**
 * @beta
 *
 * Creates an aggregation that finds the maximum value of a field across multiple stage inputs.
 *
 * ```typescript
 * // Find the highest score in a leaderboard
 * maximum("score").as("highestScore");
 * ```
 *
 * @param fieldName The name of the field to find the maximum value of.
 * @return A new {@code AggregateFunction} representing the 'maximum' aggregation.
 */
export function maximum(fieldName: string): AggregateFunction;
export function maximum(value: Expression | string): AggregateFunction {
  return fieldOrExpression(value).maximum();
}

/**
 * @beta
 *
 * Calculates the Cosine distance between a field's vector value and a literal vector value.
 *
 * ```typescript
 * // Calculate the Cosine distance between the 'location' field and a target location
 * cosineDistance("location", [37.7749, -122.4194]);
 * ```
 *
 * @param fieldName The name of the field containing the first vector.
 * @param vector The other vector (as an array of doubles) or {@link VectorValue} to compare against.
 * @return A new {@code Expr} representing the Cosine distance between the two vectors.
 */
export function cosineDistance(
  fieldName: string,
  vector: number[] | VectorValue
): FunctionExpression;

/**
 * @beta
 *
 * Calculates the Cosine distance between a field's vector value and a vector expression.
 *
 * ```typescript
 * // Calculate the cosine distance between the 'userVector' field and the 'itemVector' field
 * cosineDistance("userVector", field("itemVector"));
 * ```
 *
 * @param fieldName The name of the field containing the first vector.
 * @param vectorExpression The other vector (represented as an Expr) to compare against.
 * @return A new {@code Expr} representing the cosine distance between the two vectors.
 */
export function cosineDistance(
  fieldName: string,
  vectorExpression: Expression
): FunctionExpression;

/**
 * @beta
 *
 * Calculates the Cosine distance between a vector expression and a vector literal.
 *
 * ```typescript
 * // Calculate the cosine distance between the 'location' field and a target location
 * cosineDistance(field("location"), [37.7749, -122.4194]);
 * ```
 *
 * @param vectorExpression The first vector (represented as an Expr) to compare against.
 * @param vector The other vector (as an array of doubles or VectorValue) to compare against.
 * @return A new {@code Expr} representing the cosine distance between the two vectors.
 */
export function cosineDistance(
  vectorExpression: Expression,
  vector: number[] | VectorValue
): FunctionExpression;

/**
 * @beta
 *
 * Calculates the Cosine distance between two vector expressions.
 *
 * ```typescript
 * // Calculate the cosine distance between the 'userVector' field and the 'itemVector' field
 * cosineDistance(field("userVector"), field("itemVector"));
 * ```
 *
 * @param vectorExpression The first vector (represented as an Expr) to compare against.
 * @param otherVectorExpression The other vector (represented as an Expr) to compare against.
 * @return A new {@code Expr} representing the cosine distance between the two vectors.
 */
export function cosineDistance(
  vectorExpression: Expression,
  otherVectorExpression: Expression
): FunctionExpression;
export function cosineDistance(
  expr: Expression | string,
  other: Expression | number[] | VectorValue
): FunctionExpression {
  const expr1 = fieldOrExpression(expr);
  const expr2 = vectorToExpr(other);
  return expr1.cosineDistance(expr2);
}

/**
 * @beta
 *
 * Calculates the dot product between a field's vector value and a double array.
 *
 * ```typescript
 * // Calculate the dot product distance between a feature vector and a target vector
 * dotProduct("features", [0.5, 0.8, 0.2]);
 * ```
 *
 * @param fieldName The name of the field containing the first vector.
 * @param vector The other vector (as an array of doubles or VectorValue) to calculate with.
 * @return A new {@code Expr} representing the dot product between the two vectors.
 */
export function dotProduct(
  fieldName: string,
  vector: number[] | VectorValue
): FunctionExpression;

/**
 * @beta
 *
 * Calculates the dot product between a field's vector value and a vector expression.
 *
 * ```typescript
 * // Calculate the dot product distance between two document vectors: 'docVector1' and 'docVector2'
 * dotProduct("docVector1", field("docVector2"));
 * ```
 *
 * @param fieldName The name of the field containing the first vector.
 * @param vectorExpression The other vector (represented as an Expr) to calculate with.
 * @return A new {@code Expr} representing the dot product between the two vectors.
 */
export function dotProduct(
  fieldName: string,
  vectorExpression: Expression
): FunctionExpression;

/**
 * @beta
 *
 * Calculates the dot product between a vector expression and a double array.
 *
 * ```typescript
 * // Calculate the dot product between a feature vector and a target vector
 * dotProduct(field("features"), [0.5, 0.8, 0.2]);
 * ```
 *
 * @param vectorExpression The first vector (represented as an Expr) to calculate with.
 * @param vector The other vector (as an array of doubles or VectorValue) to calculate with.
 * @return A new {@code Expr} representing the dot product between the two vectors.
 */
export function dotProduct(
  vectorExpression: Expression,
  vector: number[] | VectorValue
): FunctionExpression;

/**
 * @beta
 *
 * Calculates the dot product between two vector expressions.
 *
 * ```typescript
 * // Calculate the dot product between two document vectors: 'docVector1' and 'docVector2'
 * dotProduct(field("docVector1"), field("docVector2"));
 * ```
 *
 * @param vectorExpression The first vector (represented as an Expr) to calculate with.
 * @param otherVectorExpression The other vector (represented as an Expr) to calculate with.
 * @return A new {@code Expr} representing the dot product between the two vectors.
 */
export function dotProduct(
  vectorExpression: Expression,
  otherVectorExpression: Expression
): FunctionExpression;
export function dotProduct(
  expr: Expression | string,
  other: Expression | number[] | VectorValue
): FunctionExpression {
  const expr1 = fieldOrExpression(expr);
  const expr2 = vectorToExpr(other);
  return expr1.dotProduct(expr2);
}

/**
 * @beta
 *
 * Calculates the Euclidean distance between a field's vector value and a double array.
 *
 * ```typescript
 * // Calculate the Euclidean distance between the 'location' field and a target location
 * euclideanDistance("location", [37.7749, -122.4194]);
 * ```
 *
 * @param fieldName The name of the field containing the first vector.
 * @param vector The other vector (as an array of doubles or VectorValue) to compare against.
 * @return A new {@code Expr} representing the Euclidean distance between the two vectors.
 */
export function euclideanDistance(
  fieldName: string,
  vector: number[] | VectorValue
): FunctionExpression;

/**
 * @beta
 *
 * Calculates the Euclidean distance between a field's vector value and a vector expression.
 *
 * ```typescript
 * // Calculate the Euclidean distance between two vector fields: 'pointA' and 'pointB'
 * euclideanDistance("pointA", field("pointB"));
 * ```
 *
 * @param fieldName The name of the field containing the first vector.
 * @param vectorExpression The other vector (represented as an Expr) to compare against.
 * @return A new {@code Expr} representing the Euclidean distance between the two vectors.
 */
export function euclideanDistance(
  fieldName: string,
  vectorExpression: Expression
): FunctionExpression;

/**
 * @beta
 *
 * Calculates the Euclidean distance between a vector expression and a double array.
 *
 * ```typescript
 * // Calculate the Euclidean distance between the 'location' field and a target location
 *
 * euclideanDistance(field("location"), [37.7749, -122.4194]);
 * ```
 *
 * @param vectorExpression The first vector (represented as an Expr) to compare against.
 * @param vector The other vector (as an array of doubles or VectorValue) to compare against.
 * @return A new {@code Expr} representing the Euclidean distance between the two vectors.
 */
export function euclideanDistance(
  vectorExpression: Expression,
  vector: number[] | VectorValue
): FunctionExpression;

/**
 * @beta
 *
 * Calculates the Euclidean distance between two vector expressions.
 *
 * ```typescript
 * // Calculate the Euclidean distance between two vector fields: 'pointA' and 'pointB'
 * euclideanDistance(field("pointA"), field("pointB"));
 * ```
 *
 * @param vectorExpression The first vector (represented as an Expr) to compare against.
 * @param otherVectorExpression The other vector (represented as an Expr) to compare against.
 * @return A new {@code Expr} representing the Euclidean distance between the two vectors.
 */
export function euclideanDistance(
  vectorExpression: Expression,
  otherVectorExpression: Expression
): FunctionExpression;
export function euclideanDistance(
  expr: Expression | string,
  other: Expression | number[] | VectorValue
): FunctionExpression {
  const expr1 = fieldOrExpression(expr);
  const expr2 = vectorToExpr(other);
  return expr1.euclideanDistance(expr2);
}

/**
 * @beta
 *
 * Creates an expression that calculates the length of a Firestore Vector.
 *
 * ```typescript
 * // Get the vector length (dimension) of the field 'embedding'.
 * vectorLength(field("embedding"));
 * ```
 *
 * @param vectorExpression The expression representing the Firestore Vector.
 * @return A new {@code Expr} representing the length of the array.
 */
export function vectorLength(vectorExpression: Expression): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that calculates the length of a Firestore Vector represented by a field.
 *
 * ```typescript
 * // Get the vector length (dimension) of the field 'embedding'.
 * vectorLength("embedding");
 * ```
 *
 * @param fieldName The name of the field representing the Firestore Vector.
 * @return A new {@code Expr} representing the length of the array.
 */
export function vectorLength(fieldName: string): FunctionExpression;
export function vectorLength(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).vectorLength();
}

/**
 * @beta
 *
 * Creates an expression that interprets an expression as the number of microseconds since the Unix epoch (1970-01-01 00:00:00 UTC)
 * and returns a timestamp.
 *
 * ```typescript
 * // Interpret the 'microseconds' field as microseconds since epoch.
 * unixMicrosToTimestamp(field("microseconds"));
 * ```
 *
 * @param expr The expression representing the number of microseconds since epoch.
 * @return A new {@code Expr} representing the timestamp.
 */
export function unixMicrosToTimestamp(expr: Expression): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that interprets a field's value as the number of microseconds since the Unix epoch (1970-01-01 00:00:00 UTC)
 * and returns a timestamp.
 *
 * ```typescript
 * // Interpret the 'microseconds' field as microseconds since epoch.
 * unixMicrosToTimestamp("microseconds");
 * ```
 *
 * @param fieldName The name of the field representing the number of microseconds since epoch.
 * @return A new {@code Expr} representing the timestamp.
 */
export function unixMicrosToTimestamp(fieldName: string): FunctionExpression;
export function unixMicrosToTimestamp(
  expr: Expression | string
): FunctionExpression {
  return fieldOrExpression(expr).unixMicrosToTimestamp();
}

/**
 * @beta
 *
 * Creates an expression that converts a timestamp expression to the number of microseconds since the Unix epoch (1970-01-01 00:00:00 UTC).
 *
 * ```typescript
 * // Convert the 'timestamp' field to microseconds since epoch.
 * timestampToUnixMicros(field("timestamp"));
 * ```
 *
 * @param expr The expression representing the timestamp.
 * @return A new {@code Expr} representing the number of microseconds since epoch.
 */
export function timestampToUnixMicros(expr: Expression): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that converts a timestamp field to the number of microseconds since the Unix epoch (1970-01-01 00:00:00 UTC).
 *
 * ```typescript
 * // Convert the 'timestamp' field to microseconds since epoch.
 * timestampToUnixMicros("timestamp");
 * ```
 *
 * @param fieldName The name of the field representing the timestamp.
 * @return A new {@code Expr} representing the number of microseconds since epoch.
 */
export function timestampToUnixMicros(fieldName: string): FunctionExpression;
export function timestampToUnixMicros(
  expr: Expression | string
): FunctionExpression {
  return fieldOrExpression(expr).timestampToUnixMicros();
}

/**
 * @beta
 *
 * Creates an expression that interprets an expression as the number of milliseconds since the Unix epoch (1970-01-01 00:00:00 UTC)
 * and returns a timestamp.
 *
 * ```typescript
 * // Interpret the 'milliseconds' field as milliseconds since epoch.
 * unixMillisToTimestamp(field("milliseconds"));
 * ```
 *
 * @param expr The expression representing the number of milliseconds since epoch.
 * @return A new {@code Expr} representing the timestamp.
 */
export function unixMillisToTimestamp(expr: Expression): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that interprets a field's value as the number of milliseconds since the Unix epoch (1970-01-01 00:00:00 UTC)
 * and returns a timestamp.
 *
 * ```typescript
 * // Interpret the 'milliseconds' field as milliseconds since epoch.
 * unixMillisToTimestamp("milliseconds");
 * ```
 *
 * @param fieldName The name of the field representing the number of milliseconds since epoch.
 * @return A new {@code Expr} representing the timestamp.
 */
export function unixMillisToTimestamp(fieldName: string): FunctionExpression;
export function unixMillisToTimestamp(
  expr: Expression | string
): FunctionExpression {
  const normalizedExpr = fieldOrExpression(expr);
  return normalizedExpr.unixMillisToTimestamp();
}

/**
 * @beta
 *
 * Creates an expression that converts a timestamp expression to the number of milliseconds since the Unix epoch (1970-01-01 00:00:00 UTC).
 *
 * ```typescript
 * // Convert the 'timestamp' field to milliseconds since epoch.
 * timestampToUnixMillis(field("timestamp"));
 * ```
 *
 * @param expr The expression representing the timestamp.
 * @return A new {@code Expr} representing the number of milliseconds since epoch.
 */
export function timestampToUnixMillis(expr: Expression): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that converts a timestamp field to the number of milliseconds since the Unix epoch (1970-01-01 00:00:00 UTC).
 *
 * ```typescript
 * // Convert the 'timestamp' field to milliseconds since epoch.
 * timestampToUnixMillis("timestamp");
 * ```
 *
 * @param fieldName The name of the field representing the timestamp.
 * @return A new {@code Expr} representing the number of milliseconds since epoch.
 */
export function timestampToUnixMillis(fieldName: string): FunctionExpression;
export function timestampToUnixMillis(
  expr: Expression | string
): FunctionExpression {
  const normalizedExpr = fieldOrExpression(expr);
  return normalizedExpr.timestampToUnixMillis();
}

/**
 * @beta
 *
 * Creates an expression that interprets an expression as the number of seconds since the Unix epoch (1970-01-01 00:00:00 UTC)
 * and returns a timestamp.
 *
 * ```typescript
 * // Interpret the 'seconds' field as seconds since epoch.
 * unixSecondsToTimestamp(field("seconds"));
 * ```
 *
 * @param expr The expression representing the number of seconds since epoch.
 * @return A new {@code Expr} representing the timestamp.
 */
export function unixSecondsToTimestamp(expr: Expression): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that interprets a field's value as the number of seconds since the Unix epoch (1970-01-01 00:00:00 UTC)
 * and returns a timestamp.
 *
 * ```typescript
 * // Interpret the 'seconds' field as seconds since epoch.
 * unixSecondsToTimestamp("seconds");
 * ```
 *
 * @param fieldName The name of the field representing the number of seconds since epoch.
 * @return A new {@code Expr} representing the timestamp.
 */
export function unixSecondsToTimestamp(fieldName: string): FunctionExpression;
export function unixSecondsToTimestamp(
  expr: Expression | string
): FunctionExpression {
  const normalizedExpr = fieldOrExpression(expr);
  return normalizedExpr.unixSecondsToTimestamp();
}

/**
 * @beta
 *
 * Creates an expression that converts a timestamp expression to the number of seconds since the Unix epoch (1970-01-01 00:00:00 UTC).
 *
 * ```typescript
 * // Convert the 'timestamp' field to seconds since epoch.
 * timestampToUnixSeconds(field("timestamp"));
 * ```
 *
 * @param expr The expression representing the timestamp.
 * @return A new {@code Expr} representing the number of seconds since epoch.
 */
export function timestampToUnixSeconds(expr: Expression): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that converts a timestamp field to the number of seconds since the Unix epoch (1970-01-01 00:00:00 UTC).
 *
 * ```typescript
 * // Convert the 'timestamp' field to seconds since epoch.
 * timestampToUnixSeconds("timestamp");
 * ```
 *
 * @param fieldName The name of the field representing the timestamp.
 * @return A new {@code Expr} representing the number of seconds since epoch.
 */
export function timestampToUnixSeconds(fieldName: string): FunctionExpression;
export function timestampToUnixSeconds(
  expr: Expression | string
): FunctionExpression {
  const normalizedExpr = fieldOrExpression(expr);
  return normalizedExpr.timestampToUnixSeconds();
}

/**
 * @beta
 *
 * Creates an expression that adds a specified amount of time to a timestamp.
 *
 * ```typescript
 * // Add some duration determined by field 'unit' and 'amount' to the 'timestamp' field.
 * timestampAdd(field("timestamp"), field("unit"), field("amount"));
 * ```
 *
 * @param timestamp The expression representing the timestamp.
 * @param unit The expression evaluates to unit of time, must be one of 'microsecond', 'millisecond', 'second', 'minute', 'hour', 'day'.
 * @param amount The expression evaluates to amount of the unit.
 * @return A new {@code Expr} representing the resulting timestamp.
 */
export function timestampAdd(
  timestamp: Expression,
  unit: Expression,
  amount: Expression
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that adds a specified amount of time to a timestamp.
 *
 * ```typescript
 * // Add 1 day to the 'timestamp' field.
 * timestampAdd(field("timestamp"), "day", 1);
 * ```
 *
 * @param timestamp The expression representing the timestamp.
 * @param unit The unit of time to add (e.g., "day", "hour").
 * @param amount The amount of time to add.
 * @return A new {@code Expr} representing the resulting timestamp.
 */
export function timestampAdd(
  timestamp: Expression,
  unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
  amount: number
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that adds a specified amount of time to a timestamp represented by a field.
 *
 * ```typescript
 * // Add 1 day to the 'timestamp' field.
 * timestampAdd("timestamp", "day", 1);
 * ```
 *
 * @param fieldName The name of the field representing the timestamp.
 * @param unit The unit of time to add (e.g., "day", "hour").
 * @param amount The amount of time to add.
 * @return A new {@code Expr} representing the resulting timestamp.
 */
export function timestampAdd(
  fieldName: string,
  unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
  amount: number
): FunctionExpression;
export function timestampAdd(
  timestamp: Expression | string,
  unit:
    | Expression
    | 'microsecond'
    | 'millisecond'
    | 'second'
    | 'minute'
    | 'hour'
    | 'day',
  amount: Expression | number
): FunctionExpression {
  const normalizedTimestamp = fieldOrExpression(timestamp);
  const normalizedUnit = valueToDefaultExpr(unit);
  const normalizedAmount = valueToDefaultExpr(amount);
  return normalizedTimestamp.timestampAdd(normalizedUnit, normalizedAmount);
}

/**
 * @beta
 *
 * Creates an expression that subtracts a specified amount of time from a timestamp.
 *
 * ```typescript
 * // Subtract some duration determined by field 'unit' and 'amount' from the 'timestamp' field.
 * timestampSubtract(field("timestamp"), field("unit"), field("amount"));
 * ```
 *
 * @param timestamp The expression representing the timestamp.
 * @param unit The expression evaluates to unit of time, must be one of 'microsecond', 'millisecond', 'second', 'minute', 'hour', 'day'.
 * @param amount The expression evaluates to amount of the unit.
 * @return A new {@code Expr} representing the resulting timestamp.
 */
export function timestampSubtract(
  timestamp: Expression,
  unit: Expression,
  amount: Expression
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that subtracts a specified amount of time from a timestamp.
 *
 * ```typescript
 * // Subtract 1 day from the 'timestamp' field.
 * timestampSubtract(field("timestamp"), "day", 1);
 * ```
 *
 * @param timestamp The expression representing the timestamp.
 * @param unit The unit of time to subtract (e.g., "day", "hour").
 * @param amount The amount of time to subtract.
 * @return A new {@code Expr} representing the resulting timestamp.
 */
export function timestampSubtract(
  timestamp: Expression,
  unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
  amount: number
): FunctionExpression;

/**
 * @beta
 *
 * Creates an expression that subtracts a specified amount of time from a timestamp represented by a field.
 *
 * ```typescript
 * // Subtract 1 day from the 'timestamp' field.
 * timestampSubtract("timestamp", "day", 1);
 * ```
 *
 * @param fieldName The name of the field representing the timestamp.
 * @param unit The unit of time to subtract (e.g., "day", "hour").
 * @param amount The amount of time to subtract.
 * @return A new {@code Expr} representing the resulting timestamp.
 */
export function timestampSubtract(
  fieldName: string,
  unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
  amount: number
): FunctionExpression;
export function timestampSubtract(
  timestamp: Expression | string,
  unit:
    | Expression
    | 'microsecond'
    | 'millisecond'
    | 'second'
    | 'minute'
    | 'hour'
    | 'day',
  amount: Expression | number
): FunctionExpression {
  const normalizedTimestamp = fieldOrExpression(timestamp);
  const normalizedUnit = valueToDefaultExpr(unit);
  const normalizedAmount = valueToDefaultExpr(amount);
  return normalizedTimestamp.timestampSubtract(
    normalizedUnit,
    normalizedAmount
  );
}

/**
 * @beta
 *
 * Creates an expression that performs a logical 'AND' operation on multiple filter conditions.
 *
 * ```typescript
 * // Check if the 'age' field is greater than 18 AND the 'city' field is "London" AND
 * // the 'status' field is "active"
 * const condition = and(greaterThan("age", 18), equal("city", "London"), equal("status", "active"));
 * ```
 *
 * @param first The first filter condition.
 * @param second The second filter condition.
 * @param more Additional filter conditions to 'AND' together.
 * @return A new {@code Expr} representing the logical 'AND' operation.
 */
export function and(
  first: BooleanExpression,
  second: BooleanExpression,
  ...more: BooleanExpression[]
): BooleanExpression {
  return new BooleanExpression('and', [first, second, ...more], 'and');
}

/**
 * @beta
 *
 * Creates an expression that performs a logical 'OR' operation on multiple filter conditions.
 *
 * ```typescript
 * // Check if the 'age' field is greater than 18 OR the 'city' field is "London" OR
 * // the 'status' field is "active"
 * const condition = or(greaterThan("age", 18), equal("city", "London"), equal("status", "active"));
 * ```
 *
 * @param first The first filter condition.
 * @param second The second filter condition.
 * @param more Additional filter conditions to 'OR' together.
 * @return A new {@code Expr} representing the logical 'OR' operation.
 */
export function or(
  first: BooleanExpression,
  second: BooleanExpression,
  ...more: BooleanExpression[]
): BooleanExpression {
  return new BooleanExpression('or', [first, second, ...more], 'xor');
}

/**
 * Creates an expression that returns the value of the base expression raised to the power of the exponent expression.
 *
 * ```typescript
 * // Raise the value of the 'base' field to the power of the 'exponent' field.
 * pow(field("base"), field("exponent"));
 * ```
 *
 * @param base The expression to raise to the power of the exponent.
 * @param exponent The expression to raise the base to the power of.
 * @return A new `Expr` representing the power operation.
 */
export function pow(base: Expression, exponent: Expression): FunctionExpression;

/**
 * Creates an expression that returns the value of the base expression raised to the power of the exponent.
 *
 * ```typescript
 * // Raise the value of the 'base' field to the power of 2.
 * pow(field("base"), 2);
 * ```
 *
 * @param base The expression to raise to the power of the exponent.
 * @param exponent The constant value to raise the base to the power of.
 * @return A new `Expr` representing the power operation.
 */
export function pow(base: Expression, exponent: number): FunctionExpression;

/**
 * Creates an expression that returns the value of the base field raised to the power of the exponent expression.
 *
 * ```typescript
 * // Raise the value of the 'base' field to the power of the 'exponent' field.
 * pow("base", field("exponent"));
 * ```
 *
 * @param base The name of the field to raise to the power of the exponent.
 * @param exponent The expression to raise the base to the power of.
 * @return A new `Expr` representing the power operation.
 */
export function pow(base: string, exponent: Expression): FunctionExpression;

/**
 * Creates an expression that returns the value of the base field raised to the power of the exponent.
 *
 * ```typescript
 * // Raise the value of the 'base' field to the power of 2.
 * pow("base", 2);
 * ```
 *
 * @param base The name of the field to raise to the power of the exponent.
 * @param exponent The constant value to raise the base to the power of.
 * @return A new `Expr` representing the power operation.
 */
export function pow(base: string, exponent: number): FunctionExpression;
export function pow(
  base: Expression | string,
  exponent: Expression | number
): FunctionExpression {
  return fieldOrExpression(base).pow(exponent as number);
}

/**
 * Creates an expression that rounds a numeric value to the nearest whole number.
 *
 * ```typescript
 * // Round the value of the 'price' field.
 * round("price");
 * ```
 *
 * @param fieldName The name of the field to round.
 * @return A new `Expr` representing the rounded value.
 */
export function round(fieldName: string): FunctionExpression;

/**
 * Creates an expression that rounds a numeric value to the nearest whole number.
 *
 * ```typescript
 * // Round the value of the 'price' field.
 * round(field("price"));
 * ```
 *
 * @param expression An expression evaluating to a numeric value, which will be rounded.
 * @return A new `Expr` representing the rounded value.
 */
export function round(expression: Expression): FunctionExpression;
export function round(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).round();
}

/**
 * Creates an expression that returns the collection ID from a path.
 *
 * ```typescript
 * // Get the collection ID from a path.
 * collectionId("__name__");
 * ```
 *
 * @param fieldName The name of the field to get the collection ID from.
 * @return A new {@code Expr} representing the collectionId operation.
 */
export function collectionId(fieldName: string): FunctionExpression;

/**
 * Creates an expression that returns the collection ID from a path.
 *
 * ```typescript
 * // Get the collection ID from a path.
 * collectionId(field("__name__"));
 * ```
 *
 * @param expression An expression evaluating to a path, which the collection ID will be extracted from.
 * @return A new {@code Expr} representing the collectionId operation.
 */
export function collectionId(expression: Expression): FunctionExpression;
export function collectionId(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).collectionId();
}

/**
 * Creates an expression that calculates the length of a string, array, map, vector, or bytes.
 *
 * ```typescript
 * // Get the length of the 'name' field.
 * length("name");
 *
 * // Get the number of items in the 'cart' array.
 * length("cart");
 * ```
 *
 * @param fieldName The name of the field to calculate the length of.
 * @return A new `Expr` representing the length of the string, array, map, vector, or bytes.
 */
export function length(fieldName: string): FunctionExpression;

/**
 * Creates an expression that calculates the length of a string, array, map, vector, or bytes.
 *
 * ```typescript
 * // Get the length of the 'name' field.
 * length(field("name"));
 *
 * // Get the number of items in the 'cart' array.
 * length(field("cart"));
 * ```
 *
 * @param expression An expression evaluating to a string, array, map, vector, or bytes, which the length will be calculated for.
 * @return A new `Expr` representing the length of the string, array, map, vector, or bytes.
 */
export function length(expression: Expression): FunctionExpression;
export function length(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).length();
}

/**
 * Creates an expression that computes the natural logarithm of a numeric value.
 *
 * ```typescript
 * // Compute the natural logarithm of the 'value' field.
 * ln("value");
 * ```
 *
 * @param fieldName The name of the field to compute the natural logarithm of.
 * @return A new `Expr` representing the natural logarithm of the numeric value.
 */
export function ln(fieldName: string): FunctionExpression;

/**
 * Creates an expression that computes the natural logarithm of a numeric value.
 *
 * ```typescript
 * // Compute the natural logarithm of the 'value' field.
 * ln(field("value"));
 * ```
 *
 * @param expression An expression evaluating to a numeric value, which the natural logarithm will be computed for.
 * @return A new `Expr` representing the natural logarithm of the numeric value.
 */
export function ln(expression: Expression): FunctionExpression;
export function ln(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).ln();
}

/**
 * Creates an expression that computes the logarithm of an expression to a given base.
 *
 * ```typescript
 * // Compute the logarithm of the 'value' field with base 10.
 * log(field("value"), 10);
 * ```
 *
 * @param expression An expression evaluating to a numeric value, which the logarithm will be computed for.
 * @param base The base of the logarithm.
 * @return A new {@code Expr} representing the logarithm of the numeric value.
 */
export function log(expression: Expression, base: number): FunctionExpression;
/**
 * Creates an expression that computes the logarithm of an expression to a given base.
 *
 * ```typescript
 * // Compute the logarithm of the 'value' field with the base in the 'base' field.
 * log(field("value"), field("base"));
 * ```
 *
 * @param expression An expression evaluating to a numeric value, which the logarithm will be computed for.
 * @param base The base of the logarithm.
 * @return A new {@code Expr} representing the logarithm of the numeric value.
 */
export function log(
  expression: Expression,
  base: Expression
): FunctionExpression;
/**
 * Creates an expression that computes the logarithm of a field to a given base.
 *
 * ```typescript
 * // Compute the logarithm of the 'value' field with base 10.
 * log("value", 10);
 * ```
 *
 * @param fieldName The name of the field to compute the logarithm of.
 * @param base The base of the logarithm.
 * @return A new {@code Expr} representing the logarithm of the numeric value.
 */
export function log(fieldName: string, base: number): FunctionExpression;
/**
 * Creates an expression that computes the logarithm of a field to a given base.
 *
 * ```typescript
 * // Compute the logarithm of the 'value' field with the base in the 'base' field.
 * log("value", field("base"));
 * ```
 *
 * @param fieldName The name of the field to compute the logarithm of.
 * @param base The base of the logarithm.
 * @return A new {@code Expr} representing the logarithm of the numeric value.
 */
export function log(fieldName: string, base: Expression): FunctionExpression;
export function log(
  expr: Expression | string,
  base: number | Expression
): FunctionExpression {
  return fieldOrExpression(expr).log(valueToDefaultExpr(base));
}

/**
 * Creates an expression that computes the square root of a numeric value.
 *
 * ```typescript
 * // Compute the square root of the 'value' field.
 * sqrt(field("value"));
 * ```
 *
 * @param expression An expression evaluating to a numeric value, which the square root will be computed for.
 * @return A new {@code Expr} representing the square root of the numeric value.
 */
export function sqrt(expression: Expression): FunctionExpression;
/**
 * Creates an expression that computes the square root of a numeric value.
 *
 * ```typescript
 * // Compute the square root of the 'value' field.
 * sqrt("value");
 * ```
 *
 * @param fieldName The name of the field to compute the square root of.
 * @return A new {@code Expr} representing the square root of the numeric value.
 */
export function sqrt(fieldName: string): FunctionExpression;
export function sqrt(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).sqrt();
}

/**
 * Creates an expression that reverses a string.
 *
 * ```typescript
 * // Reverse the value of the 'myString' field.
 * strReverse(field("myString"));
 * ```
 *
 * @param stringExpression An expression evaluating to a string value, which will be reversed.
 * @return A new {@code Expr} representing the reversed string.
 */
export function stringReverse(stringExpression: Expression): FunctionExpression;

/**
 * Creates an expression that reverses a string value in the specified field.
 *
 * ```typescript
 * // Reverse the value of the 'myString' field.
 * strReverse("myString");
 * ```
 *
 * @param field The name of the field representing the string to reverse.
 * @return A new {@code Expr} representing the reversed string.
 */
export function stringReverse(field: string): FunctionExpression;
export function stringReverse(expr: Expression | string): FunctionExpression {
  return fieldOrExpression(expr).stringReverse();
}

// TODO(new-expression): Add new top-level expression function definitions above this line

/**
 * @beta
 *
 * Creates an {@link Ordering} that sorts documents in ascending order based on an expression.
 *
 * ```typescript
 * // Sort documents by the 'name' field in lowercase in ascending order
 * firestore.pipeline().collection("users")
 *   .sort(ascending(field("name").toLower()));
 * ```
 *
 * @param expr The expression to create an ascending ordering for.
 * @return A new `Ordering` for ascending sorting.
 */
export function ascending(expr: Expression): Ordering;

/**
 * @beta
 *
 * Creates an {@link Ordering} that sorts documents in ascending order based on a field.
 *
 * ```typescript
 * // Sort documents by the 'name' field in ascending order
 * firestore.pipeline().collection("users")
 *   .sort(ascending("name"));
 * ```
 *
 * @param fieldName The field to create an ascending ordering for.
 * @return A new `Ordering` for ascending sorting.
 */
export function ascending(fieldName: string): Ordering;
export function ascending(field: Expression | string): Ordering {
  return new Ordering(fieldOrExpression(field), 'ascending', 'ascending');
}

/**
 * @beta
 *
 * Creates an {@link Ordering} that sorts documents in descending order based on an expression.
 *
 * ```typescript
 * // Sort documents by the 'name' field in lowercase in descending order
 * firestore.pipeline().collection("users")
 *   .sort(descending(field("name").toLower()));
 * ```
 *
 * @param expr The expression to create a descending ordering for.
 * @return A new `Ordering` for descending sorting.
 */
export function descending(expr: Expression): Ordering;

/**
 * @beta
 *
 * Creates an {@link Ordering} that sorts documents in descending order based on a field.
 *
 * ```typescript
 * // Sort documents by the 'name' field in descending order
 * firestore.pipeline().collection("users")
 *   .sort(descending("name"));
 * ```
 *
 * @param fieldName The field to create a descending ordering for.
 * @return A new `Ordering` for descending sorting.
 */
export function descending(fieldName: string): Ordering;
export function descending(field: Expression | string): Ordering {
  return new Ordering(fieldOrExpression(field), 'descending', 'descending');
}

/**
 * @beta
 *
 * Represents an ordering criterion for sorting documents in a Firestore pipeline.
 *
 * You create `Ordering` instances using the `ascending` and `descending` helper functions.
 */
export class Ordering implements ProtoValueSerializable, UserData {
  constructor(
    public readonly expr: Expression,
    public readonly direction: 'ascending' | 'descending',
    readonly _methodName: string | undefined
  ) {}

  /**
   * @private
   * @internal
   */
  _toProto(serializer: JsonProtoSerializer): ProtoValue {
    return {
      mapValue: {
        fields: {
          direction: toStringValue(this.direction),
          expression: this.expr._toProto(serializer)
        }
      }
    };
  }

  /**
   * @private
   * @internal
   */
  _readUserData(context: ParseContext): void {
    this.expr._readUserData(context);
  }

  _protoValueType: 'ProtoValue' = 'ProtoValue';
}
