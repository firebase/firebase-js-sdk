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

/* eslint @typescript-eslint/no-explicit-any: 0 */

import {
  DOCUMENT_KEY_NAME,
  FieldPath as InternalFieldPath
} from '../model/path';
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import {
  JsonProtoSerializer,
  ProtoSerializable,
  ProtoValueSerializable,
  toMapValue,
  toStringValue,
  UserData
} from '../remote/serializer';
import { hardAssert } from '../util/assert';
import { isPlainObject } from '../util/input_validation';
import { isFirestoreValue } from '../util/proto';
import { isString } from '../util/types';

import { Bytes } from './bytes';
import { documentId, FieldPath } from './field_path';
import { GeoPoint } from './geo_point';
import { DocumentReference } from './reference';
import { Timestamp } from './timestamp';
import {
  fieldPathFromArgument,
  parseData,
  UserDataReader,
  UserDataSource
} from './user_data_reader';
import { VectorValue } from './vector_value';

/**
 * @beta
 *
 * An enumeration of the different types of expressions.
 */
export type ExprType =
  | 'Field'
  | 'Constant'
  | 'Function'
  | 'AggregateFunction'
  | 'ListOfExprs'
  | 'ExprWithAlias';

/**
 * Converts a value to an Expr, Returning either a Constant, MapFunction,
 * ArrayFunction, or the input itself (if it's already an expression).
 *
 * @private
 * @internal
 * @param value
 */
function valueToDefaultExpr(value: any): Expr {
  if (value instanceof Expr) {
    return value;
  } else if (isPlainObject(value)) {
    return map(value);
  } else if (value instanceof Array) {
    return array(value);
  } else {
    return Constant.of(value);
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
function vectorToExpr(value: VectorValue | number[] | Expr): Expr {
  if (value instanceof Expr) {
    return value;
  } else {
    return Constant.vector(value);
  }
}

/**
 * Converts a value to an Expr, Returning either a Constant, MapFunction,
 * ArrayFunction, or the input itself (if it's already an expression).
 * If the input is a string, it is assumed to be a field name, and a
 * Field.of(value) is returned.
 *
 * @private
 * @internal
 * @param value
 */
function fieldOfOrExpr(value: any): Expr {
  if (isString(value)) {
    return Field.of(value);
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
export abstract class Expr implements ProtoValueSerializable, UserData {
  abstract readonly exprType: ExprType;

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
  abstract _readUserData(dataReader: UserDataReader): void;

  /**
   * Creates an expression that adds this expression to another expression.
   *
   * ```typescript
   * // Add the value of the 'quantity' field and the 'reserve' field.
   * Field.of("quantity").add(Field.of("reserve"));
   * ```
   *
   * @param second The expression or literal to add to this expression.
   * @param others Optional additional expressions or literals to add to this expression.
   * @return A new `Expr` representing the addition operation.
   */
  add(second: Expr | any, ...others: Array<Expr | any>): FunctionExpr {
    const values = [second, ...others];
    return new FunctionExpr('add', [
      this,
      ...values.map(value => valueToDefaultExpr(value))
    ]);
  }

  /**
   * Creates an expression that subtracts another expression from this expression.
   *
   * ```typescript
   * // Subtract the 'discount' field from the 'price' field
   * Field.of("price").subtract(Field.of("discount"));
   * ```
   *
   * @param other The expression to subtract from this expression.
   * @return A new `Expr` representing the subtraction operation.
   */
  subtract(other: Expr): FunctionExpr;

  /**
   * Creates an expression that subtracts a constant value from this expression.
   *
   * ```typescript
   * // Subtract 20 from the value of the 'total' field
   * Field.of("total").subtract(20);
   * ```
   *
   * @param other The constant value to subtract.
   * @return A new `Expr` representing the subtraction operation.
   */
  subtract(other: any): FunctionExpr;
  subtract(other: any): FunctionExpr {
    return new FunctionExpr('subtract', [this, valueToDefaultExpr(other)]);
  }

  /**
   * Creates an expression that multiplies this expression by another expression.
   *
   * ```typescript
   * // Multiply the 'quantity' field by the 'price' field
   * Field.of("quantity").multiply(Field.of("price"));
   * ```
   *
   * @param second The second expression or literal to multiply by.
   * @param others Optional additional expressions or literals to multiply by.
   * @return A new `Expr` representing the multiplication operation.
   */
  multiply(second: Expr | any, ...others: Array<Expr | any>): FunctionExpr {
    return new FunctionExpr('multiply', [
      this,
      valueToDefaultExpr(second),
      ...others.map(value => valueToDefaultExpr(value))
    ]);
  }

  /**
   * Creates an expression that divides this expression by another expression.
   *
   * ```typescript
   * // Divide the 'total' field by the 'count' field
   * Field.of("total").divide(Field.of("count"));
   * ```
   *
   * @param other The expression to divide by.
   * @return A new `Expr` representing the division operation.
   */
  divide(other: Expr): FunctionExpr;

  /**
   * Creates an expression that divides this expression by a constant value.
   *
   * ```typescript
   * // Divide the 'value' field by 10
   * Field.of("value").divide(10);
   * ```
   *
   * @param other The constant value to divide by.
   * @return A new `Expr` representing the division operation.
   */
  divide(other: any): FunctionExpr;
  divide(other: any): FunctionExpr {
    return new FunctionExpr('divide', [this, valueToDefaultExpr(other)]);
  }

  /**
   * Creates an expression that calculates the modulo (remainder) of dividing this expression by another expression.
   *
   * ```typescript
   * // Calculate the remainder of dividing the 'value' field by the 'divisor' field
   * Field.of("value").mod(Field.of("divisor"));
   * ```
   *
   * @param other The expression to divide by.
   * @return A new `Expr` representing the modulo operation.
   */
  mod(other: Expr): FunctionExpr;

  /**
   * Creates an expression that calculates the modulo (remainder) of dividing this expression by a constant value.
   *
   * ```typescript
   * // Calculate the remainder of dividing the 'value' field by 10
   * Field.of("value").mod(10);
   * ```
   *
   * @param other The constant value to divide by.
   * @return A new `Expr` representing the modulo operation.
   */
  mod(other: any): FunctionExpr;
  mod(other: any): FunctionExpr {
    return new FunctionExpr('mod', [this, valueToDefaultExpr(other)]);
  }

  /**
   * Creates an expression that checks if this expression is equal to another expression.
   *
   * ```typescript
   * // Check if the 'age' field is equal to 21
   * Field.of("age").eq(21);
   * ```
   *
   * @param other The expression to compare for equality.
   * @return A new `Expr` representing the equality comparison.
   */
  eq(other: Expr): BooleanExpr;

  /**
   * Creates an expression that checks if this expression is equal to a constant value.
   *
   * ```typescript
   * // Check if the 'city' field is equal to "London"
   * Field.of("city").eq("London");
   * ```
   *
   * @param other The constant value to compare for equality.
   * @return A new `Expr` representing the equality comparison.
   */
  eq(other: any): BooleanExpr;
  eq(other: any): BooleanExpr {
    return new BooleanExpr('eq', [this, valueToDefaultExpr(other)]);
  }

  /**
   * Creates an expression that checks if this expression is not equal to another expression.
   *
   * ```typescript
   * // Check if the 'status' field is not equal to "completed"
   * Field.of("status").neq("completed");
   * ```
   *
   * @param other The expression to compare for inequality.
   * @return A new `Expr` representing the inequality comparison.
   */
  neq(other: Expr): BooleanExpr;

  /**
   * Creates an expression that checks if this expression is not equal to a constant value.
   *
   * ```typescript
   * // Check if the 'country' field is not equal to "USA"
   * Field.of("country").neq("USA");
   * ```
   *
   * @param other The constant value to compare for inequality.
   * @return A new `Expr` representing the inequality comparison.
   */
  neq(other: any): BooleanExpr;
  neq(other: any): BooleanExpr {
    return new BooleanExpr('neq', [this, valueToDefaultExpr(other)]);
  }

  /**
   * Creates an expression that checks if this expression is less than another expression.
   *
   * ```typescript
   * // Check if the 'age' field is less than 'limit'
   * Field.of("age").lt(Field.of('limit'));
   * ```
   *
   * @param other The expression to compare for less than.
   * @return A new `Expr` representing the less than comparison.
   */
  lt(other: Expr): BooleanExpr;

  /**
   * Creates an expression that checks if this expression is less than a constant value.
   *
   * ```typescript
   * // Check if the 'price' field is less than 50
   * Field.of("price").lt(50);
   * ```
   *
   * @param other The constant value to compare for less than.
   * @return A new `Expr` representing the less than comparison.
   */
  lt(other: any): BooleanExpr;
  lt(other: any): BooleanExpr {
    return new BooleanExpr('lt', [this, valueToDefaultExpr(other)]);
  }

  /**
   * Creates an expression that checks if this expression is less than or equal to another
   * expression.
   *
   * ```typescript
   * // Check if the 'quantity' field is less than or equal to 20
   * Field.of("quantity").lte(Constant.of(20));
   * ```
   *
   * @param other The expression to compare for less than or equal to.
   * @return A new `Expr` representing the less than or equal to comparison.
   */
  lte(other: Expr): BooleanExpr;

  /**
   * Creates an expression that checks if this expression is less than or equal to a constant value.
   *
   * ```typescript
   * // Check if the 'score' field is less than or equal to 70
   * Field.of("score").lte(70);
   * ```
   *
   * @param other The constant value to compare for less than or equal to.
   * @return A new `Expr` representing the less than or equal to comparison.
   */
  lte(other: any): BooleanExpr;
  lte(other: any): BooleanExpr {
    return new BooleanExpr('lte', [this, valueToDefaultExpr(other)]);
  }

  /**
   * Creates an expression that checks if this expression is greater than another expression.
   *
   * ```typescript
   * // Check if the 'age' field is greater than the 'limit' field
   * Field.of("age").gt(Field.of("limit"));
   * ```
   *
   * @param other The expression to compare for greater than.
   * @return A new `Expr` representing the greater than comparison.
   */
  gt(other: Expr): BooleanExpr;

  /**
   * Creates an expression that checks if this expression is greater than a constant value.
   *
   * ```typescript
   * // Check if the 'price' field is greater than 100
   * Field.of("price").gt(100);
   * ```
   *
   * @param other The constant value to compare for greater than.
   * @return A new `Expr` representing the greater than comparison.
   */
  gt(other: any): BooleanExpr;
  gt(other: any): BooleanExpr {
    return new BooleanExpr('gt', [this, valueToDefaultExpr(other)]);
  }

  /**
   * Creates an expression that checks if this expression is greater than or equal to another
   * expression.
   *
   * ```typescript
   * // Check if the 'quantity' field is greater than or equal to field 'requirement' plus 1
   * Field.of("quantity").gte(Field.of('requirement').add(1));
   * ```
   *
   * @param other The expression to compare for greater than or equal to.
   * @return A new `Expr` representing the greater than or equal to comparison.
   */
  gte(other: Expr): BooleanExpr;

  /**
   * Creates an expression that checks if this expression is greater than or equal to a constant
   * value.
   *
   * ```typescript
   * // Check if the 'score' field is greater than or equal to 80
   * Field.of("score").gte(80);
   * ```
   *
   * @param other The constant value to compare for greater than or equal to.
   * @return A new `Expr` representing the greater than or equal to comparison.
   */
  gte(other: any): BooleanExpr;
  gte(other: any): BooleanExpr {
    return new BooleanExpr('gte', [this, valueToDefaultExpr(other)]);
  }

  /**
   * Creates an expression that concatenates an array expression with one or more other arrays.
   *
   * ```typescript
   * // Combine the 'items' array with another array field.
   * Field.of("items").arrayConcat(Field.of("otherItems"));
   * ```
   * @param secondArray Second array expression or array literal to concatenate.
   * @param otherArrays Optional additional array expressions or array literals to concatenate.
   * @return A new `Expr` representing the concatenated array.
   */
  arrayConcat(
    secondArray: Expr | any[],
    ...otherArrays: Array<Expr | any[]>
  ): FunctionExpr {
    const elements = [secondArray, ...otherArrays];
    const exprValues = elements.map(value => valueToDefaultExpr(value));
    return new FunctionExpr('array_concat', [this, ...exprValues]);
  }

  /**
   * Creates an expression that checks if an array contains a specific element.
   *
   * ```typescript
   * // Check if the 'sizes' array contains the value from the 'selectedSize' field
   * Field.of("sizes").arrayContains(Field.of("selectedSize"));
   * ```
   *
   * @param element The element to search for in the array.
   * @return A new `Expr` representing the 'array_contains' comparison.
   */
  arrayContains(element: Expr): BooleanExpr;

  /**
   * Creates an expression that checks if an array contains a specific value.
   *
   * ```typescript
   * // Check if the 'colors' array contains "red"
   * Field.of("colors").arrayContains("red");
   * ```
   *
   * @param element The element to search for in the array.
   * @return A new `Expr` representing the 'array_contains' comparison.
   */
  arrayContains(element: any): BooleanExpr;
  arrayContains(element: any): BooleanExpr {
    return new BooleanExpr('array_contains', [
      this,
      valueToDefaultExpr(element)
    ]);
  }

  /**
   * Creates an expression that checks if an array contains all the specified elements.
   *
   * ```typescript
   * // Check if the 'tags' array contains both "news" and "sports"
   * Field.of("tags").arrayContainsAll(Field.of("tag1"), Field.of("tag2"));
   * ```
   *
   * @param values The elements to check for in the array.
   * @return A new `Expr` representing the 'array_contains_all' comparison.
   */
  arrayContainsAll(...values: Expr[]): BooleanExpr;

  /**
   * Creates an expression that checks if an array contains all the specified elements.
   *
   * ```typescript
   * // Check if the 'tags' array contains both of the values from field 'tag1' and "tag2"
   * Field.of("tags").arrayContainsAll(Field.of("tag1"), Field.of("tag2"));
   * ```
   *
   * @param values The elements to check for in the array.
   * @return A new `Expr` representing the 'array_contains_all' comparison.
   */
  arrayContainsAll(...values: any[]): BooleanExpr;
  arrayContainsAll(...values: any[]): BooleanExpr {
    const exprValues = values.map(value => valueToDefaultExpr(value));
    return new BooleanExpr('array_contains_all', [
      this,
      new ListOfExprs(exprValues)
    ]);
  }

  /**
   * Creates an expression that checks if an array contains any of the specified elements.
   *
   * ```typescript
   * // Check if the 'categories' array contains either values from field "cate1" or "cate2"
   * Field.of("categories").arrayContainsAny(Field.of("cate1"), Field.of("cate2"));
   * ```
   *
   * @param values The elements to check for in the array.
   * @return A new `Expr` representing the 'array_contains_any' comparison.
   */
  arrayContainsAny(...values: Expr[]): BooleanExpr;

  /**
   * Creates an expression that checks if an array contains any of the specified elements.
   *
   * ```typescript
   * // Check if the 'groups' array contains either the value from the 'userGroup' field
   * // or the value "guest"
   * Field.of("groups").arrayContainsAny(Field.of("userGroup"), "guest");
   * ```
   *
   * @param values The elements to check for in the array.
   * @return A new `Expr` representing the 'array_contains_any' comparison.
   */
  arrayContainsAny(...values: any[]): BooleanExpr;
  arrayContainsAny(...values: any[]): BooleanExpr {
    const exprValues = values.map(value => valueToDefaultExpr(value));
    return new BooleanExpr('array_contains_any', [
      this,
      new ListOfExprs(exprValues)
    ]);
  }

  /**
   * Creates an expression that calculates the length of an array.
   *
   * ```typescript
   * // Get the number of items in the 'cart' array
   * Field.of("cart").arrayLength();
   * ```
   *
   * @return A new `Expr` representing the length of the array.
   */
  arrayLength(): FunctionExpr {
    return new FunctionExpr('array_length', [this]);
  }

  /**
   * Creates an expression that checks if this expression is equal to any of the provided values or
   * expressions.
   *
   * ```typescript
   * // Check if the 'category' field is either "Electronics" or value of field 'primaryType'
   * Field.of("category").eqAny("Electronics", Field.of("primaryType"));
   * ```
   *
   * @param others The values or expressions to check against.
   * @return A new `Expr` representing the 'IN' comparison.
   */
  eqAny(...others: Expr[]): BooleanExpr;

  /**
   * Creates an expression that checks if this expression is equal to any of the provided values or
   * expressions.
   *
   * ```typescript
   * // Check if the 'category' field is either "Electronics" or value of field 'primaryType'
   * Field.of("category").eqAny("Electronics", Field.of("primaryType"));
   * ```
   *
   * @param others The values or expressions to check against.
   * @return A new `Expr` representing the 'IN' comparison.
   */
  eqAny(...others: any[]): BooleanExpr;
  eqAny(...others: any[]): BooleanExpr {
    const exprOthers = others.map(other => valueToDefaultExpr(other));
    return new BooleanExpr('eq_any', [this, new ListOfExprs(exprOthers)]);
  }

  /**
   * Creates an expression that checks if this expression is not equal to any of the provided values or
   * expressions.
   *
   * ```typescript
   * // Check if the 'status' field is neither "pending" nor the value of 'rejectedStatus'
   * Field.of("status").notEqAny("pending", Field.of("rejectedStatus"));
   * ```
   *
   * @param others The values or expressions to check against.
   * @return A new `Expr` representing the 'NotEqAny' comparison.
   */
  notEqAny(...others: Expr[]): BooleanExpr;

  /**
   * Creates an expression that checks if this expression is not equal to any of the provided values or
   * expressions.
   *
   * ```typescript
   * // Check if the 'status' field is neither "pending" nor the value of 'rejectedStatus'
   * Field.of("status").notEqAny("pending", Field.of("rejectedStatus"));
   * ```
   *
   * @param others The values or expressions to check against.
   * @return A new `Expr` representing the 'NotEqAny' comparison.
   */
  notEqAny(...others: any[]): BooleanExpr;
  notEqAny(...others: any[]): BooleanExpr {
    const exprOthers = others.map(other => valueToDefaultExpr(other));
    return new BooleanExpr('not_eq_any', [this, new ListOfExprs(exprOthers)]);
  }

  /**
   * Creates an expression that checks if this expression evaluates to 'NaN' (Not a Number).
   *
   * ```typescript
   * // Check if the result of a calculation is NaN
   * Field.of("value").divide(0).isNaN();
   * ```
   *
   * @return A new `Expr` representing the 'isNaN' check.
   */
  isNan(): BooleanExpr {
    return new BooleanExpr('is_nan', [this]);
  }

  /**
   * Creates an expression that checks if this expression evaluates to 'Null'.
   *
   * ```typescript
   * // Check if the result of a calculation is NaN
   * Field.of("value").isNull();
   * ```
   *
   * @return A new `Expr` representing the 'isNull' check.
   */
  isNull(): BooleanExpr {
    return new BooleanExpr('is_null', [this]);
  }

  /**
   * Creates an expression that checks if a field exists in the document.
   *
   * ```typescript
   * // Check if the document has a field named "phoneNumber"
   * Field.of("phoneNumber").exists();
   * ```
   *
   * @return A new `Expr` representing the 'exists' check.
   */
  exists(): BooleanExpr {
    return new BooleanExpr('exists', [this]);
  }

  /**
   * Creates an expression that calculates the character length of a string in UTF-8.
   *
   * ```typescript
   * // Get the character length of the 'name' field in its UTF-8 form.
   * Field.of("name").charLength();
   * ```
   *
   * @return A new `Expr` representing the length of the string.
   */
  charLength(): FunctionExpr {
    return new FunctionExpr('char_length', [this]);
  }

  /**
   * Creates an expression that performs a case-sensitive string comparison.
   *
   * ```typescript
   * // Check if the 'title' field contains the word "guide" (case-sensitive)
   * Field.of("title").like("%guide%");
   * ```
   *
   * @param pattern The pattern to search for. You can use "%" as a wildcard character.
   * @return A new `Expr` representing the 'like' comparison.
   */
  like(pattern: string): FunctionExpr;

  /**
   * Creates an expression that performs a case-sensitive string comparison.
   *
   * ```typescript
   * // Check if the 'title' field contains the word "guide" (case-sensitive)
   * Field.of("title").like("%guide%");
   * ```
   *
   * @param pattern The pattern to search for. You can use "%" as a wildcard character.
   * @return A new `Expr` representing the 'like' comparison.
   */
  like(pattern: Expr): FunctionExpr;
  like(stringOrExpr: string | Expr): FunctionExpr {
    return new FunctionExpr('like', [this, valueToDefaultExpr(stringOrExpr)]);
  }

  /**
   * Creates an expression that checks if a string contains a specified regular expression as a
   * substring.
   *
   * ```typescript
   * // Check if the 'description' field contains "example" (case-insensitive)
   * Field.of("description").regexContains("(?i)example");
   * ```
   *
   * @param pattern The regular expression to use for the search.
   * @return A new `Expr` representing the 'contains' comparison.
   */
  regexContains(pattern: string): BooleanExpr;

  /**
   * Creates an expression that checks if a string contains a specified regular expression as a
   * substring.
   *
   * ```typescript
   * // Check if the 'description' field contains the regular expression stored in field 'regex'
   * Field.of("description").regexContains(Field.of("regex"));
   * ```
   *
   * @param pattern The regular expression to use for the search.
   * @return A new `Expr` representing the 'contains' comparison.
   */
  regexContains(pattern: Expr): BooleanExpr;
  regexContains(stringOrExpr: string | Expr): BooleanExpr {
    return new BooleanExpr('regex_contains', [
      this,
      valueToDefaultExpr(stringOrExpr)
    ]);
  }

  /**
   * Creates an expression that checks if a string matches a specified regular expression.
   *
   * ```typescript
   * // Check if the 'email' field matches a valid email pattern
   * Field.of("email").regexMatch("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
   * ```
   *
   * @param pattern The regular expression to use for the match.
   * @return A new `Expr` representing the regular expression match.
   */
  regexMatch(pattern: string): BooleanExpr;

  /**
   * Creates an expression that checks if a string matches a specified regular expression.
   *
   * ```typescript
   * // Check if the 'email' field matches a regular expression stored in field 'regex'
   * Field.of("email").regexMatch(Field.of("regex"));
   * ```
   *
   * @param pattern The regular expression to use for the match.
   * @return A new `Expr` representing the regular expression match.
   */
  regexMatch(pattern: Expr): BooleanExpr;
  regexMatch(stringOrExpr: string | Expr): BooleanExpr {
    return new BooleanExpr('regex_match', [
      this,
      valueToDefaultExpr(stringOrExpr)
    ]);
  }

  /**
   * Creates an expression that checks if a string contains a specified substring.
   *
   * ```typescript
   * // Check if the 'description' field contains "example".
   * Field.of("description").strContains("example");
   * ```
   *
   * @param substring The substring to search for.
   * @return A new `Expr` representing the 'contains' comparison.
   */
  strContains(substring: string): BooleanExpr;

  /**
   * Creates an expression that checks if a string contains the string represented by another expression.
   *
   * ```typescript
   * // Check if the 'description' field contains the value of the 'keyword' field.
   * Field.of("description").strContains(Field.of("keyword"));
   * ```
   *
   * @param expr The expression representing the substring to search for.
   * @return A new `Expr` representing the 'contains' comparison.
   */
  strContains(expr: Expr): BooleanExpr;
  strContains(stringOrExpr: string | Expr): BooleanExpr {
    return new BooleanExpr('str_contains', [
      this,
      valueToDefaultExpr(stringOrExpr)
    ]);
  }

  /**
   * Creates an expression that checks if a string starts with a given prefix.
   *
   * ```typescript
   * // Check if the 'name' field starts with "Mr."
   * Field.of("name").startsWith("Mr.");
   * ```
   *
   * @param prefix The prefix to check for.
   * @return A new `Expr` representing the 'starts with' comparison.
   */
  startsWith(prefix: string): BooleanExpr;

  /**
   * Creates an expression that checks if a string starts with a given prefix (represented as an
   * expression).
   *
   * ```typescript
   * // Check if the 'fullName' field starts with the value of the 'firstName' field
   * Field.of("fullName").startsWith(Field.of("firstName"));
   * ```
   *
   * @param prefix The prefix expression to check for.
   * @return A new `Expr` representing the 'starts with' comparison.
   */
  startsWith(prefix: Expr): BooleanExpr;
  startsWith(stringOrExpr: string | Expr): BooleanExpr {
    return new BooleanExpr('starts_with', [
      this,
      valueToDefaultExpr(stringOrExpr)
    ]);
  }

  /**
   * Creates an expression that checks if a string ends with a given postfix.
   *
   * ```typescript
   * // Check if the 'filename' field ends with ".txt"
   * Field.of("filename").endsWith(".txt");
   * ```
   *
   * @param suffix The postfix to check for.
   * @return A new `Expr` representing the 'ends with' comparison.
   */
  endsWith(suffix: string): BooleanExpr;

  /**
   * Creates an expression that checks if a string ends with a given postfix (represented as an
   * expression).
   *
   * ```typescript
   * // Check if the 'url' field ends with the value of the 'extension' field
   * Field.of("url").endsWith(Field.of("extension"));
   * ```
   *
   * @param suffix The postfix expression to check for.
   * @return A new `Expr` representing the 'ends with' comparison.
   */
  endsWith(suffix: Expr): BooleanExpr;
  endsWith(stringOrExpr: string | Expr): BooleanExpr {
    return new BooleanExpr('ends_with', [
      this,
      valueToDefaultExpr(stringOrExpr)
    ]);
  }

  /**
   * Creates an expression that converts a string to lowercase.
   *
   * ```typescript
   * // Convert the 'name' field to lowercase
   * Field.of("name").toLower();
   * ```
   *
   * @return A new `Expr` representing the lowercase string.
   */
  toLower(): FunctionExpr {
    return new FunctionExpr('to_lower', [this]);
  }

  /**
   * Creates an expression that converts a string to uppercase.
   *
   * ```typescript
   * // Convert the 'title' field to uppercase
   * Field.of("title").toUpper();
   * ```
   *
   * @return A new `Expr` representing the uppercase string.
   */
  toUpper(): FunctionExpr {
    return new FunctionExpr('to_upper', [this]);
  }

  /**
   * Creates an expression that removes leading and trailing whitespace from a string.
   *
   * ```typescript
   * // Trim whitespace from the 'userInput' field
   * Field.of("userInput").trim();
   * ```
   *
   * @return A new `Expr` representing the trimmed string.
   */
  trim(): FunctionExpr {
    return new FunctionExpr('trim', [this]);
  }

  /**
   * Creates an expression that concatenates string expressions together.
   *
   * ```typescript
   * // Combine the 'firstName', " ", and 'lastName' fields into a single string
   * Field.of("firstName").strConcat(Constant.of(" "), Field.of("lastName"));
   * ```
   *
   * @param secondString The additional expression or string literal to concatenate.
   * @param otherStrings Optional additional expressions or string literals to concatenate.
   * @return A new `Expr` representing the concatenated string.
   */
  strConcat(
    secondString: Expr | string,
    ...otherStrings: Array<Expr | string>
  ): FunctionExpr {
    const elements = [secondString, ...otherStrings];
    const exprs = elements.map(valueToDefaultExpr);
    return new FunctionExpr('str_concat', [this, ...exprs]);
  }

  /**
   * Creates an expression that reverses this string expression.
   *
   * ```typescript
   * // Reverse the value of the 'myString' field.
   * Field.of("myString").reverse();
   * ```
   *
   * @return A new {@code Expr} representing the reversed string.
   */
  reverse(): FunctionExpr {
    return new FunctionExpr('reverse', [this]);
  }

  /**
   * Creates an expression that replaces the first occurrence of a substring within this string expression with another substring.
   *
   * ```typescript
   * // Replace the first occurrence of "hello" with "hi" in the 'message' field
   * Field.of("message").replaceFirst("hello", "hi");
   * ```
   *
   * @param find The substring to search for.
   * @param replace The substring to replace the first occurrence of 'find' with.
   * @return A new {@code Expr} representing the string with the first occurrence replaced.
   */
  replaceFirst(find: string, replace: string): FunctionExpr;

  /**
   * Creates an expression that replaces the first occurrence of a substring within this string expression with another substring,
   * where the substring to find and the replacement substring are specified by expressions.
   *
   * ```typescript
   * // Replace the first occurrence of the value in 'findField' with the value in 'replaceField' in the 'message' field
   * Field.of("message").replaceFirst(Field.of("findField"), Field.of("replaceField"));
   * ```
   *
   * @param find The expression representing the substring to search for.
   * @param replace The expression representing the substring to replace the first occurrence of 'find' with.
   * @return A new {@code Expr} representing the string with the first occurrence replaced.
   */
  replaceFirst(find: Expr, replace: Expr): FunctionExpr;
  replaceFirst(find: Expr | string, replace: Expr | string): FunctionExpr {
    return new FunctionExpr('replace_first', [
      this,
      valueToDefaultExpr(find),
      valueToDefaultExpr(replace)
    ]);
  }

  /**
   * Creates an expression that replaces all occurrences of a substring within this string expression with another substring.
   *
   * ```typescript
   * // Replace all occurrences of "hello" with "hi" in the 'message' field
   * Field.of("message").replaceAll("hello", "hi");
   * ```
   *
   * @param find The substring to search for.
   * @param replace The substring to replace all occurrences of 'find' with.
   * @return A new {@code Expr} representing the string with all occurrences replaced.
   */
  replaceAll(find: string, replace: string): FunctionExpr;

  /**
   * Creates an expression that replaces all occurrences of a substring within this string expression with another substring,
   * where the substring to find and the replacement substring are specified by expressions.
   *
   * ```typescript
   * // Replace all occurrences of the value in 'findField' with the value in 'replaceField' in the 'message' field
   * Field.of("message").replaceAll(Field.of("findField"), Field.of("replaceField"));
   * ```
   *
   * @param find The expression representing the substring to search for.
   * @param replace The expression representing the substring to replace all occurrences of 'find' with.
   * @return A new {@code Expr} representing the string with all occurrences replaced.
   */
  replaceAll(find: Expr, replace: Expr): FunctionExpr;
  replaceAll(find: Expr | string, replace: Expr | string): FunctionExpr {
    return new FunctionExpr('replace_all', [
      this,
      valueToDefaultExpr(find),
      valueToDefaultExpr(replace)
    ]);
  }

  /**
   * Creates an expression that calculates the length of this string expression in bytes.
   *
   * ```typescript
   * // Calculate the length of the 'myString' field in bytes.
   * Field.of("myString").byteLength();
   * ```
   *
   * @return A new {@code Expr} representing the length of the string in bytes.
   */
  byteLength(): FunctionExpr {
    return new FunctionExpr('byte_length', [this]);
  }

  /**
   * Accesses a value from a map (object) field using the provided key.
   *
   * ```typescript
   * // Get the 'city' value from the 'address' map field
   * Field.of("address").mapGet("city");
   * ```
   *
   * @param subfield The key to access in the map.
   * @return A new `Expr` representing the value associated with the given key in the map.
   */
  mapGet(subfield: string): FunctionExpr {
    return new FunctionExpr('map_get', [this, Constant.of(subfield)]);
  }

  /**
   * Creates an aggregation that counts the number of stage inputs with valid evaluations of the
   * expression or field.
   *
   * ```typescript
   * // Count the total number of products
   * Field.of("productId").count().as("totalProducts");
   * ```
   *
   * @return A new `AggregateFunction` representing the 'count' aggregation.
   */
  count(): AggregateFunction {
    return new AggregateFunction('count', [this]);
  }

  /**
   * Creates an aggregation that calculates the sum of a numeric field across multiple stage inputs.
   *
   * ```typescript
   * // Calculate the total revenue from a set of orders
   * Field.of("orderAmount").sum().as("totalRevenue");
   * ```
   *
   * @return A new `AggregateFunction` representing the 'sum' aggregation.
   */
  sum(): AggregateFunction {
    return new AggregateFunction('sum', [this]);
  }

  /**
   * Creates an aggregation that calculates the average (mean) of a numeric field across multiple
   * stage inputs.
   *
   * ```typescript
   * // Calculate the average age of users
   * Field.of("age").avg().as("averageAge");
   * ```
   *
   * @return A new `AggregateFunction` representing the 'avg' aggregation.
   */
  avg(): AggregateFunction {
    return new AggregateFunction('avg', [this]);
  }

  /**
   * Creates an aggregation that finds the minimum value of a field across multiple stage inputs.
   *
   * ```typescript
   * // Find the lowest price of all products
   * Field.of("price").minimum().as("lowestPrice");
   * ```
   *
   * @return A new `AggregateFunction` representing the 'min' aggregation.
   */
  minimum(): AggregateFunction {
    return new AggregateFunction('minimum', [this]);
  }

  /**
   * Creates an aggregation that finds the maximum value of a field across multiple stage inputs.
   *
   * ```typescript
   * // Find the highest score in a leaderboard
   * Field.of("score").maximum().as("highestScore");
   * ```
   *
   * @return A new `AggregateFunction` representing the 'max' aggregation.
   */
  maximum(): AggregateFunction {
    return new AggregateFunction('maximum', [this]);
  }

  /**
   * Creates an expression that returns the larger value between this expression and another expression, based on Firestore's value type ordering.
   *
   * ```typescript
   * // Returns the larger value between the 'timestamp' field and the current timestamp.
   * Field.of("timestamp").logicalMaximum(Function.currentTimestamp());
   * ```
   *
   * @param second The second expression or literal to compare with.
   * @param others Optional additional expressions or literals to compare with.
   * @return A new {@code Expr} representing the logical max operation.
   */
  logicalMaximum(
    second: Expr | any,
    ...others: Array<Expr | any>
  ): FunctionExpr {
    const values = [second, ...others];
    return new FunctionExpr('logical_maximum', [
      this,
      ...values.map(valueToDefaultExpr)
    ]);
  }

  /**
   * Creates an expression that returns the smaller value between this expression and another expression, based on Firestore's value type ordering.
   *
   * ```typescript
   * // Returns the smaller value between the 'timestamp' field and the current timestamp.
   * Field.of("timestamp").logicalMinimum(Function.currentTimestamp());
   * ```
   *
   * @param second The second expression or literal to compare with.
   * @param others Optional additional expressions or literals to compare with.
   * @return A new {@code Expr} representing the logical min operation.
   */
  logicalMinimum(
    second: Expr | any,
    ...others: Array<Expr | any>
  ): FunctionExpr {
    const values = [second, ...others];
    return new FunctionExpr('logical_min', [
      this,
      ...values.map(valueToDefaultExpr)
    ]);
  }

  /**
   * Creates an expression that calculates the length (number of dimensions) of this Firestore Vector expression.
   *
   * ```typescript
   * // Get the vector length (dimension) of the field 'embedding'.
   * Field.of("embedding").vectorLength();
   * ```
   *
   * @return A new {@code Expr} representing the length of the vector.
   */
  vectorLength(): FunctionExpr {
    return new FunctionExpr('vector_length', [this]);
  }

  /**
   * Calculates the cosine distance between two vectors.
   *
   * ```typescript
   * // Calculate the cosine distance between the 'userVector' field and the 'itemVector' field
   * Field.of("userVector").cosineDistance(Field.of("itemVector"));
   * ```
   *
   * @param other The other vector (represented as an Expr) to compare against.
   * @return A new `Expr` representing the cosine distance between the two vectors.
   */
  cosineDistance(other: Expr): FunctionExpr;
  /**
   * Calculates the Cosine distance between two vectors.
   *
   * ```typescript
   * // Calculate the Cosine distance between the 'location' field and a target location
   * Field.of("location").cosineDistance(new VectorValue([37.7749, -122.4194]));
   * ```
   *
   * @param other The other vector (as a VectorValue) to compare against.
   * @return A new `Expr` representing the Cosine* distance between the two vectors.
   */
  cosineDistance(other: VectorValue): FunctionExpr;
  /**
   * Calculates the Cosine distance between two vectors.
   *
   * ```typescript
   * // Calculate the Cosine distance between the 'location' field and a target location
   * Field.of("location").cosineDistance([37.7749, -122.4194]);
   * ```
   *
   * @param other The other vector (as an array of numbers) to compare against.
   * @return A new `Expr` representing the Cosine distance between the two vectors.
   */
  cosineDistance(other: number[]): FunctionExpr;
  cosineDistance(other: Expr | VectorValue | number[]): FunctionExpr {
    return new FunctionExpr('cosine_distance', [this, vectorToExpr(other)]);
  }

  /**
   * Calculates the dot product between two vectors.
   *
   * ```typescript
   * // Calculate the dot product between a feature vector and a target vector
   * Field.of("features").dotProduct([0.5, 0.8, 0.2]);
   * ```
   *
   * @param other The other vector (as an array of numbers) to calculate with.
   * @return A new `Expr` representing the dot product between the two vectors.
   */
  dotProduct(other: Expr): FunctionExpr;

  /**
   * Calculates the dot product between two vectors.
   *
   * ```typescript
   * // Calculate the dot product between a feature vector and a target vector
   * Field.of("features").dotProduct(new VectorValue([0.5, 0.8, 0.2]));
   * ```
   *
   * @param other The other vector (as an array of numbers) to calculate with.
   * @return A new `Expr` representing the dot product between the two vectors.
   */
  dotProduct(other: VectorValue): FunctionExpr;

  /**
   * Calculates the dot product between two vectors.
   *
   * ```typescript
   * // Calculate the dot product between a feature vector and a target vector
   * Field.of("features").dotProduct([0.5, 0.8, 0.2]);
   * ```
   *
   * @param other The other vector (as an array of numbers) to calculate with.
   * @return A new `Expr` representing the dot product between the two vectors.
   */
  dotProduct(other: number[]): FunctionExpr;
  dotProduct(other: Expr | VectorValue | number[]): FunctionExpr {
    return new FunctionExpr('dot_product', [this, vectorToExpr(other)]);
  }

  /**
   * Calculates the Euclidean distance between two vectors.
   *
   * ```typescript
   * // Calculate the Euclidean distance between the 'location' field and a target location
   * Field.of("location").euclideanDistance([37.7749, -122.4194]);
   * ```
   *
   * @param other The other vector (as an array of numbers) to calculate with.
   * @return A new `Expr` representing the Euclidean distance between the two vectors.
   */
  euclideanDistance(other: Expr): FunctionExpr;

  /**
   * Calculates the Euclidean distance between two vectors.
   *
   * ```typescript
   * // Calculate the Euclidean distance between the 'location' field and a target location
   * Field.of("location").euclideanDistance(new VectorValue([37.7749, -122.4194]));
   * ```
   *
   * @param other The other vector (as a VectorValue) to compare against.
   * @return A new `Expr` representing the Euclidean distance between the two vectors.
   */
  euclideanDistance(other: VectorValue): FunctionExpr;

  /**
   * Calculates the Euclidean distance between two vectors.
   *
   * ```typescript
   * // Calculate the Euclidean distance between the 'location' field and a target location
   * Field.of("location").euclideanDistance([37.7749, -122.4194]);
   * ```
   *
   * @param other The other vector (as an array of numbers) to compare against.
   * @return A new `Expr` representing the Euclidean distance between the two vectors.
   */
  euclideanDistance(other: number[]): FunctionExpr;
  euclideanDistance(other: Expr | VectorValue | number[]): FunctionExpr {
    return new FunctionExpr('euclidean_distance', [this, vectorToExpr(other)]);
  }
  /**
   * @beta
   *
   * Calculates the Manhattan distance between the result of this expression and another VectorValue.
   *
   * ```typescript
   * // Calculate the Manhattan distance between the 'location' field and a target location
   * Field.of("location").manhattanDistance(new VectorValue([37.7749, -122.4194]));
   * ```
   *
   * @param other The other vector (as a VectorValue) to compare against.
   * @return A new {@code Expr} representing the Manhattan distance between the two vectors.
   */
  manhattanDistance(other: VectorValue): FunctionExpr;

  /**
   * @beta
   *
   * Calculates the Manhattan distance between the result of this expression and a double array.
   *
   * ```typescript
   * // Calculate the Manhattan distance between the 'location' field and a target location
   * Field.of("location").manhattanDistance([37.7749, -122.4194]);
   * ```
   *
   * @param other The other vector (as an array of doubles) to compare against.
   * @return A new {@code Expr} representing the Manhattan distance between the two vectors.
   */
  manhattanDistance(other: number[]): FunctionExpr;

  /**
   * @beta
   *
   * Calculates the Manhattan distance between two vector expressions.
   *
   * ```typescript
   * // Calculate the Manhattan distance between two vector fields: 'pointA' and 'pointB'
   * Field.of("pointA").manhattanDistance(Field.of("pointB"));
   * ```
   *
   * @param other The other vector (represented as an Expr) to compare against.
   * @return A new {@code Expr} representing the Manhattan distance between the two vectors.
   */
  manhattanDistance(other: Expr): FunctionExpr;
  manhattanDistance(other: Expr | number[] | VectorValue): FunctionExpr {
    return new FunctionExpr('manhattan_distance', [this, vectorToExpr(other)]);
  }

  /**
   * Creates an expression that interprets this expression as the number of microseconds since the Unix epoch (1970-01-01 00:00:00 UTC)
   * and returns a timestamp.
   *
   * ```typescript
   * // Interpret the 'microseconds' field as microseconds since epoch.
   * Field.of("microseconds").unixMicrosToTimestamp();
   * ```
   *
   * @return A new {@code Expr} representing the timestamp.
   */
  unixMicrosToTimestamp(): FunctionExpr {
    return new FunctionExpr('unix_micros_to_timestamp', [this]);
  }

  /**
   * Creates an expression that converts this timestamp expression to the number of microseconds since the Unix epoch (1970-01-01 00:00:00 UTC).
   *
   * ```typescript
   * // Convert the 'timestamp' field to microseconds since epoch.
   * Field.of("timestamp").timestampToUnixMicros();
   * ```
   *
   * @return A new {@code Expr} representing the number of microseconds since epoch.
   */
  timestampToUnixMicros(): FunctionExpr {
    return new FunctionExpr('timestamp_to_unix_micros', [this]);
  }

  /**
   * Creates an expression that interprets this expression as the number of milliseconds since the Unix epoch (1970-01-01 00:00:00 UTC)
   * and returns a timestamp.
   *
   * ```typescript
   * // Interpret the 'milliseconds' field as milliseconds since epoch.
   * Field.of("milliseconds").unixMillisToTimestamp();
   * ```
   *
   * @return A new {@code Expr} representing the timestamp.
   */
  unixMillisToTimestamp(): FunctionExpr {
    return new FunctionExpr('unix_millis_to_timestamp', [this]);
  }

  /**
   * Creates an expression that converts this timestamp expression to the number of milliseconds since the Unix epoch (1970-01-01 00:00:00 UTC).
   *
   * ```typescript
   * // Convert the 'timestamp' field to milliseconds since epoch.
   * Field.of("timestamp").timestampToUnixMillis();
   * ```
   *
   * @return A new {@code Expr} representing the number of milliseconds since epoch.
   */
  timestampToUnixMillis(): FunctionExpr {
    return new FunctionExpr('timestamp_to_unix_millis', [this]);
  }

  /**
   * Creates an expression that interprets this expression as the number of seconds since the Unix epoch (1970-01-01 00:00:00 UTC)
   * and returns a timestamp.
   *
   * ```typescript
   * // Interpret the 'seconds' field as seconds since epoch.
   * Field.of("seconds").unixSecondsToTimestamp();
   * ```
   *
   * @return A new {@code Expr} representing the timestamp.
   */
  unixSecondsToTimestamp(): FunctionExpr {
    return new FunctionExpr('unix_seconds_to_timestamp', [this]);
  }

  /**
   * Creates an expression that converts this timestamp expression to the number of seconds since the Unix epoch (1970-01-01 00:00:00 UTC).
   *
   * ```typescript
   * // Convert the 'timestamp' field to seconds since epoch.
   * Field.of("timestamp").timestampToUnixSeconds();
   * ```
   *
   * @return A new {@code Expr} representing the number of seconds since epoch.
   */
  timestampToUnixSeconds(): FunctionExpr {
    return new FunctionExpr('timestamp_to_unix_seconds', [this]);
  }

  /**
   * Creates an expression that adds a specified amount of time to this timestamp expression.
   *
   * ```typescript
   * // Add some duration determined by field 'unit' and 'amount' to the 'timestamp' field.
   * Field.of("timestamp").timestampAdd(Field.of("unit"), Field.of("amount"));
   * ```
   *
   * @param unit The expression evaluates to unit of time, must be one of 'microsecond', 'millisecond', 'second', 'minute', 'hour', 'day'.
   * @param amount The expression evaluates to amount of the unit.
   * @return A new {@code Expr} representing the resulting timestamp.
   */
  timestampAdd(unit: Expr, amount: Expr): FunctionExpr;

  /**
   * Creates an expression that adds a specified amount of time to this timestamp expression.
   *
   * ```typescript
   * // Add 1 day to the 'timestamp' field.
   * Field.of("timestamp").timestampAdd("day", 1);
   * ```
   *
   * @param unit The unit of time to add (e.g., "day", "hour").
   * @param amount The amount of time to add.
   * @return A new {@code Expr} representing the resulting timestamp.
   */
  timestampAdd(
    unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
    amount: number
  ): FunctionExpr;
  timestampAdd(
    unit:
      | Expr
      | 'microsecond'
      | 'millisecond'
      | 'second'
      | 'minute'
      | 'hour'
      | 'day',
    amount: Expr | number
  ): FunctionExpr {
    return new FunctionExpr('timestamp_add', [
      this,
      valueToDefaultExpr(unit),
      valueToDefaultExpr(amount)
    ]);
  }

  /**
   * Creates an expression that subtracts a specified amount of time from this timestamp expression.
   *
   * ```typescript
   * // Subtract some duration determined by field 'unit' and 'amount' from the 'timestamp' field.
   * Field.of("timestamp").timestampSub(Field.of("unit"), Field.of("amount"));
   * ```
   *
   * @param unit The expression evaluates to unit of time, must be one of 'microsecond', 'millisecond', 'second', 'minute', 'hour', 'day'.
   * @param amount The expression evaluates to amount of the unit.
   * @return A new {@code Expr} representing the resulting timestamp.
   */
  timestampSub(unit: Expr, amount: Expr): FunctionExpr;

  /**
   * Creates an expression that subtracts a specified amount of time from this timestamp expression.
   *
   * ```typescript
   * // Subtract 1 day from the 'timestamp' field.
   * Field.of("timestamp").timestampSub("day", 1);
   * ```
   *
   * @param unit The unit of time to subtract (e.g., "day", "hour").
   * @param amount The amount of time to subtract.
   * @return A new {@code Expr} representing the resulting timestamp.
   */
  timestampSub(
    unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
    amount: number
  ): FunctionExpr;
  timestampSub(
    unit:
      | Expr
      | 'microsecond'
      | 'millisecond'
      | 'second'
      | 'minute'
      | 'hour'
      | 'day',
    amount: Expr | number
  ): FunctionExpr {
    return new FunctionExpr('timestamp_sub', [
      this,
      valueToDefaultExpr(unit),
      valueToDefaultExpr(amount)
    ]);
  }

  /**
   * @beta
   *
   * Creates an expression that applies a bitwise AND operation between this expression and a constant.
   *
   * ```typescript
   * // Calculate the bitwise AND of 'field1' and 0xFF.
   * Field.of("field1").bitAnd(0xFF);
   * ```
   *
   * @param otherBits A constant representing bits.
   * @return A new {@code Expr} representing the bitwise AND operation.
   */
  bitAnd(otherBits: number | Bytes): FunctionExpr;
  /**
   * @beta
   *
   * Creates an expression that applies a bitwise AND operation between two expressions.
   *
   * ```typescript
   * // Calculate the bitwise AND of 'field1' and 'field2'.
   * Field.of("field1").bitAnd(Field.of("field2"));
   * ```
   *
   * @param bitsExpression An expression that returns bits when evaluated.
   * @return A new {@code Expr} representing the bitwise AND operation.
   */
  bitAnd(bitsExpression: Expr): FunctionExpr;
  bitAnd(bitsOrExpression: number | Expr | Bytes): FunctionExpr {
    return new FunctionExpr('bit_and', [
      this,
      valueToDefaultExpr(bitsOrExpression)
    ]);
  }

  /**
   * @beta
   *
   * Creates an expression that applies a bitwise OR operation between this expression and a constant.
   *
   * ```typescript
   * // Calculate the bitwise OR of 'field1' and 0xFF.
   * Field.of("field1").bitOr(0xFF);
   * ```
   *
   * @param otherBits A constant representing bits.
   * @return A new {@code Expr} representing the bitwise OR operation.
   */
  bitOr(otherBits: number | Bytes): FunctionExpr;
  /**
   * @beta
   *
   * Creates an expression that applies a bitwise OR operation between two expressions.
   *
   * ```typescript
   * // Calculate the bitwise OR of 'field1' and 'field2'.
   * Field.of("field1").bitOr(Field.of("field2"));
   * ```
   *
   * @param bitsExpression An expression that returns bits when evaluated.
   * @return A new {@code Expr} representing the bitwise OR operation.
   */
  bitOr(bitsExpression: Expr): FunctionExpr;
  bitOr(bitsOrExpression: number | Expr | Bytes): FunctionExpr {
    return new FunctionExpr('bit_or', [
      this,
      valueToDefaultExpr(bitsOrExpression)
    ]);
  }

  /**
   * @beta
   *
   * Creates an expression that applies a bitwise XOR operation between this expression and a constant.
   *
   * ```typescript
   * // Calculate the bitwise XOR of 'field1' and 0xFF.
   * Field.of("field1").bitXor(0xFF);
   * ```
   *
   * @param otherBits A constant representing bits.
   * @return A new {@code Expr} representing the bitwise XOR operation.
   */
  bitXor(otherBits: number | Bytes): FunctionExpr;
  /**
   * @beta
   *
   * Creates an expression that applies a bitwise XOR operation between two expressions.
   *
   * ```typescript
   * // Calculate the bitwise XOR of 'field1' and 'field2'.
   * Field.of("field1").bitXor(Field.of("field2"));
   * ```
   *
   * @param bitsExpression An expression that returns bits when evaluated.
   * @return A new {@code Expr} representing the bitwise XOR operation.
   */
  bitXor(bitsExpression: Expr): FunctionExpr;
  bitXor(bitsOrExpression: number | Expr | Bytes): FunctionExpr {
    return new FunctionExpr('bit_xor', [
      this,
      valueToDefaultExpr(bitsOrExpression)
    ]);
  }

  /**
   * @beta
   *
   * Creates an expression that applies a bitwise NOT operation to this expression.
   *
   * ```typescript
   * // Calculate the bitwise NOT of 'field1'.
   * Field.of("field1").bitNot();
   * ```
   *
   * @return A new {@code Expr} representing the bitwise NOT operation.
   */
  bitNot(): FunctionExpr {
    return new FunctionExpr('bit_not', [this]);
  }

  /**
   * @beta
   *
   * Creates an expression that applies a bitwise left shift operation to this expression.
   *
   * ```typescript
   * // Calculate the bitwise left shift of 'field1' by 2 bits.
   * Field.of("field1").bitLeftShift(2);
   * ```
   *
   * @param y The operand constant representing the number of bits to shift.
   * @return A new {@code Expr} representing the bitwise left shift operation.
   */
  bitLeftShift(y: number): FunctionExpr;
  /**
   * @beta
   *
   * Creates an expression that applies a bitwise left shift operation to this expression.
   *
   * ```typescript
   * // Calculate the bitwise left shift of 'field1' by 'field2' bits.
   * Field.of("field1").bitLeftShift(Field.of("field2"));
   * ```
   *
   * @param numberExpr The operand expression representing the number of bits to shift.
   * @return A new {@code Expr} representing the bitwise left shift operation.
   */
  bitLeftShift(numberExpr: Expr): FunctionExpr;
  bitLeftShift(numberExpr: number | Expr): FunctionExpr {
    return new FunctionExpr('bit_left_shift', [
      this,
      valueToDefaultExpr(numberExpr)
    ]);
  }

  /**
   * @beta
   *
   * Creates an expression that applies a bitwise right shift operation to this expression.
   *
   * ```typescript
   * // Calculate the bitwise right shift of 'field1' by 2 bits.
   * Field.of("field1").bitRightShift(2);
   * ```
   *
   * @param right The operand constant representing the number of bits to shift.
   * @return A new {@code Expr} representing the bitwise right shift operation.
   */
  bitRightShift(y: number): FunctionExpr;
  /**
   * @beta
   *
   * Creates an expression that applies a bitwise right shift operation to this expression.
   *
   * ```typescript
   * // Calculate the bitwise right shift of 'field1' by 'field2' bits.
   * Field.of("field1").bitRightShift(Field.of("field2"));
   * ```
   *
   * @param numberExpr The operand expression representing the number of bits to shift.
   * @return A new {@code Expr} representing the bitwise right shift operation.
   */
  bitRightShift(numberExpr: Expr): FunctionExpr;
  bitRightShift(numberExpr: number | Expr): FunctionExpr {
    return new FunctionExpr('bit_right_shift', [
      this,
      valueToDefaultExpr(numberExpr)
    ]);
  }

  /**
   * @beta
   *
   * Creates an expression that returns the document ID from a path.
   *
   * ```typescript
   * // Get the document ID from a path.
   * Field.of("__path__").documentId();
   * ```
   *
   * @return A new {@code Expr} representing the documentId operation.
   */
  documentId(): FunctionExpr {
    return new FunctionExpr('document_id', [this]);
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
  substr(position: number, length?: number): FunctionExpr;

  /**
   * @beta
   *
   * Creates an expression that returns a substring of the results of this expression.
   *
   * @param position An expression returning the index of the first character of the substring.
   * @param length An expression returning the length of the substring. If not provided the
   * substring will end at the end of the input.
   */
  substr(position: Expr, length?: Expr): FunctionExpr;
  substr(position: Expr | number, length?: Expr | number): FunctionExpr {
    const positionExpr = valueToDefaultExpr(position);
    if (length === undefined) {
      return new FunctionExpr('substr', [this, positionExpr]);
    } else {
      return new FunctionExpr('substr', [
        this,
        positionExpr,
        valueToDefaultExpr(length)
      ]);
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
   * Field.of('tags').arrayOffset(1);
   * ```
   *
   * @param offset The index of the element to return.
   * @return A new Expr representing the 'arrayOffset' operation.
   */
  arrayOffset(offset: number): FunctionExpr;

  /**
   * @beta
   * Creates an expression that indexes into an array from the beginning or end
   * and returns the element. If the offset exceeds the array length, an error is
   * returned. A negative offset, starts from the end.
   *
   * ```typescript
   * // Return the value in the tags field array at index specified by field
   * // 'favoriteTag'.
   * Field.of('tags').arrayOffset(Field.of('favoriteTag'));
   * ```
   *
   * @param offsetExpr An Expr evaluating to the index of the element to return.
   * @return A new Expr representing the 'arrayOffset' operation.
   */
  arrayOffset(offsetExpr: Expr): FunctionExpr;
  arrayOffset(offset: Expr | number): FunctionExpr {
    return new FunctionExpr('array_offset', [this, valueToDefaultExpr(offset)]);
  }

  /**
   * @beta
   *
   * Creates an expression that checks if a given expression produces an error.
   *
   * ```typescript
   * // Check if the result of a calculation is an error
   * Field.of("title").arrayContains(1).isError();
   * ```
   *
   * @return A new {@code BooleanExpr} representing the 'isError' check.
   */
  isError(): BooleanExpr {
    return new BooleanExpr('is_error', [this]);
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
   * Field.of("title").arrayOffset(0).ifError(Field.of("title"));
   * ```
   *
   * @param catchExpr The catch expression that will be evaluated and
   * returned if this expression produces an error.
   * @return A new {@code Expr} representing the 'ifError' operation.
   */
  ifError(catchExpr: Expr): FunctionExpr;

  /**
   * @beta
   *
   * Creates an expression that returns the `catch` argument if there is an
   * error, else return the result of this expression.
   *
   * ```typescript
   * // Returns the first item in the title field arrays, or returns
   * // "Default Title"
   * Field.of("title").arrayOffset(0).ifError("Default Title");
   * ```
   *
   * @param catchValue The value that will be returned if this expression
   * produces an error.
   * @return A new {@code Expr} representing the 'ifError' operation.
   */
  ifError(catchValue: any): FunctionExpr;
  ifError(catchValue: any): FunctionExpr {
    return new FunctionExpr('if_error', [this, valueToDefaultExpr(catchValue)]);
  }

  /**
   * @beta
   *
   * Creates an expression that returns `true` if the result of this expression
   * is absent. Otherwise, returns `false` even if the value is `null`.
   *
   * ```typescript
   * // Check if the field `value` is absent.
   * Field.of("value").isAbsent();
   * ```
   *
   * @return A new {@code BooleanExpr} representing the 'isAbsent' check.
   */
  isAbsent(): BooleanExpr {
    return new BooleanExpr('is_absent', [this]);
  }

  /**
   * @beta
   *
   * Creates an expression that checks if tbe result of an expression is not null.
   *
   * ```typescript
   * // Check if the value of the 'name' field is not null
   * Field.of("name").isNotNull();
   * ```
   *
   * @return A new {@code BooleanExpr} representing the 'isNotNull' check.
   */
  isNotNull(): BooleanExpr {
    return new BooleanExpr('is_not_null', [this]);
  }

  /**
   * @beta
   *
   * Creates an expression that checks if the results of this expression is NOT 'NaN' (Not a Number).
   *
   * ```typescript
   * // Check if the result of a calculation is NOT NaN
   * Field.of("value").divide(0).isNotNan();
   * ```
   *
   * @return A new {@code Expr} representing the 'isNaN' check.
   */
  isNotNan(): BooleanExpr {
    return new BooleanExpr('is_not_nan', [this]);
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
  mapRemove(key: string): FunctionExpr;
  /**
   * @beta
   *
   * Creates an expression that removes a key from the map produced by evaluating this expression.
   *
   * ```
   * // Removes the key 'baz' from the input map.
   * map({foo: 'bar', baz: true}).mapRemove(Constant.of('baz'));
   * ```
   *
   * @param keyExpr An expression that produces the name of the key to remove from the input map.
   * @returns A new {@code FirestoreFunction} representing the 'mapRemove' operation.
   */
  mapRemove(keyExpr: Expr): FunctionExpr;
  mapRemove(stringExpr: Expr | string): FunctionExpr {
    return new FunctionExpr('map_remove', [
      this,
      valueToDefaultExpr(stringExpr)
    ]);
  }

  /**
   * @beta
   *
   * Creates an expression that merges multiple map values.
   *
   * ```
   * // Merges the map in the settings field with, a map literal, and a map in
   * // that is conditionally returned by another expression
   * Field.of('settings').mapMerge({ enabled: true }, cond(Field.of('isAdmin'), { admin: true}, {})
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
    secondMap: Record<string, any> | Expr,
    ...otherMaps: Array<Record<string, any> | Expr>
  ): FunctionExpr {
    const secondMapExpr = valueToDefaultExpr(secondMap);
    const otherMapExprs = otherMaps.map(valueToDefaultExpr);
    return new FunctionExpr('map_merge', [
      this,
      secondMapExpr,
      ...otherMapExprs
    ]);
  }

  /**
   * Creates an {@link Ordering} that sorts documents in ascending order based on this expression.
   *
   * ```typescript
   * // Sort documents by the 'name' field in ascending order
   * pipeline().collection("users")
   *   .sort(Field.of("name").ascending());
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
   *   .sort(Field.of("createdAt").descending());
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
   *   .addFields(Field.of("price").multiply(Field.of("quantity")).as("totalPrice"));
   * ```
   *
   * @param name The alias to assign to this expression.
   * @return A new {@link ExprWithAlias} that wraps this
   *     expression and associates it with the provided alias.
   */
  as(name: string): ExprWithAlias {
    return new ExprWithAlias(this, name);
  }
}

/**
 * @beta
 *
 * An interface that represents a selectable expression.
 */
export interface Selectable {
  selectable: true;
  readonly alias: string;
  readonly expr: Expr;
}

/**
 * @beta
 *
 * A class that represents an aggregate function.
 */
export class AggregateFunction implements ProtoValueSerializable, UserData {
  exprType: ExprType = 'AggregateFunction';

  constructor(private name: string, private params: Expr[]) {}

  /**
   * Assigns an alias to this AggregateFunction. The alias specifies the name that
   * the aggregated value will have in the output document.
   *
   * ```typescript
   * // Calculate the average price of all items and assign it the alias "averagePrice".
   * firestore.pipeline().collection("items")
   *   .aggregate(Field.of("price").avg().as("averagePrice"));
   * ```
   *
   * @param name The alias to assign to this AggregateFunction.
   * @return A new {@link AggregateWithAlias} that wraps this
   *     AggregateFunction and associates it with the provided alias.
   */
  as(name: string): AggregateWithAlias {
    return new AggregateWithAlias(this, name);
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
  _readUserData(dataReader: UserDataReader): void {
    this.params.forEach(expr => {
      return expr._readUserData(dataReader);
    });
  }
}

/**
 * @beta
 *
 * An AggregateFunction with alias.
 */
export class AggregateWithAlias
  implements UserData, ProtoSerializable<ProtoValue>
{
  constructor(readonly aggregate: AggregateFunction, readonly alias: string) {}

  /**
   * @private
   * @internal
   */
  _toProto(serializer: JsonProtoSerializer): ProtoValue {
    throw new Error('ExprWithAlias should not be serialized directly.');
  }

  /**
   * @private
   * @internal
   */
  _readUserData(dataReader: UserDataReader): void {
    this.aggregate._readUserData(dataReader);
  }
}

/**
 * @beta
 */
export class ExprWithAlias implements Selectable, UserData {
  exprType: ExprType = 'ExprWithAlias';
  selectable = true as const;

  constructor(readonly expr: Expr, readonly alias: string) {}

  /**
   * @private
   * @internal
   */
  _readUserData(dataReader: UserDataReader): void {
    this.expr._readUserData(dataReader);
  }
}

/**
 * @internal
 */
class ListOfExprs extends Expr {
  exprType: ExprType = 'ListOfExprs';

  constructor(private exprs: Expr[]) {
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
  _readUserData(dataReader: UserDataReader): void {
    this.exprs.forEach((expr: Expr) => expr._readUserData(dataReader));
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
 * const nameField = Field.of("name");
 *
 * // Create a Field instance for a nested field 'address.city'
 * const cityField = Field.of("address.city");
 * ```
 */
export class Field extends Expr implements Selectable {
  readonly exprType: ExprType = 'Field';
  selectable = true as const;

  private constructor(private fieldPath: InternalFieldPath) {
    super();
  }

  /**
   * Creates a {@code Field} instance representing the field at the given path.
   *
   * The path can be a simple field name (e.g., "name") or a dot-separated path to a nested field
   * (e.g., "address.city").
   *
   * ```typescript
   * // Create a Field instance for the 'title' field
   * const titleField = Field.of("title");
   *
   * // Create a Field instance for a nested field 'author.firstName'
   * const authorFirstNameField = Field.of("author.firstName");
   * ```
   *
   * @param name The path to the field.
   * @return A new {@code Field} instance representing the specified field.
   */
  static of(name: string): Field;
  static of(path: FieldPath): Field;
  static of(nameOrPath: string | FieldPath): Field {
    if (typeof nameOrPath === 'string') {
      if (DOCUMENT_KEY_NAME === nameOrPath) {
        return new Field(documentId()._internalPath);
      }
      return new Field(fieldPathFromArgument('of', nameOrPath));
    } else {
      if (documentId().isEqual(nameOrPath)) {
        return new Field(documentId()._internalPath);
      }
      return new Field(nameOrPath._internalPath);
    }
  }

  fieldName(): string {
    return this.fieldPath.canonicalString();
  }

  get alias(): string {
    return this.fieldName();
  }

  get expr(): Expr {
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
  _readUserData(dataReader: UserDataReader): void {}
}

/**
 * @beta
 *
 * Represents a constant value that can be used in a Firestore pipeline expression.
 *
 * You can create a `Constant` instance using the static {@link #of} method:
 *
 * ```typescript
 * // Create a Constant instance for the number 10
 * const ten = Constant.of(10);
 *
 * // Create a Constant instance for the string "hello"
 * const hello = Constant.of("hello");
 * ```
 */
export class Constant extends Expr {
  readonly exprType: ExprType = 'Constant';

  private _protoValue?: ProtoValue;

  private constructor(private value: any) {
    super();
  }

  /**
   * Creates a `Constant` instance for a number value.
   *
   * @param value The number value.
   * @return A new `Constant` instance.
   */
  static of(value: number): Constant;

  /**
   * Creates a `Constant` instance for a string value.
   *
   * @param value The string value.
   * @return A new `Constant` instance.
   */
  static of(value: string): Constant;

  /**
   * Creates a `Constant` instance for a boolean value.
   *
   * @param value The boolean value.
   * @return A new `Constant` instance.
   */
  static of(value: boolean): Constant;

  /**
   * Creates a `Constant` instance for a null value.
   *
   * @param value The null value.
   * @return A new `Constant` instance.
   */
  static of(value: null): Constant;

  /**
   * Creates a `Constant` instance for an undefined value.
   * @private
   * @internal
   *
   * @param value The undefined value.
   * @return A new `Constant` instance.
   */
  static of(value: undefined): Constant;

  /**
   * Creates a `Constant` instance for a GeoPoint value.
   *
   * @param value The GeoPoint value.
   * @return A new `Constant` instance.
   */
  static of(value: GeoPoint): Constant;

  /**
   * Creates a `Constant` instance for a Timestamp value.
   *
   * @param value The Timestamp value.
   * @return A new `Constant` instance.
   */
  static of(value: Timestamp): Constant;

  /**
   * Creates a `Constant` instance for a Date value.
   *
   * @param value The Date value.
   * @return A new `Constant` instance.
   */
  static of(value: Date): Constant;

  /**
   * Creates a `Constant` instance for a Bytes value.
   *
   * @param value The Bytes value.
   * @return A new `Constant` instance.
   */
  static of(value: Bytes): Constant;

  /**
   * Creates a `Constant` instance for a DocumentReference value.
   *
   * @param value The DocumentReference value.
   * @return A new `Constant` instance.
   */
  static of(value: DocumentReference): Constant;

  /**
   * Creates a `Constant` instance for a Firestore proto value.
   * For internal use only.
   * @private
   * @internal
   * @param value The Firestore proto value.
   * @return A new `Constant` instance.
   */
  static of(value: ProtoValue): Constant;

  /**
   * Creates a `Constant` instance for an array value.
   *
   * @param value The array value.
   * @return A new `Constant` instance.
   */
  static of(value: any[]): Constant;

  /**
   * Creates a `Constant` instance for a map value.
   *
   * @param value The map value.
   * @return A new `Constant` instance.
   */
  static of(value: Record<string, any>): Constant;

  /**
   * Creates a `Constant` instance for a VectorValue value.
   *
   * @param value The VectorValue value.
   * @return A new `Constant` instance.
   */
  static of(value: VectorValue): Constant;

  static of(value: any): Constant {
    return new Constant(value);
  }

  /**
   * Creates a `Constant` instance for a VectorValue value.
   *
   * ```typescript
   * // Create a Constant instance for a vector value
   * const vectorConstant = Constant.ofVector([1, 2, 3]);
   * ```
   *
   * @param value The VectorValue value.
   * @return A new `Constant` instance.
   */
  static vector(value: number[] | VectorValue): Constant {
    if (value instanceof VectorValue) {
      return new Constant(value);
    } else {
      return new Constant(new VectorValue(value as number[]));
    }
  }

  /**
   * @private
   * @internal
   */
  static _fromProto(value: ProtoValue): Constant {
    const result = new Constant(value);
    result._protoValue = value;
    return result;
  }

  /**
   * @private
   * @internal
   */
  _toProto(serializer: JsonProtoSerializer): ProtoValue {
    hardAssert(
      this._protoValue !== undefined,
      'Value of this constant has not been serialized to proto value'
    );
    return this._protoValue;
  }

  /**
   * @private
   * @internal
   */
  _readUserData(dataReader: UserDataReader): void {
    const context = dataReader.createContext(
      UserDataSource.Argument,
      'Constant.of'
    );

    if (isFirestoreValue(this._protoValue)) {
      return;
    } else if (this.value === undefined) {
      // TODO(pipeline) how should we treat the value of `undefined`?
      this._protoValue = parseData(null, context)!;
    } else {
      this._protoValue = parseData(this.value, context)!;
    }
  }
}

/**
 * Internal only
 * @internal
 * @private
 */
export class MapValue extends Expr {
  constructor(private plainObject: Map<string, Expr>) {
    super();
  }

  exprType: ExprType = 'Constant';

  _readUserData(dataReader: UserDataReader): void {
    this.plainObject.forEach(expr => {
      expr._readUserData(dataReader);
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
 * Typically, you would not use this class or its children directly. Use either the functions like {@link and}, {@link eq},
 * or the methods on {@link Expr} ({@link Expr#eq}, {@link Expr#lt}, etc) to construct new Function instances.
 */
export class FunctionExpr extends Expr {
  readonly exprType: ExprType = 'Function';

  constructor(private name: string, private params: Expr[]) {
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
  _readUserData(dataReader: UserDataReader): void {
    this.params.forEach(expr => {
      return expr._readUserData(dataReader);
    });
  }
}

/**
 * @beta
 *
 * An interface that represents a filter condition.
 */
export class BooleanExpr extends FunctionExpr {
  filterable: true = true;

  /**
   * Creates an aggregation that finds the count of input documents satisfying
   * this boolean expression.
   *
   * ```typescript
   * // Find the count of documents with a score greater than 90
   * Field.of("score").gt(90).countIf().as("highestScore");
   * ```
   *
   * @return A new `AggregateFunction` representing the 'countIf' aggregation.
   */
  countIf(): AggregateFunction {
    return new AggregateFunction('count_if', [this]);
  }

  /**
   * Creates an expression that negates this boolean expression.
   *
   * ```typescript
   * // Find documents where the 'tags' field does not contain 'completed'
   * Field.of("tags").arrayContains("completed").not();
   * ```
   *
   * @return A new {@code Expr} representing the negated filter condition.
   */
  not(): BooleanExpr {
    return new BooleanExpr('not', [this]);
  }
}

/**
 * @beta
 * Creates an aggregation that counts the number of stage inputs where the provided
 * boolean expression evaluates to true.
 *
 * ```typescript
 * // Count the number of documents where 'is_active' field equals true
 * countif(Field.of("is_active").eq(true)).as("numActiveDocuments");
 * ```
 *
 * @param booleanExpr - The boolean expression to evaluate on each input.
 * @returns A new `AggregateFunction` representing the 'countif' aggregation.
 */
export function countIf(booleanExpr: BooleanExpr): AggregateFunction {
  return booleanExpr.countIf();
}

/**
 * @beta
 * Creates an expression that return a pseudo-random value of type double in the
 * range of [0, 1), inclusive of 0 and exclusive of 1.
 *
 * @returns A new `Expr` representing the 'rand' function.
 */
export function rand(): FunctionExpr {
  return new FunctionExpr('rand', []);
}

/**
 * @beta
 *
 * Creates an expression that applies a bitwise AND operation between a field and a constant.
 *
 * ```typescript
 * // Calculate the bitwise AND of 'field1' and 0xFF.
 * bitAnd("field1", 0xFF);
 * ```
 *
 * @param field The left operand field name.
 * @param otherBits A constant representing bits.
 * @return A new {@code Expr} representing the bitwise AND operation.
 */
export function bitAnd(field: string, otherBits: number | Bytes): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise AND operation between a field and an expression.
 *
 * ```typescript
 * // Calculate the bitwise AND of 'field1' and 'field2'.
 * bitAnd("field1", Field.of("field2"));
 * ```
 *
 * @param field The left operand field name.
 * @param bitsExpression An expression that returns bits when evaluated.
 * @return A new {@code Expr} representing the bitwise AND operation.
 */
export function bitAnd(field: string, bitsExpression: Expr): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise AND operation between an expression and a constant.
 *
 * ```typescript
 * // Calculate the bitwise AND of 'field1' and 0xFF.
 * bitAnd(Field.of("field1"), 0xFF);
 * ```
 *
 * @param bitsExpression An expression returning bits.
 * @param otherBits A constant representing bits.
 * @return A new {@code Expr} representing the bitwise AND operation.
 */
export function bitAnd(
  bitsExpression: Expr,
  otherBits: number | Bytes
): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise AND operation between two expressions.
 *
 * ```typescript
 * // Calculate the bitwise AND of 'field1' and 'field2'.
 * bitAnd(Field.of("field1"), Field.of("field2"));
 * ```
 *
 * @param bitsExpression An expression that returns bits when evaluated.
 * @param otherBitsExpression An expression that returns bits when evaluated.
 * @return A new {@code Expr} representing the bitwise AND operation.
 */
export function bitAnd(
  bitsExpression: Expr,
  otherBitsExpression: Expr
): FunctionExpr;
export function bitAnd(
  fieldOrExpression: string | Expr,
  bitsOrExpression: number | Expr | Bytes
): FunctionExpr {
  return fieldOfOrExpr(fieldOrExpression).bitAnd(
    valueToDefaultExpr(bitsOrExpression)
  );
}

/**
 * @beta
 *
 * Creates an expression that applies a bitwise OR operation between a field and a constant.
 *
 * ```typescript
 * // Calculate the bitwise OR of 'field1' and 0xFF.
 * bitOr("field1", 0xFF);
 * ```
 *
 * @param field The left operand field name.
 * @param otherBits A constant representing bits.
 * @return A new {@code Expr} representing the bitwise OR operation.
 */
export function bitOr(field: string, otherBits: number | Bytes): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise OR operation between a field and an expression.
 *
 * ```typescript
 * // Calculate the bitwise OR of 'field1' and 'field2'.
 * bitOr("field1", Field.of("field2"));
 * ```
 *
 * @param field The left operand field name.
 * @param bitsExpression An expression that returns bits when evaluated.
 * @return A new {@code Expr} representing the bitwise OR operation.
 */
export function bitOr(field: string, bitsExpression: Expr): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise OR operation between an expression and a constant.
 *
 * ```typescript
 * // Calculate the bitwise OR of 'field1' and 0xFF.
 * bitOr(Field.of("field1"), 0xFF);
 * ```
 *
 * @param bitsExpression An expression returning bits.
 * @param otherBits A constant representing bits.
 * @return A new {@code Expr} representing the bitwise OR operation.
 */
export function bitOr(
  bitsExpression: Expr,
  otherBits: number | Bytes
): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise OR operation between two expressions.
 *
 * ```typescript
 * // Calculate the bitwise OR of 'field1' and 'field2'.
 * bitOr(Field.of("field1"), Field.of("field2"));
 * ```
 *
 * @param bitsExpression An expression that returns bits when evaluated.
 * @param otherBitsExpression An expression that returns bits when evaluated.
 * @return A new {@code Expr} representing the bitwise OR operation.
 */
export function bitOr(
  bitsExpression: Expr,
  otherBitsExpression: Expr
): FunctionExpr;
export function bitOr(
  fieldOrExpression: string | Expr,
  bitsOrExpression: number | Expr | Bytes
): FunctionExpr {
  return fieldOfOrExpr(fieldOrExpression).bitOr(
    valueToDefaultExpr(bitsOrExpression)
  );
}

/**
 * @beta
 *
 * Creates an expression that applies a bitwise XOR operation between a field and a constant.
 *
 * ```typescript
 * // Calculate the bitwise XOR of 'field1' and 0xFF.
 * bitXor("field1", 0xFF);
 * ```
 *
 * @param field The left operand field name.
 * @param otherBits A constant representing bits.
 * @return A new {@code Expr} representing the bitwise XOR operation.
 */
export function bitXor(field: string, otherBits: number | Bytes): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise XOR operation between a field and an expression.
 *
 * ```typescript
 * // Calculate the bitwise XOR of 'field1' and 'field2'.
 * bitXor("field1", Field.of("field2"));
 * ```
 *
 * @param field The left operand field name.
 * @param bitsExpression An expression that returns bits when evaluated.
 * @return A new {@code Expr} representing the bitwise XOR operation.
 */
export function bitXor(field: string, bitsExpression: Expr): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise XOR operation between an expression and a constant.
 *
 * ```typescript
 * // Calculate the bitwise XOR of 'field1' and 0xFF.
 * bitXor(Field.of("field1"), 0xFF);
 * ```
 *
 * @param bitsExpression An expression returning bits.
 * @param otherBits A constant representing bits.
 * @return A new {@code Expr} representing the bitwise XOR operation.
 */
export function bitXor(
  bitsExpression: Expr,
  otherBits: number | Bytes
): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise XOR operation between two expressions.
 *
 * ```typescript
 * // Calculate the bitwise XOR of 'field1' and 'field2'.
 * bitXor(Field.of("field1"), Field.of("field2"));
 * ```
 *
 * @param bitsExpression An expression that returns bits when evaluated.
 * @param otherBitsExpression An expression that returns bits when evaluated.
 * @return A new {@code Expr} representing the bitwise XOR operation.
 */
export function bitXor(
  bitsExpression: Expr,
  otherBitsExpression: Expr
): FunctionExpr;
export function bitXor(
  fieldOrExpression: string | Expr,
  bitsOrExpression: number | Expr | Bytes
): FunctionExpr {
  return fieldOfOrExpr(fieldOrExpression).bitXor(
    valueToDefaultExpr(bitsOrExpression)
  );
}

/**
 * @beta
 *
 * Creates an expression that applies a bitwise NOT operation to a field.
 *
 * ```typescript
 * // Calculate the bitwise NOT of 'field1'.
 * bitNot("field1");
 * ```
 *
 * @param field The operand field name.
 * @return A new {@code Expr} representing the bitwise NOT operation.
 */
export function bitNot(field: string): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise NOT operation to an expression.
 *
 * ```typescript
 * // Calculate the bitwise NOT of 'field1'.
 * bitNot(Field.of("field1"));
 * ```
 *
 * @param bitsValueExpression An expression that returns bits when evaluated.
 * @return A new {@code Expr} representing the bitwise NOT operation.
 */
export function bitNot(bitsValueExpression: Expr): FunctionExpr;
export function bitNot(bits: string | Expr): FunctionExpr {
  return fieldOfOrExpr(bits).bitNot();
}

/**
 * @beta
 *
 * Creates an expression that applies a bitwise left shift operation between a field and a constant.
 *
 * ```typescript
 * // Calculate the bitwise left shift of 'field1' by 2 bits.
 * bitLeftShift("field1", 2);
 * ```
 *
 * @param field The left operand field name.
 * @param y The right operand constant representing the number of bits to shift.
 * @return A new {@code Expr} representing the bitwise left shift operation.
 */
export function bitLeftShift(field: string, y: number): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise left shift operation between a field and an expression.
 *
 * ```typescript
 * // Calculate the bitwise left shift of 'field1' by 'field2' bits.
 * bitLeftShift("field1", Field.of("field2"));
 * ```
 *
 * @param field The left operand field name.
 * @param numberExpr The right operand expression representing the number of bits to shift.
 * @return A new {@code Expr} representing the bitwise left shift operation.
 */
export function bitLeftShift(field: string, numberExpr: Expr): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise left shift operation between an expression and a constant.
 *
 * ```typescript
 * // Calculate the bitwise left shift of 'field1' by 2 bits.
 * bitLeftShift(Field.of("field1"), 2);
 * ```
 *
 * @param xValue An expression returning bits.
 * @param y The right operand constant representing the number of bits to shift.
 * @return A new {@code Expr} representing the bitwise left shift operation.
 */
export function bitLeftShift(xValue: Expr, y: number): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise left shift operation between two expressions.
 *
 * ```typescript
 * // Calculate the bitwise left shift of 'field1' by 'field2' bits.
 * bitLeftShift(Field.of("field1"), Field.of("field2"));
 * ```
 *
 * @param xValue An expression returning bits.
 * @param right The right operand expression representing the number of bits to shift.
 * @return A new {@code Expr} representing the bitwise left shift operation.
 */
export function bitLeftShift(xValue: Expr, numberExpr: Expr): FunctionExpr;
export function bitLeftShift(
  xValue: string | Expr,
  numberExpr: number | Expr
): FunctionExpr {
  return fieldOfOrExpr(xValue).bitLeftShift(valueToDefaultExpr(numberExpr));
}

/**
 * @beta
 *
 * Creates an expression that applies a bitwise right shift operation between a field and a constant.
 *
 * ```typescript
 * // Calculate the bitwise right shift of 'field1' by 2 bits.
 * bitRightShift("field1", 2);
 * ```
 *
 * @param left The left operand field name.
 * @param right The right operand constant representing the number of bits to shift.
 * @return A new {@code Expr} representing the bitwise right shift operation.
 */
export function bitRightShift(field: string, y: number): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise right shift operation between a field and an expression.
 *
 * ```typescript
 * // Calculate the bitwise right shift of 'field1' by 'field2' bits.
 * bitRightShift("field1", Field.of("field2"));
 * ```
 *
 * @param field The left operand field name.
 * @param numberExpr The right operand expression representing the number of bits to shift.
 * @return A new {@code Expr} representing the bitwise right shift operation.
 */
export function bitRightShift(field: string, numberExpr: Expr): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise right shift operation between an expression and a constant.
 *
 * ```typescript
 * // Calculate the bitwise right shift of 'field1' by 2 bits.
 * bitRightShift(Field.of("field1"), 2);
 * ```
 *
 * @param xValue An expression returning bits.
 * @param y The right operand constant representing the number of bits to shift.
 * @return A new {@code Expr} representing the bitwise right shift operation.
 */
export function bitRightShift(xValue: Expr, y: number): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that applies a bitwise right shift operation between two expressions.
 *
 * ```typescript
 * // Calculate the bitwise right shift of 'field1' by 'field2' bits.
 * bitRightShift(Field.of("field1"), Field.of("field2"));
 * ```
 *
 * @param xValue An expression returning bits.
 * @param right The right operand expression representing the number of bits to shift.
 * @return A new {@code Expr} representing the bitwise right shift operation.
 */
export function bitRightShift(xValue: Expr, numberExpr: Expr): FunctionExpr;
export function bitRightShift(
  xValue: string | Expr,
  numberExpr: number | Expr
): FunctionExpr {
  return fieldOfOrExpr(xValue).bitRightShift(valueToDefaultExpr(numberExpr));
}

/**
 * @beta
 * Creates an expression that indexes into an array from the beginning or end
 * and return the element. If the offset exceeds the array length, an error is
 * returned. A negative offset, starts from the end.
 *
 * ```typescript
 * // Return the value in the tags field array at index 1.
 * arrayOffset('tags', 1);
 * ```
 *
 * @param arrayField The name of the array field.
 * @param offset The index of the element to return.
 * @return A new Expr representing the 'arrayOffset' operation.
 */
export function arrayOffset(arrayField: string, offset: number): FunctionExpr;

/**
 * @beta
 * Creates an expression that indexes into an array from the beginning or end
 * and return the element. If the offset exceeds the array length, an error is
 * returned. A negative offset, starts from the end.
 *
 * ```typescript
 * // Return the value in the tags field array at index specified by field
 * // 'favoriteTag'.
 * arrayOffset('tags', Field.of('favoriteTag'));
 * ```
 *
 * @param arrayField The name of the array field.
 * @param offsetExpr An Expr evaluating to the index of the element to return.
 * @return A new Expr representing the 'arrayOffset' operation.
 */
export function arrayOffset(arrayField: string, offsetExpr: Expr): FunctionExpr;

/**
 * @beta
 * Creates an expression that indexes into an array from the beginning or end
 * and return the element. If the offset exceeds the array length, an error is
 * returned. A negative offset, starts from the end.
 *
 * ```typescript
 * // Return the value in the tags field array at index 1.
 * arrayOffset(Field.of('tags'), 1);
 * ```
 *
 * @param arrayExpression An Expr evaluating to an array.
 * @param offset The index of the element to return.
 * @return A new Expr representing the 'arrayOffset' operation.
 */
export function arrayOffset(
  arrayExpression: Expr,
  offset: number
): FunctionExpr;

/**
 * @beta
 * Creates an expression that indexes into an array from the beginning or end
 * and return the element. If the offset exceeds the array length, an error is
 * returned. A negative offset, starts from the end.
 *
 * ```typescript
 * // Return the value in the tags field array at index specified by field
 * // 'favoriteTag'.
 * arrayOffset(Field.of('tags'), Field.of('favoriteTag'));
 * ```
 *
 * @param arrayExpression An Expr evaluating to an array.
 * @param offsetExpr An Expr evaluating to the index of the element to return.
 * @return A new Expr representing the 'arrayOffset' operation.
 */
export function arrayOffset(
  arrayExpression: Expr,
  offsetExpr: Expr
): FunctionExpr;
export function arrayOffset(
  array: Expr | string,
  offset: Expr | number
): FunctionExpr {
  return fieldOfOrExpr(array).arrayOffset(valueToDefaultExpr(offset));
}

/**
 * @beta
 * Creates an Expr that returns a map of all values in the current expression context.
 *
 * @return A new {@code Expr} representing the 'current_context' function.
 */
export function currentContext(): FunctionExpr {
  return new FunctionExpr('current_context', []);
}

/**
 * @beta
 *
 * Creates an expression that checks if a given expression produces an error.
 *
 * ```typescript
 * // Check if the result of a calculation is an error
 * isError(Field.of("title").arrayContains(1));
 * ```
 *
 * @param value The expression to check.
 * @return A new {@code Expr} representing the 'isError' check.
 */
export function isError(value: Expr): BooleanExpr {
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
 * ifError(Field.of("title").arrayOffset(0), Field.of("title"));
 * ```
 *
 * @param tryExpr The try expression.
 * @param catchExpr The catch expression that will be evaluated and
 * returned if the tryExpr produces an error.
 * @return A new {@code Expr} representing the 'ifError' operation.
 */
export function ifError(tryExpr: Expr, catchExpr: Expr): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that returns the `catch` argument if there is an
 * error, else return the result of the `try` argument evaluation.
 *
 * ```typescript
 * // Returns the first item in the title field arrays, or returns
 * // "Default Title"
 * ifError(Field.of("title").arrayOffset(0), "Default Title");
 * ```
 *
 * @param tryExpr The try expression.
 * @param catchValue The value that will be returned if the tryExpr produces an
 * error.
 * @return A new {@code Expr} representing the 'ifError' operation.
 */
export function ifError(tryExpr: Expr, catchValue: any): FunctionExpr;
export function ifError(tryExpr: Expr, catchValue: any): FunctionExpr {
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
 * isAbsent(Field.of("value"));
 * ```
 *
 * @param value The expression to check.
 * @return A new {@code Expr} representing the 'isAbsent' check.
 */
export function isAbsent(value: Expr): BooleanExpr;

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
export function isAbsent(field: string): BooleanExpr;
export function isAbsent(value: Expr | string): BooleanExpr {
  return fieldOfOrExpr(value).isAbsent();
}

/**
 * @beta
 *
 * Creates an expression that checks if an expression evaluates to 'NaN' (Not a Number).
 *
 * ```typescript
 * // Check if the result of a calculation is NaN
 * isNaN(Field.of("value").divide(0));
 * ```
 *
 * @param value The expression to check.
 * @return A new {@code Expr} representing the 'isNaN' check.
 */
export function isNull(value: Expr): BooleanExpr;

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
export function isNull(value: string): BooleanExpr;
export function isNull(value: Expr | string): BooleanExpr {
  return fieldOfOrExpr(value).isNull();
}

/**
 * @beta
 *
 * Creates an expression that checks if tbe result of an expression is not null.
 *
 * ```typescript
 * // Check if the value of the 'name' field is not null
 * isNotNull(Field.of("name"));
 * ```
 *
 * @param value The expression to check.
 * @return A new {@code Expr} representing the 'isNaN' check.
 */
export function isNotNull(value: Expr): BooleanExpr;

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
export function isNotNull(value: string): BooleanExpr;
export function isNotNull(value: Expr | string): BooleanExpr {
  return fieldOfOrExpr(value).isNotNull();
}

/**
 * @beta
 *
 * Creates an expression that checks if the results of this expression is NOT 'NaN' (Not a Number).
 *
 * ```typescript
 * // Check if the result of a calculation is NOT NaN
 * isNotNaN(Field.of("value").divide(0));
 * ```
 *
 * @param value The expression to check.
 * @return A new {@code Expr} representing the 'isNotNaN' check.
 */
export function isNotNan(value: Expr): BooleanExpr;

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
export function isNotNan(value: string): BooleanExpr;
export function isNotNan(value: Expr | string): BooleanExpr {
  return fieldOfOrExpr(value).isNotNan();
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
export function mapRemove(mapField: string, key: string): FunctionExpr;
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
export function mapRemove(mapExpr: Expr, key: string): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that removes a key from the map at the specified field name.
 *
 * ```
 * // Removes the key 'city' field from the map in the address field of the input document.
 * mapRemove('address', Constant.of('city'));
 * ```
 *
 * @param mapField The name of a field containing a map value.
 * @param keyExpr An expression that produces the name of the key to remove from the input map.
 */
export function mapRemove(mapField: string, keyExpr: Expr): FunctionExpr;
/**
 * @beta
 *
 * Creates an expression that removes a key from the map produced by evaluating an expression.
 *
 * ```
 * // Removes the key 'baz' from the input map.
 * mapRemove(map({foo: 'bar', baz: true}), Constant.of('baz'));
 * ```
 *
 * @param mapExpr An expression return a map value.
 * @param keyExpr An expression that produces the name of the key to remove from the input map.
 */
export function mapRemove(mapExpr: Expr, keyExpr: Expr): FunctionExpr;

export function mapRemove(
  mapExpr: Expr | string,
  stringExpr: Expr | string
): FunctionExpr {
  return fieldOfOrExpr(mapExpr).mapRemove(valueToDefaultExpr(stringExpr));
}

/**
 * @beta
 *
 * Creates an expression that merges multiple map values.
 *
 * ```
 * // Merges the map in the settings field with, a map literal, and a map in
 * // that is conditionally returned by another expression
 * mapMerge('settings', { enabled: true }, cond(Field.of('isAdmin'), { admin: true}, {})
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
  secondMap: Record<string, any> | Expr,
  ...otherMaps: Array<Record<string, any> | Expr>
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that merges multiple map values.
 *
 * ```
 * // Merges the map in the settings field with, a map literal, and a map in
 * // that is conditionally returned by another expression
 * mapMerge(Field.of('settings'), { enabled: true }, cond(Field.of('isAdmin'), { admin: true}, {})
 * ```
 *
 * @param firstMap An expression or literal map map value that will be merged.
 * @param secondMap A required second map to merge. Represented as a literal or
 * an expression that returns a map.
 * @param otherMaps Optional additional maps to merge. Each map is represented
 * as a literal or an expression that returns a map.
 */
export function mapMerge(
  firstMap: Record<string, any> | Expr,
  secondMap: Record<string, any> | Expr,
  ...otherMaps: Array<Record<string, any> | Expr>
): FunctionExpr;

export function mapMerge(
  firstMap: string | Record<string, any> | Expr,
  secondMap: Record<string, any> | Expr,
  ...otherMaps: Array<Record<string, any> | Expr>
): FunctionExpr {
  const secondMapExpr = valueToDefaultExpr(secondMap);
  const otherMapExprs = otherMaps.map(valueToDefaultExpr);
  return fieldOfOrExpr(firstMap).mapMerge(secondMapExpr, ...otherMapExprs);
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
export function documentIdFunction(
  documentPath: string | DocumentReference
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that returns the document ID from a path.
 *
 * ```typescript
 * // Get the document ID from a path.
 * documentId(Field.of("__path__"));
 * ```
 *
 * @return A new {@code Expr} representing the documentId operation.
 */
export function documentIdFunction(documentPathExpr: Expr): FunctionExpr;

export function documentIdFunction(
  documentPath: Expr | string | DocumentReference
): FunctionExpr {
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
export function substr(
  field: string,
  position: number,
  length?: number
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that returns a substring of a string or byte array.
 *
 * @param input An expression returning a string or byte array to compute the substring from.
 * @param position Index of the first character of the substring.
 * @param length Length of the substring.
 */
export function substr(
  input: Expr,
  position: number,
  length?: number
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that returns a substring of a string or byte array.
 *
 * @param field The name of a field containing a string or byte array to compute the substring from.
 * @param position An expression that returns the index of the first character of the substring.
 * @param length An expression that returns the length of the substring.
 */
export function substr(
  field: string,
  position: Expr,
  length?: Expr
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that returns a substring of a string or byte array.
 *
 * @param input An expression returning a string or byte array to compute the substring from.
 * @param position An expression that returns the index of the first character of the substring.
 * @param length An expression that returns the length of the substring.
 */
export function substr(
  input: Expr,
  position: Expr,
  length?: Expr
): FunctionExpr;

export function substr(
  field: Expr | string,
  position: Expr | number,
  length?: Expr | number
): FunctionExpr {
  const fieldExpr = fieldOfOrExpr(field);
  const positionExpr = valueToDefaultExpr(position);
  const lengthExpr =
    length === undefined ? undefined : valueToDefaultExpr(length);
  return fieldExpr.substr(positionExpr, lengthExpr);
}

/**
 * @beta
 *
 * Creates an expression that adds two expressions together.
 *
 * ```typescript
 * // Add the value of the 'quantity' field and the 'reserve' field.
 * add(Field.of("quantity"), Field.of("reserve"));
 * ```
 *
 * @param first The first expression to add.
 * @param second The second expression or literal to add.
 * @param others Optional other expressions or literals to add.
 * @return A new {@code Expr} representing the addition operation.
 */
export function add(
  first: Expr,
  second: Expr | any,
  ...others: Array<Expr | any>
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that adds a field's value to an expression.
 *
 * ```typescript
 * // Add the value of the 'quantity' field and the 'reserve' field.
 * add("quantity", Field.of("reserve"));
 * ```
 *
 * @param fieldName The name of the field containing the value to add.
 * @param second The second expression or literal to add.
 * @param others Optional other expressions or literals to add.
 * @return A new {@code Expr} representing the addition operation.
 */
export function add(
  fieldName: string,
  second: Expr | any,
  ...others: Array<Expr | any>
): FunctionExpr;

export function add(
  first: Expr | string,
  second: Expr | any,
  ...others: Array<Expr | any>
): FunctionExpr {
  return fieldOfOrExpr(first).add(
    valueToDefaultExpr(second),
    ...others.map(value => valueToDefaultExpr(value))
  );
}

/**
 * @beta
 *
 * Creates an expression that subtracts two expressions.
 *
 * ```typescript
 * // Subtract the 'discount' field from the 'price' field
 * subtract(Field.of("price"), Field.of("discount"));
 * ```
 *
 * @param left The expression to subtract from.
 * @param right The expression to subtract.
 * @return A new {@code Expr} representing the subtraction operation.
 */
export function subtract(left: Expr, right: Expr): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that subtracts a constant value from an expression.
 *
 * ```typescript
 * // Subtract the constant value 2 from the 'value' field
 * subtract(Field.of("value"), 2);
 * ```
 *
 * @param left The expression to subtract from.
 * @param right The constant value to subtract.
 * @return A new {@code Expr} representing the subtraction operation.
 */
export function subtract(left: Expr, right: any): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that subtracts an expression from a field's value.
 *
 * ```typescript
 * // Subtract the 'discount' field from the 'price' field
 * subtract("price", Field.of("discount"));
 * ```
 *
 * @param left The field name to subtract from.
 * @param right The expression to subtract.
 * @return A new {@code Expr} representing the subtraction operation.
 */
export function subtract(left: string, right: Expr): FunctionExpr;

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
 * @param left The field name to subtract from.
 * @param right The constant value to subtract.
 * @return A new {@code Expr} representing the subtraction operation.
 */
export function subtract(left: string, right: any): FunctionExpr;
export function subtract(left: Expr | string, right: Expr | any): FunctionExpr {
  const normalizedLeft = typeof left === 'string' ? Field.of(left) : left;
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
 * multiply(Field.of("quantity"), Field.of("price"));
 * ```
 *
 * @param first The first expression to multiply.
 * @param second The second expression or literal to multiply.
 * @param others Optional additional expressions or literals to multiply.
 * @return A new {@code Expr} representing the multiplication operation.
 */
export function multiply(
  first: Expr,
  second: Expr | any,
  ...others: Array<Expr | any>
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that multiplies a field's value by an expression.
 *
 * ```typescript
 * // Multiply the 'quantity' field by the 'price' field
 * multiply("quantity", Field.of("price"));
 * ```
 *
 * @param fieldName The name of the field containing the value to add.
 * @param second The second expression or literal to add.
 * @param others Optional other expressions or literals to add.
 * @return A new {@code Expr} representing the multiplication operation.
 */
export function multiply(
  fieldName: string,
  second: Expr | any,
  ...others: Array<Expr | any>
): FunctionExpr;

export function multiply(
  first: Expr | string,
  second: Expr | any,
  ...others: Array<Expr | any>
): FunctionExpr {
  return fieldOfOrExpr(first).multiply(
    valueToDefaultExpr(second),
    ...others.map(valueToDefaultExpr)
  );
}

/**
 * @beta
 *
 * Creates an expression that divides two expressions.
 *
 * ```typescript
 * // Divide the 'total' field by the 'count' field
 * divide(Field.of("total"), Field.of("count"));
 * ```
 *
 * @param left The expression to be divided.
 * @param right The expression to divide by.
 * @return A new {@code Expr} representing the division operation.
 */
export function divide(left: Expr, right: Expr): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that divides an expression by a constant value.
 *
 * ```typescript
 * // Divide the 'value' field by 10
 * divide(Field.of("value"), 10);
 * ```
 *
 * @param left The expression to be divided.
 * @param right The constant value to divide by.
 * @return A new {@code Expr} representing the division operation.
 */
export function divide(left: Expr, right: any): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that divides a field's value by an expression.
 *
 * ```typescript
 * // Divide the 'total' field by the 'count' field
 * divide("total", Field.of("count"));
 * ```
 *
 * @param left The field name to be divided.
 * @param right The expression to divide by.
 * @return A new {@code Expr} representing the division operation.
 */
export function divide(left: string, right: Expr): FunctionExpr;

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
 * @param left The field name to be divided.
 * @param right The constant value to divide by.
 * @return A new {@code Expr} representing the division operation.
 */
export function divide(left: string, right: any): FunctionExpr;
export function divide(left: Expr | string, right: Expr | any): FunctionExpr {
  const normalizedLeft = typeof left === 'string' ? Field.of(left) : left;
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
 * mod(Field.of("field1"), Field.of("field2"));
 * ```
 *
 * @param left The dividend expression.
 * @param right The divisor expression.
 * @return A new {@code Expr} representing the modulo operation.
 */
export function mod(left: Expr, right: Expr): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that calculates the modulo (remainder) of dividing an expression by a constant.
 *
 * ```typescript
 * // Calculate the remainder of dividing 'field1' by 5.
 * mod(Field.of("field1"), 5);
 * ```
 *
 * @param left The dividend expression.
 * @param right The divisor constant.
 * @return A new {@code Expr} representing the modulo operation.
 */
export function mod(left: Expr, right: any): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that calculates the modulo (remainder) of dividing a field's value by an expression.
 *
 * ```typescript
 * // Calculate the remainder of dividing 'field1' by 'field2'.
 * mod("field1", Field.of("field2"));
 * ```
 *
 * @param left The dividend field name.
 * @param right The divisor expression.
 * @return A new {@code Expr} representing the modulo operation.
 */
export function mod(left: string, right: Expr): FunctionExpr;

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
 * @param left The dividend field name.
 * @param right The divisor constant.
 * @return A new {@code Expr} representing the modulo operation.
 */
export function mod(left: string, right: any): FunctionExpr;
export function mod(left: Expr | string, right: Expr | any): FunctionExpr {
  const normalizedLeft = typeof left === 'string' ? Field.of(left) : left;
  const normalizedRight = valueToDefaultExpr(right);
  return normalizedLeft.mod(normalizedRight);
}

export function map(elements: Record<string, any>): FunctionExpr {
  const result: any[] = [];
  for (const key in elements) {
    if (Object.prototype.hasOwnProperty.call(elements, key)) {
      const value = elements[key];
      result.push(Constant.of(key));
      result.push(valueToDefaultExpr(value));
    }
  }
  return new FunctionExpr('map', result);
}

/**
 * Internal use only
 * Converts a plainObject to a mapValue in the proto representation,
 * rather than a functionValue+map that is the result of the map(...) function.
 * This behaves different than Constant.of(plainObject) because it
 * traverses the input object, converts values in the object to expressions,
 * and calls _readUserData on each of these expressions.
 * @private
 * @internal
 * @param plainObject
 */
export function _mapValue(plainObject: Record<string, any>): MapValue {
  const result: Map<string, Expr> = new Map<string, Expr>();
  for (const key in plainObject) {
    if (Object.prototype.hasOwnProperty.call(plainObject, key)) {
      const value = plainObject[key];
      result.set(key, valueToDefaultExpr(value));
    }
  }
  return new MapValue(result);
}

export function array(elements: any[]): FunctionExpr {
  return new FunctionExpr(
    'array',
    elements.map(element => valueToDefaultExpr(element))
  );
}

/**
 * @beta
 *
 * Creates an expression that checks if two expressions are equal.
 *
 * ```typescript
 * // Check if the 'age' field is equal to an expression
 * eq(Field.of("age"), Field.of("minAge").add(10));
 * ```
 *
 * @param left The first expression to compare.
 * @param right The second expression to compare.
 * @return A new `Expr` representing the equality comparison.
 */
export function eq(left: Expr, right: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is equal to a constant value.
 *
 * ```typescript
 * // Check if the 'age' field is equal to 21
 * eq(Field.of("age"), 21);
 * ```
 *
 * @param left The expression to compare.
 * @param right The constant value to compare to.
 * @return A new `Expr` representing the equality comparison.
 */
export function eq(left: Expr, right: any): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is equal to an expression.
 *
 * ```typescript
 * // Check if the 'age' field is equal to the 'limit' field
 * eq("age", Field.of("limit"));
 * ```
 *
 * @param left The field name to compare.
 * @param right The expression to compare to.
 * @return A new `Expr` representing the equality comparison.
 */
export function eq(left: string, right: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is equal to a constant value.
 *
 * ```typescript
 * // Check if the 'city' field is equal to string constant "London"
 * eq("city", "London");
 * ```
 *
 * @param left The field name to compare.
 * @param right The constant value to compare to.
 * @return A new `Expr` representing the equality comparison.
 */
export function eq(left: string, right: any): BooleanExpr;
export function eq(left: Expr | string, right: any): BooleanExpr {
  const leftExpr = left instanceof Expr ? left : Field.of(left);
  const rightExpr = valueToDefaultExpr(right);
  return leftExpr.eq(rightExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if two expressions are not equal.
 *
 * ```typescript
 * // Check if the 'status' field is not equal to field 'finalState'
 * neq(Field.of("status"), Field.of("finalState"));
 * ```
 *
 * @param left The first expression to compare.
 * @param right The second expression to compare.
 * @return A new `Expr` representing the inequality comparison.
 */
export function neq(left: Expr, right: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is not equal to a constant value.
 *
 * ```typescript
 * // Check if the 'status' field is not equal to "completed"
 * neq(Field.of("status"), "completed");
 * ```
 *
 * @param left The expression to compare.
 * @param right The constant value to compare to.
 * @return A new `Expr` representing the inequality comparison.
 */
export function neq(left: Expr, right: any): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is not equal to an expression.
 *
 * ```typescript
 * // Check if the 'status' field is not equal to the value of 'expectedStatus'
 * neq("status", Field.of("expectedStatus"));
 * ```
 *
 * @param left The field name to compare.
 * @param right The expression to compare to.
 * @return A new `Expr` representing the inequality comparison.
 */
export function neq(left: string, right: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is not equal to a constant value.
 *
 * ```typescript
 * // Check if the 'country' field is not equal to "USA"
 * neq("country", "USA");
 * ```
 *
 * @param left The field name to compare.
 * @param right The constant value to compare to.
 * @return A new `Expr` representing the inequality comparison.
 */
export function neq(left: string, right: any): BooleanExpr;
export function neq(left: Expr | string, right: any): BooleanExpr {
  const leftExpr = left instanceof Expr ? left : Field.of(left);
  const rightExpr = valueToDefaultExpr(right);
  return leftExpr.neq(rightExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if the first expression is less than the second expression.
 *
 * ```typescript
 * // Check if the 'age' field is less than 30
 * lt(Field.of("age"), Field.of("limit"));
 * ```
 *
 * @param left The first expression to compare.
 * @param right The second expression to compare.
 * @return A new `Expr` representing the less than comparison.
 */
export function lt(left: Expr, right: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is less than a constant value.
 *
 * ```typescript
 * // Check if the 'age' field is less than 30
 * lt(Field.of("age"), 30);
 * ```
 *
 * @param left The expression to compare.
 * @param right The constant value to compare to.
 * @return A new `Expr` representing the less than comparison.
 */
export function lt(left: Expr, right: any): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is less than an expression.
 *
 * ```typescript
 * // Check if the 'age' field is less than the 'limit' field
 * lt("age", Field.of("limit"));
 * ```
 *
 * @param left The field name to compare.
 * @param right The expression to compare to.
 * @return A new `Expr` representing the less than comparison.
 */
export function lt(left: string, right: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is less than a constant value.
 *
 * ```typescript
 * // Check if the 'price' field is less than 50
 * lt("price", 50);
 * ```
 *
 * @param left The field name to compare.
 * @param right The constant value to compare to.
 * @return A new `Expr` representing the less than comparison.
 */
export function lt(left: string, right: any): BooleanExpr;
export function lt(left: Expr | string, right: any): BooleanExpr {
  const leftExpr = left instanceof Expr ? left : Field.of(left);
  const rightExpr = valueToDefaultExpr(right);
  return leftExpr.lt(rightExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if the first expression is less than or equal to the second
 * expression.
 *
 * ```typescript
 * // Check if the 'quantity' field is less than or equal to 20
 * lte(Field.of("quantity"), Field.of("limit"));
 * ```
 *
 * @param left The first expression to compare.
 * @param right The second expression to compare.
 * @return A new `Expr` representing the less than or equal to comparison.
 */
export function lte(left: Expr, right: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is less than or equal to a constant value.
 *
 * ```typescript
 * // Check if the 'quantity' field is less than or equal to 20
 * lte(Field.of("quantity"), 20);
 * ```
 *
 * @param left The expression to compare.
 * @param right The constant value to compare to.
 * @return A new `Expr` representing the less than or equal to comparison.
 */
export function lte(left: Expr, right: any): BooleanExpr;

/**
 * Creates an expression that checks if a field's value is less than or equal to an expression.
 *
 * ```typescript
 * // Check if the 'quantity' field is less than or equal to the 'limit' field
 * lte("quantity", Field.of("limit"));
 * ```
 *
 * @param left The field name to compare.
 * @param right The expression to compare to.
 * @return A new `Expr` representing the less than or equal to comparison.
 */
export function lte(left: string, right: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is less than or equal to a constant value.
 *
 * ```typescript
 * // Check if the 'score' field is less than or equal to 70
 * lte("score", 70);
 * ```
 *
 * @param left The field name to compare.
 * @param right The constant value to compare to.
 * @return A new `Expr` representing the less than or equal to comparison.
 */
export function lte(left: string, right: any): BooleanExpr;
export function lte(left: Expr | string, right: any): BooleanExpr {
  const leftExpr = left instanceof Expr ? left : Field.of(left);
  const rightExpr = valueToDefaultExpr(right);
  return leftExpr.lte(rightExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if the first expression is greater than the second
 * expression.
 *
 * ```typescript
 * // Check if the 'age' field is greater than 18
 * gt(Field.of("age"), Constant(9).add(9));
 * ```
 *
 * @param left The first expression to compare.
 * @param right The second expression to compare.
 * @return A new `Expr` representing the greater than comparison.
 */
export function gt(left: Expr, right: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is greater than a constant value.
 *
 * ```typescript
 * // Check if the 'age' field is greater than 18
 * gt(Field.of("age"), 18);
 * ```
 *
 * @param left The expression to compare.
 * @param right The constant value to compare to.
 * @return A new `Expr` representing the greater than comparison.
 */
export function gt(left: Expr, right: any): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is greater than an expression.
 *
 * ```typescript
 * // Check if the value of field 'age' is greater than the value of field 'limit'
 * gt("age", Field.of("limit"));
 * ```
 *
 * @param left The field name to compare.
 * @param right The expression to compare to.
 * @return A new `Expr` representing the greater than comparison.
 */
export function gt(left: string, right: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is greater than a constant value.
 *
 * ```typescript
 * // Check if the 'price' field is greater than 100
 * gt("price", 100);
 * ```
 *
 * @param left The field name to compare.
 * @param right The constant value to compare to.
 * @return A new `Expr` representing the greater than comparison.
 */
export function gt(left: string, right: any): BooleanExpr;
export function gt(left: Expr | string, right: any): BooleanExpr {
  const leftExpr = left instanceof Expr ? left : Field.of(left);
  const rightExpr = valueToDefaultExpr(right);
  return leftExpr.gt(rightExpr);
}

/**
 * @beta
 *
 * Creates an expression that checks if the first expression is greater than or equal to the
 * second expression.
 *
 * ```typescript
 * // Check if the 'quantity' field is greater than or equal to the field "threshold"
 * gte(Field.of("quantity"), Field.of("threshold"));
 * ```
 *
 * @param left The first expression to compare.
 * @param right The second expression to compare.
 * @return A new `Expr` representing the greater than or equal to comparison.
 */
export function gte(left: Expr, right: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is greater than or equal to a constant
 * value.
 *
 * ```typescript
 * // Check if the 'quantity' field is greater than or equal to 10
 * gte(Field.of("quantity"), 10);
 * ```
 *
 * @param left The expression to compare.
 * @param right The constant value to compare to.
 * @return A new `Expr` representing the greater than or equal to comparison.
 */
export function gte(left: Expr, right: any): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is greater than or equal to an expression.
 *
 * ```typescript
 * // Check if the value of field 'age' is greater than or equal to the value of field 'limit'
 * gte("age", Field.of("limit"));
 * ```
 *
 * @param left The field name to compare.
 * @param right The expression to compare to.
 * @return A new `Expr` representing the greater than or equal to comparison.
 */
export function gte(left: string, right: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is greater than or equal to a constant
 * value.
 *
 * ```typescript
 * // Check if the 'score' field is greater than or equal to 80
 * gte("score", 80);
 * ```
 *
 * @param left The field name to compare.
 * @param right The constant value to compare to.
 * @return A new `Expr` representing the greater than or equal to comparison.
 */
export function gte(left: string, right: any): BooleanExpr;
export function gte(left: Expr | string, right: any): BooleanExpr {
  const leftExpr = left instanceof Expr ? left : Field.of(left);
  const rightExpr = valueToDefaultExpr(right);
  return leftExpr.gte(rightExpr);
}

/**
 * @beta
 *
 * Creates an expression that concatenates an array expression with other arrays.
 *
 * ```typescript
 * // Combine the 'items' array with two new item arrays
 * arrayConcat(Field.of("items"), [Field.of("newItems"), Field.of("otherItems")]);
 * ```
 *
 * @param firstArray The first array expression to concatenate to.
 * @param secondArray The second array expression or array literal to concatenate to.
 * @param otherArrays Optional additional array expressions or array literals to concatenate.
 * @return A new {@code Expr} representing the concatenated array.
 */
export function arrayConcat(
  firstArray: Expr,
  secondArray: Expr | any,
  ...otherArrays: Array<Expr | any>
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that concatenates a field's array value with other arrays.
 *
 * ```typescript
 * // Combine the 'items' array with two new item arrays
 * arrayConcat("items", [Field.of("newItems"), Field.of("otherItems")]);
 * ```
 *
 * @param firstArrayField The first array to concatenate to.
 * @param secondArray The second array expression or array literal to concatenate to.
 * @param otherArrays Optional additional array expressions or array literals to concatenate.
 * @return A new {@code Expr} representing the concatenated array.
 */
export function arrayConcat(
  firstArrayField: string,
  secondArray: Expr | any[],
  ...otherArrays: Array<Expr | any>
): FunctionExpr;

export function arrayConcat(
  firstArray: Expr | string,
  secondArray: Expr | any[],
  ...otherArrays: Array<Expr | any[]>
): FunctionExpr {
  const exprValues = otherArrays.map(element => valueToDefaultExpr(element));
  return fieldOfOrExpr(firstArray).arrayConcat(
    fieldOfOrExpr(secondArray),
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
 * arrayContains(Field.of("colors"), Field.of("selectedColor"));
 * ```
 *
 * @param array The array expression to check.
 * @param element The element to search for in the array.
 * @return A new {@code Expr} representing the 'array_contains' comparison.
 */
export function arrayContains(array: Expr, element: Expr): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that checks if an array expression contains a specific element.
 *
 * ```typescript
 * // Check if the 'colors' array contains "red"
 * arrayContains(Field.of("colors"), "red");
 * ```
 *
 * @param array The array expression to check.
 * @param element The element to search for in the array.
 * @return A new {@code Expr} representing the 'array_contains' comparison.
 */
export function arrayContains(array: Expr, element: any): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's array value contains a specific element.
 *
 * ```typescript
 * // Check if the 'colors' array contains the value of field 'selectedColor'
 * arrayContains("colors", Field.of("selectedColor"));
 * ```
 *
 * @param array The field name to check.
 * @param element The element to search for in the array.
 * @return A new {@code Expr} representing the 'array_contains' comparison.
 */
export function arrayContains(array: string, element: Expr): FunctionExpr;

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
 * @param array The field name to check.
 * @param element The element to search for in the array.
 * @return A new {@code Expr} representing the 'array_contains' comparison.
 */
export function arrayContains(array: string, element: any): BooleanExpr;
export function arrayContains(array: Expr | string, element: any): BooleanExpr {
  const arrayExpr = fieldOfOrExpr(array);
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
 * arrayContainsAny(Field.of("categories"), [Field.of("cate1"), "Science"]);
 * ```
 *
 * @param array The array expression to check.
 * @param values The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_any' comparison.
 */
export function arrayContainsAny(array: Expr, values: Expr[]): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if an array expression contains any of the specified
 * elements.
 *
 * ```typescript
 * // Check if the 'categories' array contains either values from field "cate1" or "Science"
 * arrayContainsAny(Field.of("categories"), [Field.of("cate1"), "Science"]);
 * ```
 *
 * @param array The array expression to check.
 * @param values The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_any' comparison.
 */
export function arrayContainsAny(array: Expr, values: any[]): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's array value contains any of the specified
 * elements.
 *
 * ```typescript
 * // Check if the 'groups' array contains either the value from the 'userGroup' field
 * // or the value "guest"
 * arrayContainsAny("categories", [Field.of("cate1"), "Science"]);
 * ```
 *
 * @param array The field name to check.
 * @param values The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_any' comparison.
 */
export function arrayContainsAny(array: string, values: Expr[]): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's array value contains any of the specified
 * elements.
 *
 * ```typescript
 * // Check if the 'groups' array contains either the value from the 'userGroup' field
 * // or the value "guest"
 * arrayContainsAny("categories", [Field.of("cate1"), "Science"]);
 * ```
 *
 * @param array The field name to check.
 * @param values The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_any' comparison.
 */
export function arrayContainsAny(array: string, values: any[]): BooleanExpr;
export function arrayContainsAny(
  array: Expr | string,
  values: any[]
): BooleanExpr {
  return fieldOfOrExpr(array).arrayContainsAny(
    ...values.map(valueToDefaultExpr)
  );
}

/**
 * @beta
 *
 * Creates an expression that checks if an array expression contains all the specified elements.
 *
 * ```typescript
 * // Check if the "tags" array contains all of the values: "SciFi", "Adventure", and the value from field "tag1"
 * arrayContainsAll(Field.of("tags"), [Field.of("tag1"), Constant.of("SciFi"), Constant.of("Adventure")]);
 * ```
 *
 * @param array The array expression to check.
 * @param values The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_all' comparison.
 */
export function arrayContainsAll(array: Expr, values: Expr[]): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if an array expression contains all the specified elements.
 *
 * ```typescript
 * // Check if the "tags" array contains all of the values: "SciFi", "Adventure", and the value from field "tag1"
 * arrayContainsAll(Field.of("tags"), [Field.of("tag1"), "SciFi", "Adventure"]);
 * ```
 *
 * @param array The array expression to check.
 * @param values The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_all' comparison.
 */
export function arrayContainsAll(array: Expr, values: any[]): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's array value contains all the specified values or
 * expressions.
 *
 * ```typescript
 * // Check if the 'tags' array contains both of the values from field 'tag1' and "tag2"
 * arrayContainsAll("tags", [Field.of("tag1"), "SciFi", "Adventure"]);
 * ```
 *
 * @param array The field name to check.
 * @param values The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_all' comparison.
 */
export function arrayContainsAll(array: string, values: Expr[]): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's array value contains all the specified values or
 * expressions.
 *
 * ```typescript
 * // Check if the 'tags' array contains both of the values from field 'tag1' and "tag2"
 * arrayContainsAll("tags", [Field.of("tag1"), "SciFi", "Adventure"]);
 * ```
 *
 * @param array The field name to check.
 * @param values The elements to check for in the array.
 * @return A new {@code Expr} representing the 'array_contains_all' comparison.
 */
export function arrayContainsAll(array: string, values: any[]): BooleanExpr;
export function arrayContainsAll(
  array: Expr | string,
  values: any[]
): BooleanExpr {
  const arrayExpr = fieldOfOrExpr(array);
  const exprValues = values.map(value => valueToDefaultExpr(value));
  return arrayExpr.arrayContainsAll(exprValues);
}

/**
 * @beta
 *
 * Creates an expression that calculates the length of an array expression.
 *
 * ```typescript
 * // Get the number of items in the 'cart' array
 * arrayLength(Field.of("cart"));
 * ```
 *
 * @param array The array expression to calculate the length of.
 * @return A new {@code Expr} representing the length of the array.
 */
export function arrayLength(array: Expr): FunctionExpr {
  return array.arrayLength();
}

/**
 * @beta
 *
 * Creates an expression that checks if an expression is equal to any of the provided values or
 * expressions.
 *
 * ```typescript
 * // Check if the 'category' field is either "Electronics" or value of field 'primaryType'
 * eqAny(Field.of("category"), [Constant.of("Electronics"), Field.of("primaryType")]);
 * ```
 *
 * @param element The expression to compare.
 * @param others The values to check against.
 * @return A new {@code Expr} representing the 'IN' comparison.
 */
export function eqAny(element: Expr, others: Expr[]): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is equal to any of the provided values or
 * expressions.
 *
 * ```typescript
 * // Check if the 'category' field is either "Electronics" or value of field 'primaryType'
 * eqAny(Field.of("category"), ["Electronics", Field.of("primaryType")]);
 * ```
 *
 * @param element The expression to compare.
 * @param others The values to check against.
 * @return A new {@code Expr} representing the 'IN' comparison.
 */
export function eqAny(element: Expr, others: any[]): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is equal to any of the provided values or
 * expressions.
 *
 * ```typescript
 * // Check if the 'category' field is either "Electronics" or value of field 'primaryType'
 * eqAny("category", [Constant.of("Electronics"), Field.of("primaryType")]);
 * ```
 *
 * @param element The field to compare.
 * @param others The values to check against.
 * @return A new {@code Expr} representing the 'IN' comparison.
 */
export function eqAny(element: string, others: Expr[]): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is equal to any of the provided values or
 * expressions.
 *
 * ```typescript
 * // Check if the 'category' field is either "Electronics" or value of field 'primaryType'
 * eqAny("category", ["Electronics", Field.of("primaryType")]);
 * ```
 *
 * @param element The field to compare.
 * @param others The values to check against.
 * @return A new {@code Expr} representing the 'IN' comparison.
 */
export function eqAny(element: string, others: any[]): BooleanExpr;
export function eqAny(element: Expr | string, others: any[]): BooleanExpr {
  const elementExpr = fieldOfOrExpr(element);
  const exprOthers = others.map(other => valueToDefaultExpr(other));
  return elementExpr.eqAny(...exprOthers);
}

/**
 * @beta
 *
 * Creates an expression that checks if an expression is not equal to any of the provided values
 * or expressions.
 *
 * ```typescript
 * // Check if the 'status' field is neither "pending" nor the value of 'rejectedStatus'
 * notEqAny(Field.of("status"), [Constant.of("pending"), Field.of("rejectedStatus")]);
 * ```
 *
 * @param element The expression to compare.
 * @param others The values to check against.
 * @return A new {@code Expr} representing the 'NOT IN' comparison.
 */
export function notEqAny(element: Expr, others: Expr[]): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if an expression is not equal to any of the provided values
 * or expressions.
 *
 * ```typescript
 * // Check if the 'status' field is neither "pending" nor the value of 'rejectedStatus'
 * notEqAny(Field.of("status"), ["pending", Field.of("rejectedStatus")]);
 * ```
 *
 * @param element The expression to compare.
 * @param others The values to check against.
 * @return A new {@code Expr} representing the 'NOT IN' comparison.
 */
export function notEqAny(element: Expr, others: any[]): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is not equal to any of the provided values
 * or expressions.
 *
 * ```typescript
 * // Check if the 'status' field is neither "pending" nor the value of 'rejectedStatus'
 * notEqAny("status", [Constant.of("pending"), Field.of("rejectedStatus")]);
 * ```
 *
 * @param element The field name to compare.
 * @param others The values to check against.
 * @return A new {@code Expr} representing the 'NOT IN' comparison.
 */
export function notEqAny(element: string, others: Expr[]): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value is not equal to any of the provided values
 * or expressions.
 *
 * ```typescript
 * // Check if the 'status' field is neither "pending" nor the value of 'rejectedStatus'
 * notEqAny("status", ["pending", Field.of("rejectedStatus")]);
 * ```
 *
 * @param element The field name to compare.
 * @param others The values to check against.
 * @return A new {@code Expr} representing the 'NOT IN' comparison.
 */
export function notEqAny(element: string, others: any[]): BooleanExpr;
export function notEqAny(element: Expr | string, others: any[]): BooleanExpr {
  const elementExpr = fieldOfOrExpr(element);
  const exprOthers = others.map(other => valueToDefaultExpr(other));
  return elementExpr.notEqAny(...exprOthers);
}

/**
 * @beta
 *
 * Creates an expression that performs a logical 'XOR' (exclusive OR) operation on multiple filter
 * conditions.
 *
 * ```typescript
 * // Check if only one of the conditions is true: 'age' greater than 18, 'city' is "London",
 * // or 'status' is "active".
 * const condition = xor(
 *     gt("age", 18),
 *     eq("city", "London"),
 *     eq("status", "active"));
 * ```
 *
 * @param first The first filter condition.
 * @param second The second filter condition.
 * @param more Additional filter conditions to 'XOR' together.
 * @return A new {@code Expr} representing the logical 'XOR' operation.
 */
export function xor(
  first: BooleanExpr,
  second: BooleanExpr,
  ...more: BooleanExpr[]
): BooleanExpr {
  return new BooleanExpr('xor', [first, second, ...more]);
}

/**
 * @beta
 *
 * Creates a conditional expression that evaluates to a 'then' expression if a condition is true
 * and an 'else' expression if the condition is false.
 *
 * ```typescript
 * // If 'age' is greater than 18, return "Adult"; otherwise, return "Minor".
 * cond(
 *     gt("age", 18), Constant.of("Adult"), Constant.of("Minor"));
 * ```
 *
 * @param condition The condition to evaluate.
 * @param thenExpr The expression to evaluate if the condition is true.
 * @param elseExpr The expression to evaluate if the condition is false.
 * @return A new {@code Expr} representing the conditional expression.
 */
export function cond(
  condition: BooleanExpr,
  thenExpr: Expr,
  elseExpr: Expr
): FunctionExpr {
  return new BooleanExpr('cond', [condition, thenExpr, elseExpr]);
}

/**
 * @beta
 *
 * Creates an expression that negates a filter condition.
 *
 * ```typescript
 * // Find documents where the 'completed' field is NOT true
 * not(eq("completed", true));
 * ```
 *
 * @param filter The filter condition to negate.
 * @return A new {@code Expr} representing the negated filter condition.
 */
export function not(filter: BooleanExpr): BooleanExpr {
  return filter.not();
}

/**
 * @beta
 *
 * Creates an expression that returns the larger value between two expressions, based on Firestore's value type ordering.
 *
 * ```typescript
 * // Returns the larger value between the 'field1' field and the 'field2' field.
 * logicalMaximum(Field.of("field1"), Field.of("field2"));
 * ```
 *
 * @param first The first operand expression.
 * @param second The second expression or literal.
 * @param others Optional additional expressions or literals.
 * @return A new {@code Expr} representing the logical max operation.
 */
export function logicalMaximum(
  first: Expr,
  second: Expr | any,
  ...others: Array<Expr | any>
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that returns the larger value between a field and an expression, based on Firestore's value type ordering.
 *
 * ```typescript
 * // Returns the larger value between the 'field1' field and the 'field2' field.
 * logicalMaximum("field1", Field.of('field2'));
 * ```
 *
 * @param fieldName The first operand field name.
 * @param second The second expression or literal.
 * @param others Optional additional expressions or literals.
 * @return A new {@code Expr} representing the logical max operation.
 */
export function logicalMaximum(
  left: string,
  second: Expr | any,
  ...others: Array<Expr | any>
): FunctionExpr;

export function logicalMaximum(
  first: Expr | string,
  second: Expr | any,
  ...others: Array<Expr | any>
): FunctionExpr {
  return fieldOfOrExpr(first).logicalMaximum(
    valueToDefaultExpr(second),
    ...others.map(value => valueToDefaultExpr(value))
  );
}

/**
 * @beta
 *
 * Creates an expression that returns the smaller value between two expressions, based on Firestore's value type ordering.
 *
 * ```typescript
 * // Returns the smaller value between the 'field1' field and the 'field2' field.
 * logicalMinimum(Field.of("field1"), Field.of("field2"));
 * ```
 *
 * @param first The first operand expression.
 * @param second The second expression or literal.
 * @param others Optional additional expressions or literals.
 * @return A new {@code Expr} representing the logical min operation.
 */
export function logicalMinimum(
  first: Expr,
  second: Expr | any,
  ...others: Array<Expr | any>
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that returns the smaller value between a field and an expression, based on Firestore's value type ordering.
 *
 * ```typescript
 * // Returns the smaller value between the 'field1' field and the 'field2' field.
 * logicalMinimum("field1", Field.of("field2"));
 * ```
 *
 * @param fieldName The first operand field name.
 * @param second The second expression or literal.
 * @param others Optional additional expressions or literals.
 * @return A new {@code Expr} representing the logical min operation.
 */
export function logicalMinimum(
  fieldName: string,
  second: Expr | any,
  ...others: Array<Expr | any>
): FunctionExpr;

export function logicalMinimum(
  first: Expr | string,
  second: Expr | any,
  ...others: Array<Expr | any>
): FunctionExpr {
  return fieldOfOrExpr(first).logicalMinimum(
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
 * exists(Field.of("phoneNumber"));
 * ```
 *
 * @param value An expression evaluates to the name of the field to check.
 * @return A new {@code Expr} representing the 'exists' check.
 */
export function exists(value: Expr): BooleanExpr;

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
 * @param field The field name to check.
 * @return A new {@code Expr} representing the 'exists' check.
 */
export function exists(field: string): BooleanExpr;
export function exists(valueOrField: Expr | string): BooleanExpr {
  return fieldOfOrExpr(valueOrField).exists();
}

/**
 * @beta
 *
 * Creates an expression that checks if an expression evaluates to 'NaN' (Not a Number).
 *
 * ```typescript
 * // Check if the result of a calculation is NaN
 * isNaN(Field.of("value").divide(0));
 * ```
 *
 * @param value The expression to check.
 * @return A new {@code Expr} representing the 'isNaN' check.
 */
export function isNan(value: Expr): BooleanExpr;

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
export function isNan(value: string): BooleanExpr;
export function isNan(value: Expr | string): BooleanExpr {
  return fieldOfOrExpr(value).isNan();
}

/**
 * @beta
 *
 * Creates an expression that reverses a string.
 *
 * ```typescript
 * // Reverse the value of the 'myString' field.
 * reverse(Field.of("myString"));
 * ```
 *
 * @param expr The expression representing the string to reverse.
 * @return A new {@code Expr} representing the reversed string.
 */
export function reverse(expr: Expr): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that reverses a string represented by a field.
 *
 * ```typescript
 * // Reverse the value of the 'myString' field.
 * reverse("myString");
 * ```
 *
 * @param field The name of the field representing the string to reverse.
 * @return A new {@code Expr} representing the reversed string.
 */
export function reverse(field: string): FunctionExpr;
export function reverse(expr: Expr | string): FunctionExpr {
  return fieldOfOrExpr(expr).reverse();
}

/**
 * @beta
 *
 * Creates an expression that replaces the first occurrence of a substring within a string with another substring.
 *
 * ```typescript
 * // Replace the first occurrence of "hello" with "hi" in the 'message' field.
 * replaceFirst(Field.of("message"), "hello", "hi");
 * ```
 *
 * @param value The expression representing the string to perform the replacement on.
 * @param find The substring to search for.
 * @param replace The substring to replace the first occurrence of 'find' with.
 * @return A new {@code Expr} representing the string with the first occurrence replaced.
 */
export function replaceFirst(
  value: Expr,
  find: string,
  replace: string
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that replaces the first occurrence of a substring within a string with another substring,
 * where the substring to find and the replacement substring are specified by expressions.
 *
 * ```typescript
 * // Replace the first occurrence of the value in 'findField' with the value in 'replaceField' in the 'message' field.
 * replaceFirst(Field.of("message"), Field.of("findField"), Field.of("replaceField"));
 * ```
 *
 * @param value The expression representing the string to perform the replacement on.
 * @param find The expression representing the substring to search for.
 * @param replace The expression representing the substring to replace the first occurrence of 'find' with.
 * @return A new {@code Expr} representing the string with the first occurrence replaced.
 */
export function replaceFirst(
  value: Expr,
  find: Expr,
  replace: Expr
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that replaces the first occurrence of a substring within a string represented by a field with another substring.
 *
 * ```typescript
 * // Replace the first occurrence of "hello" with "hi" in the 'message' field.
 * replaceFirst("message", "hello", "hi");
 * ```
 *
 * @param field The name of the field representing the string to perform the replacement on.
 * @param find The substring to search for.
 * @param replace The substring to replace the first occurrence of 'find' with.
 * @return A new {@code Expr} representing the string with the first occurrence replaced.
 */
export function replaceFirst(
  field: string,
  find: string,
  replace: string
): FunctionExpr;
export function replaceFirst(
  value: Expr | string,
  find: Expr | string,
  replace: Expr | string
): FunctionExpr {
  const normalizedValue = fieldOfOrExpr(value);
  const normalizedFind = valueToDefaultExpr(find);
  const normalizedReplace = valueToDefaultExpr(replace);
  return normalizedValue.replaceFirst(normalizedFind, normalizedReplace);
}

/**
 * @beta
 *
 * Creates an expression that replaces all occurrences of a substring within a string with another substring.
 *
 * ```typescript
 * // Replace all occurrences of "hello" with "hi" in the 'message' field.
 * replaceAll(Field.of("message"), "hello", "hi");
 * ```
 *
 * @param value The expression representing the string to perform the replacement on.
 * @param find The substring to search for.
 * @param replace The substring to replace all occurrences of 'find' with.
 * @return A new {@code Expr} representing the string with all occurrences replaced.
 */
export function replaceAll(
  value: Expr,
  find: string,
  replace: string
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that replaces all occurrences of a substring within a string with another substring,
 * where the substring to find and the replacement substring are specified by expressions.
 *
 * ```typescript
 * // Replace all occurrences of the value in 'findField' with the value in 'replaceField' in the 'message' field.
 * replaceAll(Field.of("message"), Field.of("findField"), Field.of("replaceField"));
 * ```
 *
 * @param value The expression representing the string to perform the replacement on.
 * @param find The expression representing the substring to search for.
 * @param replace The expression representing the substring to replace all occurrences of 'find' with.
 * @return A new {@code Expr} representing the string with all occurrences replaced.
 */
export function replaceAll(
  value: Expr,
  find: Expr,
  replace: Expr
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that replaces all occurrences of a substring within a string represented by a field with another substring.
 *
 * ```typescript
 * // Replace all occurrences of "hello" with "hi" in the 'message' field.
 * replaceAll("message", "hello", "hi");
 * ```
 *
 * @param field The name of the field representing the string to perform the replacement on.
 * @param find The substring to search for.
 * @param replace The substring to replace all occurrences of 'find' with.
 * @return A new {@code Expr} representing the string with all occurrences replaced.
 */
export function replaceAll(
  field: string,
  find: string,
  replace: string
): FunctionExpr;
export function replaceAll(
  value: Expr | string,
  find: Expr | string,
  replace: Expr | string
): FunctionExpr {
  const normalizedValue = fieldOfOrExpr(value);
  const normalizedFind = valueToDefaultExpr(find);
  const normalizedReplace = valueToDefaultExpr(replace);
  return normalizedValue.replaceAll(normalizedFind, normalizedReplace);
}

/**
 * @beta
 *
 * Creates an expression that calculates the byte length of a string in UTF-8, or just the length of a Blob.
 *
 * ```typescript
 * // Calculate the length of the 'myString' field in bytes.
 * byteLength(Field.of("myString"));
 * ```
 *
 * @param expr The expression representing the string.
 * @return A new {@code Expr} representing the length of the string in bytes.
 */
export function byteLength(expr: Expr): FunctionExpr;

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
 * @param field The name of the field representing the string.
 * @return A new {@code Expr} representing the length of the string in bytes.
 */
export function byteLength(field: string): FunctionExpr;
export function byteLength(expr: Expr | string): FunctionExpr {
  const normalizedExpr = fieldOfOrExpr(expr);
  return normalizedExpr.byteLength();
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
 * @param field The name of the field containing the string.
 * @return A new {@code Expr} representing the length of the string.
 */
export function charLength(field: string): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that calculates the character length of a string expression in UTF-8.
 *
 * ```typescript
 * // Get the character length of the 'name' field in UTF-8.
 * strLength(Field.of("name"));
 * ```
 *
 * @param expr The expression representing the string to calculate the length of.
 * @return A new {@code Expr} representing the length of the string.
 */
export function charLength(expr: Expr): FunctionExpr;
export function charLength(value: Expr | string): FunctionExpr {
  const valueExpr = fieldOfOrExpr(value);
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
 * @param left The name of the field containing the string.
 * @param pattern The pattern to search for. You can use "%" as a wildcard character.
 * @return A new {@code Expr} representing the 'like' comparison.
 */
export function like(left: string, pattern: string): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that performs a case-sensitive wildcard string comparison against a
 * field.
 *
 * ```typescript
 * // Check if the 'title' field contains the string "guide"
 * like("title", Field.of("pattern"));
 * ```
 *
 * @param left The name of the field containing the string.
 * @param pattern The pattern to search for. You can use "%" as a wildcard character.
 * @return A new {@code Expr} representing the 'like' comparison.
 */
export function like(left: string, pattern: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that performs a case-sensitive wildcard string comparison.
 *
 * ```typescript
 * // Check if the 'title' field contains the string "guide"
 * like(Field.of("title"), "%guide%");
 * ```
 *
 * @param left The expression representing the string to perform the comparison on.
 * @param pattern The pattern to search for. You can use "%" as a wildcard character.
 * @return A new {@code Expr} representing the 'like' comparison.
 */
export function like(left: Expr, pattern: string): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that performs a case-sensitive wildcard string comparison.
 *
 * ```typescript
 * // Check if the 'title' field contains the string "guide"
 * like(Field.of("title"), Field.of("pattern"));
 * ```
 *
 * @param left The expression representing the string to perform the comparison on.
 * @param pattern The pattern to search for. You can use "%" as a wildcard character.
 * @return A new {@code Expr} representing the 'like' comparison.
 */
export function like(left: Expr, pattern: Expr): BooleanExpr;
export function like(
  left: Expr | string,
  pattern: Expr | string
): FunctionExpr {
  const leftExpr = fieldOfOrExpr(left);
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
 * @param left The name of the field containing the string.
 * @param pattern The regular expression to use for the search.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function regexContains(left: string, pattern: string): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a string field contains a specified regular expression as
 * a substring.
 *
 * ```typescript
 * // Check if the 'description' field contains "example" (case-insensitive)
 * regexContains("description", Field.of("pattern"));
 * ```
 *
 * @param left The name of the field containing the string.
 * @param pattern The regular expression to use for the search.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function regexContains(left: string, pattern: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression contains a specified regular
 * expression as a substring.
 *
 * ```typescript
 * // Check if the 'description' field contains "example" (case-insensitive)
 * regexContains(Field.of("description"), "(?i)example");
 * ```
 *
 * @param left The expression representing the string to perform the comparison on.
 * @param pattern The regular expression to use for the search.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function regexContains(left: Expr, pattern: string): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression contains a specified regular
 * expression as a substring.
 *
 * ```typescript
 * // Check if the 'description' field contains "example" (case-insensitive)
 * regexContains(Field.of("description"), Field.of("pattern"));
 * ```
 *
 * @param left The expression representing the string to perform the comparison on.
 * @param pattern The regular expression to use for the search.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function regexContains(left: Expr, pattern: Expr): BooleanExpr;
export function regexContains(
  left: Expr | string,
  pattern: Expr | string
): BooleanExpr {
  const leftExpr = fieldOfOrExpr(left);
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
 * @param left The name of the field containing the string.
 * @param pattern The regular expression to use for the match.
 * @return A new {@code Expr} representing the regular expression match.
 */
export function regexMatch(left: string, pattern: string): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a string field matches a specified regular expression.
 *
 * ```typescript
 * // Check if the 'email' field matches a valid email pattern
 * regexMatch("email", Field.of("pattern"));
 * ```
 *
 * @param left The name of the field containing the string.
 * @param pattern The regular expression to use for the match.
 * @return A new {@code Expr} representing the regular expression match.
 */
export function regexMatch(left: string, pattern: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression matches a specified regular
 * expression.
 *
 * ```typescript
 * // Check if the 'email' field matches a valid email pattern
 * regexMatch(Field.of("email"), "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
 * ```
 *
 * @param left The expression representing the string to match against.
 * @param pattern The regular expression to use for the match.
 * @return A new {@code Expr} representing the regular expression match.
 */
export function regexMatch(left: Expr, pattern: string): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression matches a specified regular
 * expression.
 *
 * ```typescript
 * // Check if the 'email' field matches a valid email pattern
 * regexMatch(Field.of("email"), Field.of("pattern"));
 * ```
 *
 * @param left The expression representing the string to match against.
 * @param pattern The regular expression to use for the match.
 * @return A new {@code Expr} representing the regular expression match.
 */
export function regexMatch(left: Expr, pattern: Expr): BooleanExpr;
export function regexMatch(
  left: Expr | string,
  pattern: Expr | string
): BooleanExpr {
  const leftExpr = fieldOfOrExpr(left);
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
 * strContains("description", "example");
 * ```
 *
 * @param left The name of the field containing the string.
 * @param substring The substring to search for.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function strContains(left: string, substring: string): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a string field contains a substring specified by an expression.
 *
 * ```typescript
 * // Check if the 'description' field contains the value of the 'keyword' field.
 * strContains("description", Field.of("keyword"));
 * ```
 *
 * @param left The name of the field containing the string.
 * @param substring The expression representing the substring to search for.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function strContains(left: string, substring: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression contains a specified substring.
 *
 * ```typescript
 * // Check if the 'description' field contains "example".
 * strContains(Field.of("description"), "example");
 * ```
 *
 * @param left The expression representing the string to perform the comparison on.
 * @param substring The substring to search for.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function strContains(left: Expr, substring: string): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression contains a substring specified by another expression.
 *
 * ```typescript
 * // Check if the 'description' field contains the value of the 'keyword' field.
 * strContains(Field.of("description"), Field.of("keyword"));
 * ```
 *
 * @param left The expression representing the string to perform the comparison on.
 * @param substring The expression representing the substring to search for.
 * @return A new {@code Expr} representing the 'contains' comparison.
 */
export function strContains(left: Expr, substring: Expr): BooleanExpr;
export function strContains(
  left: Expr | string,
  substring: Expr | string
): BooleanExpr {
  const leftExpr = fieldOfOrExpr(left);
  const substringExpr = valueToDefaultExpr(substring);
  return leftExpr.strContains(substringExpr);
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
 * @param expr The field name to check.
 * @param prefix The prefix to check for.
 * @return A new {@code Expr} representing the 'starts with' comparison.
 */
export function startsWith(expr: string, prefix: string): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value starts with a given prefix.
 *
 * ```typescript
 * // Check if the 'fullName' field starts with the value of the 'firstName' field
 * startsWith("fullName", Field.of("firstName"));
 * ```
 *
 * @param expr The field name to check.
 * @param prefix The expression representing the prefix.
 * @return A new {@code Expr} representing the 'starts with' comparison.
 */
export function startsWith(expr: string, prefix: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression starts with a given prefix.
 *
 * ```typescript
 * // Check if the result of concatenating 'firstName' and 'lastName' fields starts with "Mr."
 * startsWith(Field.of("fullName"), "Mr.");
 * ```
 *
 * @param expr The expression to check.
 * @param prefix The prefix to check for.
 * @return A new {@code Expr} representing the 'starts with' comparison.
 */
export function startsWith(expr: Expr, prefix: string): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression starts with a given prefix.
 *
 * ```typescript
 * // Check if the result of concatenating 'firstName' and 'lastName' fields starts with "Mr."
 * startsWith(Field.of("fullName"), Field.of("prefix"));
 * ```
 *
 * @param expr The expression to check.
 * @param prefix The prefix to check for.
 * @return A new {@code Expr} representing the 'starts with' comparison.
 */
export function startsWith(expr: Expr, prefix: Expr): BooleanExpr;
export function startsWith(
  expr: Expr | string,
  prefix: Expr | string
): BooleanExpr {
  return fieldOfOrExpr(expr).startsWith(valueToDefaultExpr(prefix));
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
 * @param expr The field name to check.
 * @param suffix The postfix to check for.
 * @return A new {@code Expr} representing the 'ends with' comparison.
 */
export function endsWith(expr: string, suffix: string): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a field's value ends with a given postfix.
 *
 * ```typescript
 * // Check if the 'url' field ends with the value of the 'extension' field
 * endsWith("url", Field.of("extension"));
 * ```
 *
 * @param expr The field name to check.
 * @param suffix The expression representing the postfix.
 * @return A new {@code Expr} representing the 'ends with' comparison.
 */
export function endsWith(expr: string, suffix: Expr): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression ends with a given postfix.
 *
 * ```typescript
 * // Check if the result of concatenating 'firstName' and 'lastName' fields ends with "Jr."
 * endsWith(Field.of("fullName"), "Jr.");
 * ```
 *
 * @param expr The expression to check.
 * @param suffix The postfix to check for.
 * @return A new {@code Expr} representing the 'ends with' comparison.
 */
export function endsWith(expr: Expr, suffix: string): BooleanExpr;

/**
 * @beta
 *
 * Creates an expression that checks if a string expression ends with a given postfix.
 *
 * ```typescript
 * // Check if the result of concatenating 'firstName' and 'lastName' fields ends with "Jr."
 * endsWith(Field.of("fullName"), Constant.of("Jr."));
 * ```
 *
 * @param expr The expression to check.
 * @param suffix The postfix to check for.
 * @return A new {@code Expr} representing the 'ends with' comparison.
 */
export function endsWith(expr: Expr, suffix: Expr): BooleanExpr;
export function endsWith(
  expr: Expr | string,
  suffix: Expr | string
): BooleanExpr {
  return fieldOfOrExpr(expr).endsWith(valueToDefaultExpr(suffix));
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
 * @param expr The name of the field containing the string.
 * @return A new {@code Expr} representing the lowercase string.
 */
export function toLower(expr: string): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that converts a string expression to lowercase.
 *
 * ```typescript
 * // Convert the 'name' field to lowercase
 * toLower(Field.of("name"));
 * ```
 *
 * @param expr The expression representing the string to convert to lowercase.
 * @return A new {@code Expr} representing the lowercase string.
 */
export function toLower(expr: Expr): FunctionExpr;
export function toLower(expr: Expr | string): FunctionExpr {
  return fieldOfOrExpr(expr).toLower();
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
 * @param expr The name of the field containing the string.
 * @return A new {@code Expr} representing the uppercase string.
 */
export function toUpper(expr: string): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that converts a string expression to uppercase.
 *
 * ```typescript
 * // Convert the 'title' field to uppercase
 * toUppercase(Field.of("title"));
 * ```
 *
 * @param expr The expression representing the string to convert to uppercase.
 * @return A new {@code Expr} representing the uppercase string.
 */
export function toUpper(expr: Expr): FunctionExpr;
export function toUpper(expr: Expr | string): FunctionExpr {
  return fieldOfOrExpr(expr).toUpper();
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
 * @param expr The name of the field containing the string.
 * @return A new {@code Expr} representing the trimmed string.
 */
export function trim(expr: string): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that removes leading and trailing whitespace from a string expression.
 *
 * ```typescript
 * // Trim whitespace from the 'userInput' field
 * trim(Field.of("userInput"));
 * ```
 *
 * @param expr The expression representing the string to trim.
 * @return A new {@code Expr} representing the trimmed string.
 */
export function trim(expr: Expr): FunctionExpr;
export function trim(expr: Expr | string): FunctionExpr {
  return fieldOfOrExpr(expr).trim();
}

/**
 * @beta
 *
 * Creates an expression that concatenates string functions, fields or constants together.
 *
 * ```typescript
 * // Combine the 'firstName', " ", and 'lastName' fields into a single string
 * strConcat("firstName", " ", Field.of("lastName"));
 * ```
 *
 * @param fieldName The field name containing the initial string value.
 * @param secondString An expression or string literal to concatenate.
 * @param otherStrings Optional additional expressions or literals (typically strings) to concatenate.
 * @return A new {@code Expr} representing the concatenated string.
 */
export function strConcat(
  fieldName: string,
  secondString: Expr | string,
  ...otherStrings: Array<Expr | string>
): FunctionExpr;

/**
 * @beta
 * Creates an expression that concatenates string expressions together.
 *
 * ```typescript
 * // Combine the 'firstName', " ", and 'lastName' fields into a single string
 * strConcat(Field.of("firstName"), " ", Field.of("lastName"));
 * ```
 *
 * @param firstString The initial string expression to concatenate to.
 * @param secondString An expression or string literal to concatenate.
 * @param otherStrings Optional additional expressions or literals (typically strings) to concatenate.
 * @return A new {@code Expr} representing the concatenated string.
 */
export function strConcat(
  firstString: Expr,
  secondString: Expr | string,
  ...otherStrings: Array<Expr | string>
): FunctionExpr;
export function strConcat(
  first: string | Expr,
  second: string | Expr,
  ...elements: Array<string | Expr>
): FunctionExpr {
  return valueToDefaultExpr(first).strConcat(
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
 * @param mapField The field name of the map field.
 * @param subField The key to access in the map.
 * @return A new {@code Expr} representing the value associated with the given key in the map.
 */
export function mapGet(mapField: string, subField: string): FunctionExpr;

/**
 * @beta
 *
 * Accesses a value from a map (object) expression using the provided key.
 *
 * ```typescript
 * // Get the 'city' value from the 'address' map field
 * mapGet(Field.of("address"), "city");
 * ```
 *
 * @param mapExpr The expression representing the map.
 * @param subField The key to access in the map.
 * @return A new {@code Expr} representing the value associated with the given key in the map.
 */
export function mapGet(mapExpr: Expr, subField: string): FunctionExpr;
export function mapGet(
  fieldOrExpr: string | Expr,
  subField: string
): FunctionExpr {
  return fieldOfOrExpr(fieldOrExpr).mapGet(subField);
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
  return new AggregateFunction('count', []);
}

/**
 * @beta
 *
 * Creates an aggregation that counts the number of stage inputs with valid evaluations of the
 * provided expression.
 *
 * ```typescript
 * // Count the number of items where the price is greater than 10
 * count(Field.of("price").gt(10)).as("expensiveItemCount");
 * ```
 *
 * @param value The expression to count.
 * @return A new {@code AggregateFunction} representing the 'count' aggregation.
 */
export function countFunction(value: Expr): AggregateFunction;

/**
 * Creates an aggregation that counts the number of stage inputs with valid evaluations of the
 * provided field.
 *
 * ```typescript
 * // Count the total number of products
 * count("productId").as("totalProducts");
 * ```
 *
 * @param value The name of the field to count.
 * @return A new {@code AggregateFunction} representing the 'count' aggregation.
 */
export function countFunction(value: string): AggregateFunction;
export function countFunction(value: Expr | string): AggregateFunction {
  return fieldOfOrExpr(value).count();
}

/**
 * @beta
 *
 * Creates an aggregation that calculates the sum of values from an expression across multiple
 * stage inputs.
 *
 * ```typescript
 * // Calculate the total revenue from a set of orders
 * sum(Field.of("orderAmount")).as("totalRevenue");
 * ```
 *
 * @param value The expression to sum up.
 * @return A new {@code AggregateFunction} representing the 'sum' aggregation.
 */
export function sumFunction(value: Expr): AggregateFunction;

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
 * @param value The name of the field containing numeric values to sum up.
 * @return A new {@code AggregateFunction} representing the 'sum' aggregation.
 */
export function sumFunction(value: string): AggregateFunction;
export function sumFunction(value: Expr | string): AggregateFunction {
  return fieldOfOrExpr(value).sum();
}

/**
 * @beta
 *
 * Creates an aggregation that calculates the average (mean) of values from an expression across
 * multiple stage inputs.
 *
 * ```typescript
 * // Calculate the average age of users
 * avg(Field.of("age")).as("averageAge");
 * ```
 *
 * @param value The expression representing the values to average.
 * @return A new {@code AggregateFunction} representing the 'avg' aggregation.
 */
export function avgFunction(value: Expr): AggregateFunction;

/**
 * @beta
 *
 * Creates an aggregation that calculates the average (mean) of a field's values across multiple
 * stage inputs.
 *
 * ```typescript
 * // Calculate the average age of users
 * avg("age").as("averageAge");
 * ```
 *
 * @param value The name of the field containing numeric values to average.
 * @return A new {@code AggregateFunction} representing the 'avg' aggregation.
 */
export function avgFunction(value: string): AggregateFunction;
export function avgFunction(value: Expr | string): AggregateFunction {
  return fieldOfOrExpr(value).avg();
}

/**
 * @beta
 *
 * Creates an aggregation that finds the minimum value of an expression across multiple stage
 * inputs.
 *
 * ```typescript
 * // Find the lowest price of all products
 * minimum(Field.of("price")).as("lowestPrice");
 * ```
 *
 * @param value The expression to find the minimum value of.
 * @return A new {@code AggregateFunction} representing the 'min' aggregation.
 */
export function minimum(value: Expr): AggregateFunction;

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
 * @param value The name of the field to find the minimum value of.
 * @return A new {@code AggregateFunction} representing the 'min' aggregation.
 */
export function minimum(value: string): AggregateFunction;
export function minimum(value: Expr | string): AggregateFunction {
  return fieldOfOrExpr(value).minimum();
}

/**
 * @beta
 *
 * Creates an aggregation that finds the maximum value of an expression across multiple stage
 * inputs.
 *
 * ```typescript
 * // Find the highest score in a leaderboard
 * maximum(Field.of("score")).as("highestScore");
 * ```
 *
 * @param value The expression to find the maximum value of.
 * @return A new {@code AggregateFunction} representing the 'max' aggregation.
 */
export function maximum(value: Expr): AggregateFunction;

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
 * @param value The name of the field to find the maximum value of.
 * @return A new {@code AggregateFunction} representing the 'max' aggregation.
 */
export function maximum(value: string): AggregateFunction;
export function maximum(value: Expr | string): AggregateFunction {
  return fieldOfOrExpr(value).maximum();
}

/**
 * @beta
 *
 * Calculates the Cosine distance between a field's vector value and a double array.
 *
 * ```typescript
 * // Calculate the Cosine distance between the 'location' field and a target location
 * cosineDistance("location", [37.7749, -122.4194]);
 * ```
 *
 * @param expr The name of the field containing the first vector.
 * @param other The other vector (as an array of doubles) to compare against.
 * @return A new {@code Expr} representing the Cosine distance between the two vectors.
 */
export function cosineDistance(expr: string, other: number[]): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Cosine distance between a field's vector value and a VectorValue.
 *
 * ```typescript
 * // Calculate the Cosine distance between the 'location' field and a target location
 * cosineDistance("location", new VectorValue([37.7749, -122.4194]));
 * ```
 *
 * @param expr The name of the field containing the first vector.
 * @param other The other vector (as a VectorValue) to compare against.
 * @return A new {@code Expr} representing the Cosine distance between the two vectors.
 */
export function cosineDistance(expr: string, other: VectorValue): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Cosine distance between a field's vector value and a vector expression.
 *
 * ```typescript
 * // Calculate the cosine distance between the 'userVector' field and the 'itemVector' field
 * cosineDistance("userVector", Field.of("itemVector"));
 * ```
 *
 * @param expr The name of the field containing the first vector.
 * @param other The other vector (represented as an Expr) to compare against.
 * @return A new {@code Expr} representing the cosine distance between the two vectors.
 */
export function cosineDistance(expr: string, other: Expr): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Cosine distance between a vector expression and a double array.
 *
 * ```typescript
 * // Calculate the cosine distance between the 'location' field and a target location
 * cosineDistance(Field.of("location"), [37.7749, -122.4194]);
 * ```
 *
 * @param expr The first vector (represented as an Expr) to compare against.
 * @param other The other vector (as an array of doubles) to compare against.
 * @return A new {@code Expr} representing the cosine distance between the two vectors.
 */
export function cosineDistance(expr: Expr, other: number[]): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Cosine distance between a vector expression and a VectorValue.
 *
 * ```typescript
 * // Calculate the cosine distance between the 'location' field and a target location
 * cosineDistance(Field.of("location"), new VectorValue([37.7749, -122.4194]));
 * ```
 *
 * @param expr The first vector (represented as an Expr) to compare against.
 * @param other The other vector (as a VectorValue) to compare against.
 * @return A new {@code Expr} representing the cosine distance between the two vectors.
 */
export function cosineDistance(expr: Expr, other: VectorValue): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Cosine distance between two vector expressions.
 *
 * ```typescript
 * // Calculate the cosine distance between the 'userVector' field and the 'itemVector' field
 * cosineDistance(Field.of("userVector"), Field.of("itemVector"));
 * ```
 *
 * @param expr The first vector (represented as an Expr) to compare against.
 * @param other The other vector (represented as an Expr) to compare against.
 * @return A new {@code Expr} representing the cosine distance between the two vectors.
 */
export function cosineDistance(expr: Expr, other: Expr): FunctionExpr;
export function cosineDistance(
  expr: Expr | string,
  other: Expr | number[] | VectorValue
): FunctionExpr {
  const expr1 = fieldOfOrExpr(expr);
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
 * @param expr The name of the field containing the first vector.
 * @param other The other vector (as an array of doubles) to calculate with.
 * @return A new {@code Expr} representing the dot product between the two vectors.
 */
export function dotProduct(expr: string, other: number[]): FunctionExpr;

/**
 * @beta
 *
 * Calculates the dot product between a field's vector value and a VectorValue.
 *
 * ```typescript
 * // Calculate the dot product distance between a feature vector and a target vector
 * dotProduct("features", new VectorValue([0.5, 0.8, 0.2]));
 * ```
 *
 * @param expr The name of the field containing the first vector.
 * @param other The other vector (as a VectorValue) to calculate with.
 * @return A new {@code Expr} representing the dot product between the two vectors.
 */
export function dotProduct(expr: string, other: VectorValue): FunctionExpr;

/**
 * @beta
 *
 * Calculates the dot product between a field's vector value and a vector expression.
 *
 * ```typescript
 * // Calculate the dot product distance between two document vectors: 'docVector1' and 'docVector2'
 * dotProduct("docVector1", Field.of("docVector2"));
 * ```
 *
 * @param expr The name of the field containing the first vector.
 * @param other The other vector (represented as an Expr) to calculate with.
 * @return A new {@code Expr} representing the dot product between the two vectors.
 */
export function dotProduct(expr: string, other: Expr): FunctionExpr;

/**
 * @beta
 *
 * Calculates the dot product between a vector expression and a double array.
 *
 * ```typescript
 * // Calculate the dot product between a feature vector and a target vector
 * dotProduct(Field.of("features"), [0.5, 0.8, 0.2]);
 * ```
 *
 * @param expr The first vector (represented as an Expr) to calculate with.
 * @param other The other vector (as an array of doubles) to calculate with.
 * @return A new {@code Expr} representing the dot product between the two vectors.
 */
export function dotProduct(expr: Expr, other: number[]): FunctionExpr;

/**
 * @beta
 *
 * Calculates the dot product between a vector expression and a VectorValue.
 *
 * ```typescript
 * // Calculate the dot product between a feature vector and a target vector
 * dotProduct(Field.of("features"), new VectorValue([0.5, 0.8, 0.2]));
 * ```
 *
 * @param expr The first vector (represented as an Expr) to calculate with.
 * @param other The other vector (as a VectorValue) to calculate with.
 * @return A new {@code Expr} representing the dot product between the two vectors.
 */
export function dotProduct(expr: Expr, other: VectorValue): FunctionExpr;

/**
 * @beta
 *
 * Calculates the dot product between two vector expressions.
 *
 * ```typescript
 * // Calculate the dot product between two document vectors: 'docVector1' and 'docVector2'
 * dotProduct(Field.of("docVector1"), Field.of("docVector2"));
 * ```
 *
 * @param expr The first vector (represented as an Expr) to calculate with.
 * @param other The other vector (represented as an Expr) to calculate with.
 * @return A new {@code Expr} representing the dot product between the two vectors.
 */
export function dotProduct(expr: Expr, other: Expr): FunctionExpr;
export function dotProduct(
  expr: Expr | string,
  other: Expr | number[] | VectorValue
): FunctionExpr {
  const expr1 = fieldOfOrExpr(expr);
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
 * @param expr The name of the field containing the first vector.
 * @param other The other vector (as an array of doubles) to compare against.
 * @return A new {@code Expr} representing the Euclidean distance between the two vectors.
 */
export function euclideanDistance(expr: string, other: number[]): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Euclidean distance between a field's vector value and a VectorValue.
 *
 * ```typescript
 * // Calculate the Euclidean distance between the 'location' field and a target location
 * euclideanDistance("location", new VectorValue([37.7749, -122.4194]));
 * ```
 *
 * @param expr The name of the field containing the first vector.
 * @param other The other vector (as a VectorValue) to compare against.
 * @return A new {@code Expr} representing the Euclidean distance between the two vectors.
 */
export function euclideanDistance(
  expr: string,
  other: VectorValue
): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Euclidean distance between a field's vector value and a vector expression.
 *
 * ```typescript
 * // Calculate the Euclidean distance between two vector fields: 'pointA' and 'pointB'
 * euclideanDistance("pointA", Field.of("pointB"));
 * ```
 *
 * @param expr The name of the field containing the first vector.
 * @param other The other vector (represented as an Expr) to compare against.
 * @return A new {@code Expr} representing the Euclidean distance between the two vectors.
 */
export function euclideanDistance(expr: string, other: Expr): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Euclidean distance between a vector expression and a double array.
 *
 * ```typescript
 * // Calculate the Euclidean distance between the 'location' field and a target location
 *
 * euclideanDistance(Field.of("location"), [37.7749, -122.4194]);
 * ```
 *
 * @param expr The first vector (represented as an Expr) to compare against.
 * @param other The other vector (as an array of doubles) to compare against.
 * @return A new {@code Expr} representing the Euclidean distance between the two vectors.
 */
export function euclideanDistance(expr: Expr, other: number[]): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Euclidean distance between a vector expression and a VectorValue.
 *
 * ```typescript
 * // Calculate the Euclidean distance between the 'location' field and a target location
 * euclideanDistance(Field.of("location"), new VectorValue([37.7749, -122.4194]));
 * ```
 *
 * @param expr The first vector (represented as an Expr) to compare against.
 * @param other The other vector (as a VectorValue) to compare against.
 * @return A new {@code Expr} representing the Euclidean distance between the two vectors.
 */
export function euclideanDistance(expr: Expr, other: VectorValue): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Euclidean distance between two vector expressions.
 *
 * ```typescript
 * // Calculate the Euclidean distance between two vector fields: 'pointA' and 'pointB'
 * euclideanDistance(Field.of("pointA"), Field.of("pointB"));
 * ```
 *
 * @param expr The first vector (represented as an Expr) to compare against.
 * @param other The other vector (represented as an Expr) to compare against.
 * @return A new {@code Expr} representing the Euclidean distance between the two vectors.
 */
export function euclideanDistance(expr: Expr, other: Expr): FunctionExpr;
export function euclideanDistance(
  expr: Expr | string,
  other: Expr | number[] | VectorValue
): FunctionExpr {
  const expr1 = fieldOfOrExpr(expr);
  const expr2 = vectorToExpr(other);
  return expr1.euclideanDistance(expr2);
}

/**
 * @beta
 *
 * Calculates the Manhattan distance between a field's vector value and a double array.
 *
 * ```typescript
 * // Calculate the Manhattan distance between the 'location' field and a target location
 * manhattanDistance("location", [37.7749, -122.4194]);
 * ```
 *
 * @param field The name of the field containing the first vector.
 * @param other The other vector (as an array of doubles) to compare against.
 * @return A new {@code Expr} representing the Manhattan distance between the two vectors.
 */
export function manhattanDistance(field: string, other: number[]): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Manhattan distance between a field's vector value and a VectorValue.
 *
 * ```typescript
 * // Calculate the Manhattan distance between the 'location' field and a target location
 * manhattanDistance("location", new VectorValue([37.7749, -122.4194]));
 * ```
 *
 * @param expr The name of the field containing the first vector.
 * @param other The other vector (as a VectorValue) to compare against.
 * @return A new {@code Expr} representing the Manhattan distance between the two vectors.
 */
export function manhattanDistance(
  expr: string,
  other: VectorValue
): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Manhattan distance between a field's vector value and a vector expression.
 *
 * ```typescript
 * // Calculate the Manhattan distance between two vector fields: 'pointA' and 'pointB'
 * manhattanDistance("pointA", Field.of("pointB"));
 * ```
 *
 * @param expr The name of the field containing the first vector.
 * @param other The other vector (represented as an Expr) to compare against.
 * @return A new {@code Expr} representing the Manhattan distance between the two vectors.
 */
export function manhattanDistance(expr: string, other: Expr): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Manhattan distance between a vector expression and a double array.
 *
 * ```typescript
 * // Calculate the Manhattan distance between the 'location' field and a target location
 *
 * manhattanDistance(Field.of("location"), [37.7749, -122.4194]);
 * ```
 *
 * @param expr The first vector (represented as an Expr) to compare against.
 * @param other The other vector (as an array of doubles) to compare against.
 * @return A new {@code Expr} representing the Manhattan distance between the two vectors.
 */
export function manhattanDistance(expr: Expr, other: number[]): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Manhattan distance between a vector expression and a VectorValue.
 *
 * ```typescript
 * // Calculate the Manhattan distance between the 'location' field and a target location
 * manhattanDistance(Field.of("location"), new VectorValue([37.7749, -122.4194]));
 * ```
 *
 * @param expr The first vector (represented as an Expr) to compare against.
 * @param other The other vector (as a VectorValue) to compare against.
 * @return A new {@code Expr} representing the Manhattan distance between the two vectors.
 */
export function manhattanDistance(expr: Expr, other: VectorValue): FunctionExpr;

/**
 * @beta
 *
 * Calculates the Manhattan distance between two vector expressions.
 *
 * ```typescript
 * // Calculate the Manhattan distance between two vector fields: 'pointA' and 'pointB'
 * manhattanDistance(Field.of("pointA"), Field.of("pointB"));
 * ```
 *
 * @param expr The first vector (represented as an Expr) to compare against.
 * @param other The other vector (represented as an Expr) to compare against.
 * @return A new {@code Expr} representing the Manhattan distance between the two vectors.
 */
export function manhattanDistance(expr: Expr, other: Expr): FunctionExpr;
export function manhattanDistance(
  fieldOrExpr: Expr | string,
  other: Expr | number[] | VectorValue
): FunctionExpr {
  const expr1 = fieldOfOrExpr(fieldOrExpr);
  const expr2 = vectorToExpr(other);
  return expr1.manhattanDistance(expr2);
}

/**
 * @beta
 *
 * Creates an expression that calculates the length of a Firestore Vector.
 *
 * ```typescript
 * // Get the vector length (dimension) of the field 'embedding'.
 * vectorLength(Field.of("embedding"));
 * ```
 *
 * @param expr The expression representing the Firestore Vector.
 * @return A new {@code Expr} representing the length of the array.
 */
export function vectorLength(expr: Expr): FunctionExpr;

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
 * @param field The name of the field representing the Firestore Vector.
 * @return A new {@code Expr} representing the length of the array.
 */
export function vectorLength(field: string): FunctionExpr;
export function vectorLength(expr: Expr | string): FunctionExpr {
  return fieldOfOrExpr(expr).vectorLength();
}

/**
 * @beta
 *
 * Creates an expression that interprets an expression as the number of microseconds since the Unix epoch (1970-01-01 00:00:00 UTC)
 * and returns a timestamp.
 *
 * ```typescript
 * // Interpret the 'microseconds' field as microseconds since epoch.
 * unixMicrosToTimestamp(Field.of("microseconds"));
 * ```
 *
 * @param expr The expression representing the number of microseconds since epoch.
 * @return A new {@code Expr} representing the timestamp.
 */
export function unixMicrosToTimestamp(expr: Expr): FunctionExpr;

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
 * @param field The name of the field representing the number of microseconds since epoch.
 * @return A new {@code Expr} representing the timestamp.
 */
export function unixMicrosToTimestamp(field: string): FunctionExpr;
export function unixMicrosToTimestamp(expr: Expr | string): FunctionExpr {
  return fieldOfOrExpr(expr).unixMicrosToTimestamp();
}

/**
 * @beta
 *
 * Creates an expression that converts a timestamp expression to the number of microseconds since the Unix epoch (1970-01-01 00:00:00 UTC).
 *
 * ```typescript
 * // Convert the 'timestamp' field to microseconds since epoch.
 * timestampToUnixMicros(Field.of("timestamp"));
 * ```
 *
 * @param expr The expression representing the timestamp.
 * @return A new {@code Expr} representing the number of microseconds since epoch.
 */
export function timestampToUnixMicros(expr: Expr): FunctionExpr;

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
 * @param field The name of the field representing the timestamp.
 * @return A new {@code Expr} representing the number of microseconds since epoch.
 */
export function timestampToUnixMicros(field: string): FunctionExpr;
export function timestampToUnixMicros(expr: Expr | string): FunctionExpr {
  return fieldOfOrExpr(expr).timestampToUnixMicros();
}

/**
 * @beta
 *
 * Creates an expression that interprets an expression as the number of milliseconds since the Unix epoch (1970-01-01 00:00:00 UTC)
 * and returns a timestamp.
 *
 * ```typescript
 * // Interpret the 'milliseconds' field as milliseconds since epoch.
 * unixMillisToTimestamp(Field.of("milliseconds"));
 * ```
 *
 * @param expr The expression representing the number of milliseconds since epoch.
 * @return A new {@code Expr} representing the timestamp.
 */
export function unixMillisToTimestamp(expr: Expr): FunctionExpr;

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
 * @param field The name of the field representing the number of milliseconds since epoch.
 * @return A new {@code Expr} representing the timestamp.
 */
export function unixMillisToTimestamp(field: string): FunctionExpr;
export function unixMillisToTimestamp(expr: Expr | string): FunctionExpr {
  const normalizedExpr = fieldOfOrExpr(expr);
  return normalizedExpr.unixMillisToTimestamp();
}

/**
 * @beta
 *
 * Creates an expression that converts a timestamp expression to the number of milliseconds since the Unix epoch (1970-01-01 00:00:00 UTC).
 *
 * ```typescript
 * // Convert the 'timestamp' field to milliseconds since epoch.
 * timestampToUnixMillis(Field.of("timestamp"));
 * ```
 *
 * @param expr The expression representing the timestamp.
 * @return A new {@code Expr} representing the number of milliseconds since epoch.
 */
export function timestampToUnixMillis(expr: Expr): FunctionExpr;

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
 * @param field The name of the field representing the timestamp.
 * @return A new {@code Expr} representing the number of milliseconds since epoch.
 */
export function timestampToUnixMillis(field: string): FunctionExpr;
export function timestampToUnixMillis(expr: Expr | string): FunctionExpr {
  const normalizedExpr = fieldOfOrExpr(expr);
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
 * unixSecondsToTimestamp(Field.of("seconds"));
 * ```
 *
 * @param expr The expression representing the number of seconds since epoch.
 * @return A new {@code Expr} representing the timestamp.
 */
export function unixSecondsToTimestamp(expr: Expr): FunctionExpr;

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
 * @param field The name of the field representing the number of seconds since epoch.
 * @return A new {@code Expr} representing the timestamp.
 */
export function unixSecondsToTimestamp(field: string): FunctionExpr;
export function unixSecondsToTimestamp(expr: Expr | string): FunctionExpr {
  const normalizedExpr = fieldOfOrExpr(expr);
  return normalizedExpr.unixSecondsToTimestamp();
}

/**
 * @beta
 *
 * Creates an expression that converts a timestamp expression to the number of seconds since the Unix epoch (1970-01-01 00:00:00 UTC).
 *
 * ```typescript
 * // Convert the 'timestamp' field to seconds since epoch.
 * timestampToUnixSeconds(Field.of("timestamp"));
 * ```
 *
 * @param expr The expression representing the timestamp.
 * @return A new {@code Expr} representing the number of seconds since epoch.
 */
export function timestampToUnixSeconds(expr: Expr): FunctionExpr;

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
 * @param field The name of the field representing the timestamp.
 * @return A new {@code Expr} representing the number of seconds since epoch.
 */
export function timestampToUnixSeconds(field: string): FunctionExpr;
export function timestampToUnixSeconds(expr: Expr | string): FunctionExpr {
  const normalizedExpr = fieldOfOrExpr(expr);
  return normalizedExpr.timestampToUnixSeconds();
}

/**
 * @beta
 *
 * Creates an expression that adds a specified amount of time to a timestamp.
 *
 * ```typescript
 * // Add some duration determined by field 'unit' and 'amount' to the 'timestamp' field.
 * timestampAdd(Field.of("timestamp"), Field.of("unit"), Field.of("amount"));
 * ```
 *
 * @param timestamp The expression representing the timestamp.
 * @param unit The expression evaluates to unit of time, must be one of 'microsecond', 'millisecond', 'second', 'minute', 'hour', 'day'.
 * @param amount The expression evaluates to amount of the unit.
 * @return A new {@code Expr} representing the resulting timestamp.
 */
export function timestampAdd(
  timestamp: Expr,
  unit: Expr,
  amount: Expr
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that adds a specified amount of time to a timestamp.
 *
 * ```typescript
 * // Add 1 day to the 'timestamp' field.
 * timestampAdd(Field.of("timestamp"), "day", 1);
 * ```
 *
 * @param timestamp The expression representing the timestamp.
 * @param unit The unit of time to add (e.g., "day", "hour").
 * @param amount The amount of time to add.
 * @return A new {@code Expr} representing the resulting timestamp.
 */
export function timestampAdd(
  timestamp: Expr,
  unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
  amount: number
): FunctionExpr;

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
 * @param field The name of the field representing the timestamp.
 * @param unit The unit of time to add (e.g., "day", "hour").
 * @param amount The amount of time to add.
 * @return A new {@code Expr} representing the resulting timestamp.
 */
export function timestampAdd(
  field: string,
  unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
  amount: number
): FunctionExpr;
export function timestampAdd(
  timestamp: Expr | string,
  unit:
    | Expr
    | 'microsecond'
    | 'millisecond'
    | 'second'
    | 'minute'
    | 'hour'
    | 'day',
  amount: Expr | number
): FunctionExpr {
  const normalizedTimestamp = fieldOfOrExpr(timestamp);
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
 * timestampSub(Field.of("timestamp"), Field.of("unit"), Field.of("amount"));
 * ```
 *
 * @param timestamp The expression representing the timestamp.
 * @param unit The expression evaluates to unit of time, must be one of 'microsecond', 'millisecond', 'second', 'minute', 'hour', 'day'.
 * @param amount The expression evaluates to amount of the unit.
 * @return A new {@code Expr} representing the resulting timestamp.
 */
export function timestampSub(
  timestamp: Expr,
  unit: Expr,
  amount: Expr
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that subtracts a specified amount of time from a timestamp.
 *
 * ```typescript
 * // Subtract 1 day from the 'timestamp' field.
 * timestampSub(Field.of("timestamp"), "day", 1);
 * ```
 *
 * @param timestamp The expression representing the timestamp.
 * @param unit The unit of time to subtract (e.g., "day", "hour").
 * @param amount The amount of time to subtract.
 * @return A new {@code Expr} representing the resulting timestamp.
 */
export function timestampSub(
  timestamp: Expr,
  unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
  amount: number
): FunctionExpr;

/**
 * @beta
 *
 * Creates an expression that subtracts a specified amount of time from a timestamp represented by a field.
 *
 * ```typescript
 * // Subtract 1 day from the 'timestamp' field.
 * timestampSub("timestamp", "day", 1);
 * ```
 *
 * @param field The name of the field representing the timestamp.
 * @param unit The unit of time to subtract (e.g., "day", "hour").
 * @param amount The amount of time to subtract.
 * @return A new {@code Expr} representing the resulting timestamp.
 */
export function timestampSub(
  field: string,
  unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
  amount: number
): FunctionExpr;
export function timestampSub(
  timestamp: Expr | string,
  unit:
    | Expr
    | 'microsecond'
    | 'millisecond'
    | 'second'
    | 'minute'
    | 'hour'
    | 'day',
  amount: Expr | number
): FunctionExpr {
  const normalizedTimestamp = fieldOfOrExpr(timestamp);
  const normalizedUnit = valueToDefaultExpr(unit);
  const normalizedAmount = valueToDefaultExpr(amount);
  return normalizedTimestamp.timestampSub(normalizedUnit, normalizedAmount);
}

/**
 * @beta
 *
 * Creates functions that work on the backend but do not exist in the SDK yet.
 *
 * ```typescript
 * // This is the same of the 'sum(Field.of("price"))', if it was not yet implemented in the SDK.
 * genericFunction("sum", [Field.of("price")]);
 * ```
 *
 * @param functionName The name of the server function.
 * @param params The arguments to pass to the function.
 * @return A new {@code FirestoreFunction} representing the function call.
 */
export function genericFunction(
  functionName: string,
  params: any[]
): FunctionExpr {
  return new FunctionExpr(functionName, params.map(valueToDefaultExpr));
}

/**
 * @beta
 *
 * Creates a boolean expression that works on the backend but does not exist in the SDK yet.
 *
 * ```typescript
 * // This is the same of the 'eq("price", 10)', if it was not yet implemented in the SDK.
 * genericFunction("eq", [Field.of("price"), Constant.of(10)]);
 * ```
 *
 * @param functionName The name of the server boolean expression.
 * @param params The arguments to pass to the boolean expression.
 * @return A new {@code BooleanExpr} representing the function call.
 */
export function genericBooleanExpr(
  functionName: string,
  params: any[]
): BooleanExpr {
  return new BooleanExpr(functionName, params.map(valueToDefaultExpr));
}

/**
 * @beta
 *
 * Creates a boolean expression that works on the backend but does not exist in the SDK yet.
 *
 * ```typescript
 * // This is the same of the 'eq("price", 10)', if it was not yet implemented in the SDK.
 * genericFunction("eq", [Field.of("price"), Constant.of(10)]);
 * ```
 *
 * @param functionName The name of the server boolean expression.
 * @param params The arguments to pass to the boolean expression.
 * @return A new {@code BooleanExpr} representing the function call.
 */
export function genericAggregateFunction(
  functionName: string,
  params: any[]
): AggregateFunction {
  return new AggregateFunction(functionName, params.map(valueToDefaultExpr));
}

/**
 * @beta
 *
 * Creates an expression that performs a logical 'AND' operation on multiple filter conditions.
 *
 * ```typescript
 * // Check if the 'age' field is greater than 18 AND the 'city' field is "London" AND
 * // the 'status' field is "active"
 * const condition = and(gt("age", 18), eq("city", "London"), eq("status", "active"));
 * ```
 *
 * @param first The first filter condition.
 * @param second The second filter condition.
 * @param more Additional filter conditions to 'AND' together.
 * @return A new {@code Expr} representing the logical 'AND' operation.
 */
export function andFunction(
  first: BooleanExpr,
  second: BooleanExpr,
  ...more: BooleanExpr[]
): BooleanExpr {
  return new BooleanExpr('and', [first, second, ...more]);
}

/**
 * @beta
 *
 * Creates an expression that performs a logical 'OR' operation on multiple filter conditions.
 *
 * ```typescript
 * // Check if the 'age' field is greater than 18 OR the 'city' field is "London" OR
 * // the 'status' field is "active"
 * const condition = or(gt("age", 18), eq("city", "London"), eq("status", "active"));
 * ```
 *
 * @param first The first filter condition.
 * @param second The second filter condition.
 * @param more Additional filter conditions to 'OR' together.
 * @return A new {@code Expr} representing the logical 'OR' operation.
 */
export function orFunction(
  first: BooleanExpr,
  second: BooleanExpr,
  ...more: BooleanExpr[]
): BooleanExpr {
  return new BooleanExpr('or', [first, second, ...more]);
}

/**
 * @beta
 *
 * Creates an {@link Ordering} that sorts documents in ascending order based on this expression.
 *
 * ```typescript
 * // Sort documents by the 'name' field in ascending order
 * firestore.pipeline().collection("users")
 *   .sort(ascending(Field.of("name")));
 * ```
 *
 * @param expr The expression to create an ascending ordering for.
 * @return A new `Ordering` for ascending sorting.
 */
export function ascending(expr: Expr): Ordering {
  return new Ordering(expr, 'ascending');
}

/**
 * @beta
 *
 * Creates an {@link Ordering} that sorts documents in descending order based on this expression.
 *
 * ```typescript
 * // Sort documents by the 'createdAt' field in descending order
 * firestore.pipeline().collection("users")
 *   .sort(descending(Field.of("createdAt")));
 * ```
 *
 * @param expr The expression to create a descending ordering for.
 * @return A new `Ordering` for descending sorting.
 */
export function descending(expr: Expr): Ordering;
export function descending(fieldName: string): Ordering;
export function descending(field: Expr | string): Ordering {
  return new Ordering(fieldOfOrExpr(field), 'descending');
}

/**
 * @beta
 *
 * Represents an ordering criterion for sorting documents in a Firestore pipeline.
 *
 * You create `Ordering` instances using the `ascending` and `descending` helper functions.
 */
export class Ordering {
  constructor(
    readonly expr: Expr,
    readonly direction: 'ascending' | 'descending'
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
  _readUserData(dataReader: UserDataReader): void {
    this.expr._readUserData(dataReader);
  }
}
