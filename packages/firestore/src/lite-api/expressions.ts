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
function valueToDefaultExpr(value: any): ScalarExpr {
  if (value instanceof ScalarExpr) {
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
 * If the input is a string, it is assumed to be a field name, and a
 * Field.of(value) is returned.
 *
 * @private
 * @internal
 * @param value
 */
function fieldOfOrExpr(value: any): ScalarExpr {
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
 * - **Aggregations:** Calculate aggregate values (e.g., sum, average) over a set of documents.
 *
 * The `Expr` class provides a fluent API for building expressions. You can chain together
 * method calls to create complex expressions.
 */
export abstract class Expr implements ProtoSerializable<ProtoValue>, UserData {
  abstract exprType: ExprType;

  /**
   * @private
   * @internal
   */
  abstract _toProto(serializer: JsonProtoSerializer): ProtoValue;

  /**
   * @private
   * @internal
   */
  abstract _readUserData(dataReader: UserDataReader): void;
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
 * - **Aggregations:** Calculate aggregate values (e.g., sum, average) over a set of documents.
 *
 * The `Expr` class provides a fluent API for building expressions. You can chain together
 * method calls to create complex expressions.
 */
export abstract class ScalarExpr extends Expr {
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
  add(second: ScalarExpr | any, ...others: Array<ScalarExpr | any>): Add {
    const values = [second, ...others];
    return new Add(
      this,
      values.map(value => valueToDefaultExpr(value))
    );
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
  subtract(other: ScalarExpr): Subtract;

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
  subtract(other: any): Subtract;
  subtract(other: any): Subtract {
    return new Subtract(this, valueToDefaultExpr(other));
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
  multiply(
    second: ScalarExpr | any,
    ...others: Array<ScalarExpr | any>
  ): Multiply {
    const values = [second, ...others];
    return new Multiply(
      this,
      values.map(value => valueToDefaultExpr(value))
    );
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
  divide(other: ScalarExpr): Divide;

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
  divide(other: any): Divide;
  divide(other: any): Divide {
    return new Divide(this, valueToDefaultExpr(other));
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
  mod(other: ScalarExpr): Mod;

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
  mod(other: any): Mod;
  mod(other: any): Mod {
    return new Mod(this, valueToDefaultExpr(other));
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
  eq(other: ScalarExpr): Eq;

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
  eq(other: any): Eq;
  eq(other: any): Eq {
    return new Eq(this, valueToDefaultExpr(other));
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
  neq(other: ScalarExpr): Neq;

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
  neq(other: any): Neq;
  neq(other: any): Neq {
    return new Neq(this, valueToDefaultExpr(other));
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
  lt(other: ScalarExpr): Lt;

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
  lt(other: any): Lt;
  lt(other: any): Lt {
    return new Lt(this, valueToDefaultExpr(other));
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
  lte(other: ScalarExpr): Lte;

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
  lte(other: any): Lte;
  lte(other: any): Lte {
    return new Lte(this, valueToDefaultExpr(other));
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
  gt(other: ScalarExpr): Gt;

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
  gt(other: any): Gt;
  gt(other: any): Gt {
    return new Gt(this, valueToDefaultExpr(other));
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
  gte(other: ScalarExpr): Gte;

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
  gte(other: any): Gte;
  gte(other: any): Gte {
    return new Gte(this, valueToDefaultExpr(other));
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
    secondArray: ScalarExpr | any[],
    ...otherArrays: Array<ScalarExpr | any[]>
  ): ArrayConcat {
    const elements = [secondArray, ...otherArrays];
    const exprValues = elements.map(value => valueToDefaultExpr(value));
    return new ArrayConcat(this, exprValues);
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
  arrayContains(element: ScalarExpr): ArrayContains;

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
  arrayContains(element: any): ArrayContains;
  arrayContains(element: any): ArrayContains {
    return new ArrayContains(this, valueToDefaultExpr(element));
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
  arrayContainsAll(...values: ScalarExpr[]): ArrayContainsAll;

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
  arrayContainsAll(...values: any[]): ArrayContainsAll;
  arrayContainsAll(...values: any[]): ArrayContainsAll {
    const exprValues = values.map(value =>
      value instanceof ScalarExpr ? value : valueToDefaultExpr(value)
    );
    return new ArrayContainsAll(this, exprValues);
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
  arrayContainsAny(...values: ScalarExpr[]): ArrayContainsAny;

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
  arrayContainsAny(...values: any[]): ArrayContainsAny;
  arrayContainsAny(...values: any[]): ArrayContainsAny {
    const exprValues = values.map(value =>
      value instanceof ScalarExpr ? value : valueToDefaultExpr(value)
    );
    return new ArrayContainsAny(this, exprValues);
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
  arrayLength(): ArrayLength {
    return new ArrayLength(this);
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
  eqAny(...others: ScalarExpr[]): EqAny;

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
  eqAny(...others: any[]): EqAny;
  eqAny(...others: any[]): EqAny {
    const exprOthers = others.map(other =>
      other instanceof ScalarExpr ? other : valueToDefaultExpr(other)
    );
    return new EqAny(this, exprOthers);
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
  notEqAny(...others: ScalarExpr[]): NotEqAny;

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
  notEqAny(...others: any[]): NotEqAny;
  notEqAny(...others: any[]): NotEqAny {
    const exprOthers = others.map(other =>
      other instanceof ScalarExpr ? other : valueToDefaultExpr(other)
    );
    return new NotEqAny(this, exprOthers);
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
  isNaN(): IsNan {
    return new IsNan(this);
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
  isNull(): IsNull {
    return new IsNull(this);
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
  exists(): Exists {
    return new Exists(this);
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
  charLength(): CharLength {
    return new CharLength(this);
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
  like(pattern: string): Like;

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
  like(pattern: ScalarExpr): Like;
  like(stringOrExpr: string | ScalarExpr): Like {
    if (typeof stringOrExpr === 'string') {
      return new Like(this, Constant.of(stringOrExpr));
    }
    return new Like(this, stringOrExpr as ScalarExpr);
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
  regexContains(pattern: string): RegexContains;

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
  regexContains(pattern: ScalarExpr): RegexContains;
  regexContains(stringOrExpr: string | ScalarExpr): RegexContains {
    if (typeof stringOrExpr === 'string') {
      return new RegexContains(this, Constant.of(stringOrExpr));
    }
    return new RegexContains(this, stringOrExpr as ScalarExpr);
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
  regexMatch(pattern: string): RegexMatch;

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
  regexMatch(pattern: ScalarExpr): RegexMatch;
  regexMatch(stringOrExpr: string | ScalarExpr): RegexMatch {
    if (typeof stringOrExpr === 'string') {
      return new RegexMatch(this, Constant.of(stringOrExpr));
    }
    return new RegexMatch(this, stringOrExpr as ScalarExpr);
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
  strContains(substring: string): StrContains;

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
  strContains(expr: ScalarExpr): StrContains;
  strContains(stringOrExpr: string | ScalarExpr): StrContains {
    if (typeof stringOrExpr === 'string') {
      return new StrContains(this, Constant.of(stringOrExpr));
    }
    return new StrContains(this, stringOrExpr as ScalarExpr);
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
  startsWith(prefix: string): StartsWith;

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
  startsWith(prefix: ScalarExpr): StartsWith;
  startsWith(stringOrExpr: string | ScalarExpr): StartsWith {
    if (typeof stringOrExpr === 'string') {
      return new StartsWith(this, Constant.of(stringOrExpr));
    }
    return new StartsWith(this, stringOrExpr as ScalarExpr);
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
  endsWith(suffix: string): EndsWith;

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
  endsWith(suffix: ScalarExpr): EndsWith;
  endsWith(stringOrExpr: string | ScalarExpr): EndsWith {
    if (typeof stringOrExpr === 'string') {
      return new EndsWith(this, Constant.of(stringOrExpr));
    }
    return new EndsWith(this, stringOrExpr as ScalarExpr);
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
  toLower(): ToLower {
    return new ToLower(this);
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
  toUpper(): ToUpper {
    return new ToUpper(this);
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
  trim(): Trim {
    return new Trim(this);
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
    secondString: ScalarExpr | string,
    ...otherStrings: Array<ScalarExpr | string>
  ): StrConcat {
    const elements = [secondString, ...otherStrings];
    const exprs = elements.map(e =>
      typeof e === 'string' ? Constant.of(e) : (e as ScalarExpr)
    );
    return new StrConcat(this, exprs);
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
  reverse(): Reverse {
    return new Reverse(this);
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
  replaceFirst(find: string, replace: string): ReplaceFirst;

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
  replaceFirst(find: ScalarExpr, replace: ScalarExpr): ReplaceFirst;
  replaceFirst(
    find: ScalarExpr | string,
    replace: ScalarExpr | string
  ): ReplaceFirst {
    const normalizedFind = typeof find === 'string' ? Constant.of(find) : find;
    const normalizedReplace =
      typeof replace === 'string' ? Constant.of(replace) : replace;
    return new ReplaceFirst(
      this,
      normalizedFind as ScalarExpr,
      normalizedReplace as ScalarExpr
    );
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
  replaceAll(find: string, replace: string): ReplaceAll;

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
  replaceAll(find: ScalarExpr, replace: ScalarExpr): ReplaceAll;
  replaceAll(
    find: ScalarExpr | string,
    replace: ScalarExpr | string
  ): ReplaceAll {
    const normalizedFind = typeof find === 'string' ? Constant.of(find) : find;
    const normalizedReplace =
      typeof replace === 'string' ? Constant.of(replace) : replace;
    return new ReplaceAll(
      this,
      normalizedFind as ScalarExpr,
      normalizedReplace as ScalarExpr
    );
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
  byteLength(): ByteLength {
    return new ByteLength(this);
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
  mapGet(subfield: string): MapGet {
    return new MapGet(this, subfield);
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
  count(): Count {
    return new Count(this, false);
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
  sum(): Sum {
    return new Sum(this, false);
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
  avg(): Avg {
    return new Avg(this, false);
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
  minimum(): Minimum {
    return new Minimum(this, false);
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
  maximum(): Maximum {
    return new Maximum(this, false);
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
    second: ScalarExpr | any,
    ...others: Array<ScalarExpr | any>
  ): LogicalMaximum {
    const values = [second, ...others];
    return new LogicalMaximum(
      this,
      values.map(value => valueToDefaultExpr(value))
    );
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
    second: ScalarExpr | any,
    ...others: Array<ScalarExpr | any>
  ): LogicalMinimum {
    const values = [second, ...others];
    return new LogicalMinimum(
      this,
      values.map(value => valueToDefaultExpr(value))
    );
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
  vectorLength(): VectorLength {
    return new VectorLength(this);
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
  cosineDistance(other: ScalarExpr): CosineDistance;
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
  cosineDistance(other: VectorValue): CosineDistance;
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
  cosineDistance(other: number[]): CosineDistance;
  cosineDistance(other: ScalarExpr | VectorValue | number[]): CosineDistance {
    if (other instanceof ScalarExpr) {
      return new CosineDistance(this, other as ScalarExpr);
    } else {
      return new CosineDistance(
        this,
        Constant.vector(other as VectorValue | number[])
      );
    }
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
  dotProduct(other: ScalarExpr): DotProduct;

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
  dotProduct(other: VectorValue): DotProduct;

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
  dotProduct(other: number[]): DotProduct;
  dotProduct(other: ScalarExpr | VectorValue | number[]): DotProduct {
    if (other instanceof ScalarExpr) {
      return new DotProduct(this, other as ScalarExpr);
    } else {
      return new DotProduct(
        this,
        Constant.vector(other as VectorValue | number[])
      );
    }
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
  euclideanDistance(other: ScalarExpr): EuclideanDistance;

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
  euclideanDistance(other: VectorValue): EuclideanDistance;

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
  euclideanDistance(other: number[]): EuclideanDistance;
  euclideanDistance(
    other: ScalarExpr | VectorValue | number[]
  ): EuclideanDistance {
    if (other instanceof ScalarExpr) {
      return new EuclideanDistance(this, other as ScalarExpr);
    } else {
      return new EuclideanDistance(
        this,
        Constant.vector(other as VectorValue | number[])
      );
    }
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
  unixMicrosToTimestamp(): UnixMicrosToTimestamp {
    return new UnixMicrosToTimestamp(this);
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
  timestampToUnixMicros(): TimestampToUnixMicros {
    return new TimestampToUnixMicros(this);
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
  unixMillisToTimestamp(): UnixMillisToTimestamp {
    return new UnixMillisToTimestamp(this);
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
  timestampToUnixMillis(): TimestampToUnixMillis {
    return new TimestampToUnixMillis(this);
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
  unixSecondsToTimestamp(): UnixSecondsToTimestamp {
    return new UnixSecondsToTimestamp(this);
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
  timestampToUnixSeconds(): TimestampToUnixSeconds {
    return new TimestampToUnixSeconds(this);
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
  timestampAdd(unit: ScalarExpr, amount: ScalarExpr): TimestampAdd;

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
  ): TimestampAdd;
  timestampAdd(
    unit:
      | ScalarExpr
      | 'microsecond'
      | 'millisecond'
      | 'second'
      | 'minute'
      | 'hour'
      | 'day',
    amount: ScalarExpr | number
  ): TimestampAdd {
    const normalizedUnit = typeof unit === 'string' ? Constant.of(unit) : unit;
    const normalizedAmount =
      typeof amount === 'number' ? Constant.of(amount) : amount;
    return new TimestampAdd(
      this,
      normalizedUnit as ScalarExpr,
      normalizedAmount as ScalarExpr
    );
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
  timestampSub(unit: ScalarExpr, amount: ScalarExpr): TimestampSub;

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
  ): TimestampSub;
  timestampSub(
    unit:
      | ScalarExpr
      | 'microsecond'
      | 'millisecond'
      | 'second'
      | 'minute'
      | 'hour'
      | 'day',
    amount: ScalarExpr | number
  ): TimestampSub {
    const normalizedUnit = typeof unit === 'string' ? Constant.of(unit) : unit;
    const normalizedAmount =
      typeof amount === 'number' ? Constant.of(amount) : amount;
    return new TimestampSub(
      this,
      normalizedUnit as ScalarExpr,
      normalizedAmount as ScalarExpr
    );
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
  bitAnd(otherBits: number | Bytes): BitAnd;
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
  bitAnd(bitsExpression: ScalarExpr): BitAnd;
  bitAnd(bitsOrExpression: number | ScalarExpr | Bytes): BitAnd {
    return new BitAnd(this, valueToDefaultExpr(bitsOrExpression));
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
  bitOr(otherBits: number | Bytes): BitOr;
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
  bitOr(bitsExpression: ScalarExpr): BitOr;
  bitOr(bitsOrExpression: number | ScalarExpr | Bytes): BitOr {
    return new BitOr(this, valueToDefaultExpr(bitsOrExpression));
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
  bitXor(otherBits: number | Bytes): BitXor;
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
  bitXor(bitsExpression: ScalarExpr): BitXor;
  bitXor(bitsOrExpression: number | ScalarExpr | Bytes): BitXor {
    return new BitXor(this, valueToDefaultExpr(bitsOrExpression));
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
  bitNot(): BitNot {
    return new BitNot(this);
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
  bitLeftShift(y: number): BitLeftShift;
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
  bitLeftShift(numberExpr: ScalarExpr): BitLeftShift;
  bitLeftShift(numberExpr: number | ScalarExpr): BitLeftShift {
    return new BitLeftShift(this, valueToDefaultExpr(numberExpr));
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
  bitRightShift(y: number): BitRightShift;
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
  bitRightShift(numberExpr: ScalarExpr): BitRightShift;
  bitRightShift(numberExpr: number | ScalarExpr): BitRightShift {
    return new BitRightShift(this, valueToDefaultExpr(numberExpr));
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
  documentId(): DocumentId {
    return new DocumentId(this);
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
  substr(position: number, length?: number): Substr;

  /**
   * @beta
   *
   * Creates an expression that returns a substring of the results of this expression.
   *
   * @param position An expression returning the index of the first character of the substring.
   * @param length An expression returning the length of the substring. If not provided the
   * substring will end at the end of the input.
   */
  substr(position: ScalarExpr, length?: ScalarExpr): Substr;
  substr(position: ScalarExpr | number, length?: ScalarExpr | number): Substr {
    const positionExpr = valueToDefaultExpr(position);
    const lengthExpr =
      length === undefined ? undefined : valueToDefaultExpr(length);
    return new Substr(this, positionExpr, lengthExpr);
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
  arrayOffset(offset: number): ArrayOffset;

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
  arrayOffset(offsetExpr: ScalarExpr): ArrayOffset;
  arrayOffset(offset: ScalarExpr | number): ArrayOffset {
    return new ArrayOffset(fieldOfOrExpr(array), valueToDefaultExpr(offset));
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
   * @return A new {@code Expr} representing the 'isError' check.
   */
  isError(): IsError {
    return new IsError(this);
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
  ifError(catchExpr: ScalarExpr): IfError;

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
  ifError(catchValue: any): IfError;
  ifError(catchValue: any): IfError {
    return new IfError(this, valueToDefaultExpr(catchValue));
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
   * @return A new {@code Expr} representing the 'isAbsent' check.
   */
  isAbsent(): IsAbsent {
    return new IsAbsent(this);
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
   * @return A new {@code Expr} representing the 'isNotNull' check.
   */
  isNotNull(): IsNotNull {
    return new IsNotNull(this);
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
  isNotNan(): IsNotNan {
    return new IsNotNan(this);
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
   */
  mapRemove(key: string): MapRemove;
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
   */
  mapRemove(keyExpr: ScalarExpr): MapRemove;
  mapRemove(stringExpr: ScalarExpr | string): MapRemove {
    return new MapRemove(this, valueToDefaultExpr(stringExpr));
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
   */
  mapMerge(
    secondMap: Record<string, any> | ScalarExpr,
    ...otherMaps: Array<Record<string, any> | ScalarExpr>
  ): MapMerge {
    const secondMapExpr = valueToDefaultExpr(secondMap);
    const otherMapExprs = otherMaps.map(valueToDefaultExpr);
    return new MapMerge([this, secondMapExpr, ...otherMapExprs]);
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
  manhattanDistance(other: VectorValue): ManhattanDistance;

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
  manhattanDistance(other: number[]): ManhattanDistance;

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
  manhattanDistance(other: ScalarExpr): ManhattanDistance;
  manhattanDistance(
    other: ScalarExpr | number[] | VectorValue
  ): ManhattanDistance {
    const expr2 = other instanceof ScalarExpr ? other : Constant.vector(other);
    return new ManhattanDistance(this, expr2);
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
  as(name: string): ExprWithAlias<this> {
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
  readonly expr: ScalarExpr;
}

/**
 * @beta
 *
 * An class that represents an aggregate function.
 */
export class AggregateFunction extends Expr {
  exprType: ExprType = 'AggregateFunction';

  constructor(private name: string, private params: ScalarExpr[]) {
    super();
  }

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
   * @return A new {@link AggregateFunctionWithAlias} that wraps this
   *     AggregateFunction and associates it with the provided alias.
   */
  as(name: string): AggregateFunctionWithAlias {
    return new AggregateFunctionWithAlias(this, name);
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
 * An AggregateFunction with alias.
 */
export class AggregateFunctionWithAlias
  implements UserData, ProtoSerializable<ProtoValue>
{
  constructor(readonly expr: AggregateFunction, readonly alias: string) {}

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
    this.expr._readUserData(dataReader);
  }
}

/**
 * @beta
 */
export class ExprWithAlias<T extends ScalarExpr>
  implements Selectable, UserData
{
  exprType: ExprType = 'ExprWithAlias';
  selectable = true as const;

  constructor(readonly expr: T, readonly alias: string) {}

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
class ListOfExprs extends ScalarExpr {
  exprType: ExprType = 'ListOfExprs';

  constructor(private exprs: ScalarExpr[]) {
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
    this.exprs.forEach((expr: ScalarExpr) => expr._readUserData(dataReader));
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
export class Field extends ScalarExpr implements Selectable {
  exprType: ExprType = 'Field';
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

  get expr(): ScalarExpr {
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
export class Constant extends ScalarExpr {
  exprType: ExprType = 'Constant';

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
export class MapValue extends ScalarExpr {
  constructor(private plainObject: Map<string, ScalarExpr>) {
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
 * or the methods on {@link ScalarExpr} ({@link ScalarExpr#eq}, {@link ScalarExpr#lt}, etc) to construct new Function instances.
 */
export class FirestoreFunction extends ScalarExpr {
  exprType: ExprType = 'Function';

  constructor(private name: string, private params: ScalarExpr[]) {
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
export class BooleanExpr extends FirestoreFunction {
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
    return new CountIf(this);
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
  not(filter: BooleanExpr): BooleanExpr {
    return new Not(filter);
  }
}

/**
 * @beta
 */
export class Add extends FirestoreFunction {
  constructor(left: ScalarExpr, others: ScalarExpr[]) {
    super('add', [left, ...others]);
  }
}

/**
 * @beta
 */
export class Subtract extends FirestoreFunction {
  constructor(private left: ScalarExpr, private right: ScalarExpr) {
    super('subtract', [left, right]);
  }
}

/**
 * @beta
 */
export class Multiply extends FirestoreFunction {
  constructor(left: ScalarExpr, others: ScalarExpr[]) {
    super('multiply', [left, ...others]);
  }
}

/**
 * @beta
 */
export class Divide extends FirestoreFunction {
  constructor(private left: ScalarExpr, private right: ScalarExpr) {
    super('divide', [left, right]);
  }
}

/**
 * @beta
 */
export class Mod extends FirestoreFunction {
  constructor(private left: ScalarExpr, private right: ScalarExpr) {
    super('mod', [left, right]);
  }
}

export class MapFunction extends FirestoreFunction {
  constructor(private elements: ScalarExpr[]) {
    super('map', elements);
  }
}

export class ArrayFunction extends FirestoreFunction {
  constructor(private elements: ScalarExpr[]) {
    super('array', elements);
  }
}

/**
 * @beta
 */
export class Eq extends BooleanExpr {
  constructor(private left: ScalarExpr, private right: ScalarExpr) {
    super('eq', [left, right]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class Neq extends BooleanExpr {
  constructor(private left: ScalarExpr, private right: ScalarExpr) {
    super('neq', [left, right]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class Lt extends BooleanExpr {
  constructor(private left: ScalarExpr, private right: ScalarExpr) {
    super('lt', [left, right]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class Lte extends BooleanExpr {
  constructor(private left: ScalarExpr, private right: ScalarExpr) {
    super('lte', [left, right]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class Gt extends BooleanExpr {
  constructor(private left: ScalarExpr, private right: ScalarExpr) {
    super('gt', [left, right]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class Gte extends BooleanExpr {
  constructor(private left: ScalarExpr, private right: ScalarExpr) {
    super('gte', [left, right]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class ArrayConcat extends FirestoreFunction {
  constructor(array: ScalarExpr, elements: ScalarExpr[]) {
    super('array_concat', [array, ...elements]);
  }
}

/**
 * @beta
 */
export class ArrayReverse extends FirestoreFunction {
  constructor(private array: ScalarExpr) {
    super('array_reverse', [array]);
  }
}

/**
 * @beta
 */
export class ArrayContains extends BooleanExpr {
  constructor(private array: ScalarExpr, private element: ScalarExpr) {
    super('array_contains', [array, element]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class ArrayContainsAll extends BooleanExpr {
  constructor(private array: ScalarExpr, private values: ScalarExpr[]) {
    super('array_contains_all', [array, new ListOfExprs(values)]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class ArrayContainsAny extends BooleanExpr {
  constructor(private array: ScalarExpr, private values: ScalarExpr[]) {
    super('array_contains_any', [array, new ListOfExprs(values)]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class ArrayLength extends FirestoreFunction {
  constructor(private array: ScalarExpr) {
    super('array_length', [array]);
  }
}

/**
 * @beta
 */
export class ArrayElement extends FirestoreFunction {
  constructor() {
    super('array_element', []);
  }
}

/**
 * @beta
 */
export class EqAny extends BooleanExpr {
  constructor(private left: ScalarExpr, private others: ScalarExpr[]) {
    super('eq_any', [left, new ListOfExprs(others)]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class NotEqAny extends BooleanExpr {
  constructor(private left: ScalarExpr, private others: ScalarExpr[]) {
    super('not_eq_any', [left, new ListOfExprs(others)]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class IsNan extends BooleanExpr {
  constructor(private expr: ScalarExpr) {
    super('is_nan', [expr]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class Exists extends BooleanExpr {
  constructor(private expr: ScalarExpr) {
    super('exists', [expr]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class Not extends BooleanExpr {
  constructor(private expr: ScalarExpr) {
    super('not', [expr]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class And extends BooleanExpr {
  constructor(private conditions: BooleanExpr[]) {
    super('and', conditions);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class Or extends BooleanExpr {
  constructor(private conditions: BooleanExpr[]) {
    super('or', conditions);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class Xor extends BooleanExpr {
  constructor(private conditions: BooleanExpr[]) {
    super('xor', conditions);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class Cond extends FirestoreFunction {
  constructor(
    private condition: BooleanExpr,
    private thenExpr: ScalarExpr,
    private elseExpr: ScalarExpr
  ) {
    super('cond', [condition, thenExpr, elseExpr]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class LogicalMaximum extends FirestoreFunction {
  constructor(first: ScalarExpr, others: ScalarExpr[]) {
    super('logical_maximum', [first, ...others]);
  }
}

/**
 * @beta
 */
export class LogicalMinimum extends FirestoreFunction {
  constructor(first: ScalarExpr, others: ScalarExpr[]) {
    super('logical_min', [first, ...others]);
  }
}

/**
 * @beta
 */
export class Reverse extends FirestoreFunction {
  constructor(private value: ScalarExpr) {
    super('reverse', [value]);
  }
}

/**
 * @beta
 */
export class ReplaceFirst extends FirestoreFunction {
  constructor(
    private value: ScalarExpr,
    private find: ScalarExpr,
    private replace: ScalarExpr
  ) {
    super('replace_first', [value, find, replace]);
  }
}

/**
 * @beta
 */
export class ReplaceAll extends FirestoreFunction {
  constructor(
    private value: ScalarExpr,
    private find: ScalarExpr,
    private replace: ScalarExpr
  ) {
    super('replace_all', [value, find, replace]);
  }
}

/**
 * @beta
 */
export class CharLength extends FirestoreFunction {
  constructor(private value: ScalarExpr) {
    super('char_length', [value]);
  }
}

/**
 * @beta
 */
export class ByteLength extends FirestoreFunction {
  constructor(private value: ScalarExpr) {
    super('byte_length', [value]);
  }
}

/**
 * @beta
 */
export class Like extends BooleanExpr {
  constructor(private expr: ScalarExpr, private pattern: ScalarExpr) {
    super('like', [expr, pattern]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class RegexContains extends BooleanExpr {
  constructor(private expr: ScalarExpr, private pattern: ScalarExpr) {
    super('regex_contains', [expr, pattern]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class RegexMatch extends BooleanExpr {
  constructor(private expr: ScalarExpr, private pattern: ScalarExpr) {
    super('regex_match', [expr, pattern]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class StrContains extends BooleanExpr {
  constructor(private expr: ScalarExpr, private substring: ScalarExpr) {
    super('str_contains', [expr, substring]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class StartsWith extends BooleanExpr {
  constructor(private expr: ScalarExpr, private prefix: ScalarExpr) {
    super('starts_with', [expr, prefix]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class EndsWith extends BooleanExpr {
  constructor(private expr: ScalarExpr, private suffix: ScalarExpr) {
    super('ends_with', [expr, suffix]);
  }

  filterable = true as const;
}

/**
 * @beta
 */
export class ToLower extends FirestoreFunction {
  constructor(private expr: ScalarExpr) {
    super('to_lower', [expr]);
  }
}

/**
 * @beta
 */
export class ToUpper extends FirestoreFunction {
  constructor(private expr: ScalarExpr) {
    super('to_upper', [expr]);
  }
}

/**
 * @beta
 */
export class Trim extends FirestoreFunction {
  constructor(private expr: ScalarExpr) {
    super('trim', [expr]);
  }
}

/**
 * @beta
 */
export class StrConcat extends FirestoreFunction {
  constructor(private first: ScalarExpr, private rest: ScalarExpr[]) {
    super('str_concat', [first, ...rest]);
  }
}

/**
 * @beta
 */
export class MapGet extends FirestoreFunction {
  constructor(map: ScalarExpr, name: string) {
    super('map_get', [map, Constant.of(name)]);
  }
}

/**
 * @beta
 */
export class Count extends AggregateFunction {
  aggregateFunction = true as const;

  constructor(
    private value: ScalarExpr | undefined,
    private distinct: boolean
  ) {
    super('count', value === undefined ? [] : [value]);
  }
}

/**
 * @beta
 */
export class Sum extends AggregateFunction {
  aggregateFunction = true as const;

  constructor(private value: ScalarExpr, private distinct: boolean) {
    super('sum', [value]);
  }
}

/**
 * @beta
 */
export class Avg extends AggregateFunction {
  aggregateFunction = true as const;

  constructor(private value: ScalarExpr, private distinct: boolean) {
    super('avg', [value]);
  }
}

/**
 * @beta
 */
export class Minimum extends AggregateFunction {
  aggregateFunction = true as const;

  constructor(private value: ScalarExpr, private distinct: boolean) {
    super('minimum', [value]);
  }
}

/**
 * @beta
 */
export class Maximum extends AggregateFunction {
  aggregateFunction = true as const;

  constructor(private value: ScalarExpr, private distinct: boolean) {
    super('maximum', [value]);
  }
}

/**
 * @beta
 */
export class CosineDistance extends FirestoreFunction {
  constructor(private vector1: ScalarExpr, private vector2: ScalarExpr) {
    super('cosine_distance', [vector1, vector2]);
  }
}

/**
 * @beta
 */
export class DotProduct extends FirestoreFunction {
  constructor(private vector1: ScalarExpr, private vector2: ScalarExpr) {
    super('dot_product', [vector1, vector2]);
  }
}

/**
 * @beta
 */
export class EuclideanDistance extends FirestoreFunction {
  constructor(private vector1: ScalarExpr, private vector2: ScalarExpr) {
    super('euclidean_distance', [vector1, vector2]);
  }
}

/**
 * @beta
 */
export class VectorLength extends FirestoreFunction {
  constructor(private value: ScalarExpr) {
    super('vector_length', [value]);
  }
}

/**
 * @beta
 */
export class UnixMicrosToTimestamp extends FirestoreFunction {
  constructor(private input: ScalarExpr) {
    super('unix_micros_to_timestamp', [input]);
  }
}

/**
 * @beta
 */
export class TimestampToUnixMicros extends FirestoreFunction {
  constructor(private input: ScalarExpr) {
    super('timestamp_to_unix_micros', [input]);
  }
}

/**
 * @beta
 */
export class UnixMillisToTimestamp extends FirestoreFunction {
  constructor(private input: ScalarExpr) {
    super('unix_millis_to_timestamp', [input]);
  }
}

/**
 * @beta
 */
export class TimestampToUnixMillis extends FirestoreFunction {
  constructor(private input: ScalarExpr) {
    super('timestamp_to_unix_millis', [input]);
  }
}

/**
 * @beta
 */
export class UnixSecondsToTimestamp extends FirestoreFunction {
  constructor(private input: ScalarExpr) {
    super('unix_seconds_to_timestamp', [input]);
  }
}

/**
 * @beta
 */
export class TimestampToUnixSeconds extends FirestoreFunction {
  constructor(private input: ScalarExpr) {
    super('timestamp_to_unix_seconds', [input]);
  }
}

/**
 * @beta
 */
export class TimestampAdd extends FirestoreFunction {
  constructor(
    private timestamp: ScalarExpr,
    private unit: ScalarExpr,
    private amount: ScalarExpr
  ) {
    super('timestamp_add', [timestamp, unit, amount]);
  }
}

/**
 * @beta
 */
export class TimestampSub extends FirestoreFunction {
  constructor(
    private timestamp: ScalarExpr,
    private unit: ScalarExpr,
    private amount: ScalarExpr
  ) {
    super('timestamp_sub', [timestamp, unit, amount]);
  }
}

/**
 * @beta
 */
export class CountIf extends AggregateFunction {
  constructor(private booleanExpr: BooleanExpr) {
    super('count_if', [booleanExpr]);
  }

  aggregateFunction = true as const;
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
export function countIf(booleanExpr: BooleanExpr): CountIf {
  return new CountIf(booleanExpr);
}

/**
 * @beta
 */
export class Rand extends FirestoreFunction {
  constructor() {
    super('rand', []);
  }
}

/**
 * @beta
 * Creates an expression that return a pseudo-random value of type double in the
 * range of [0, 1), inclusive of 0 and exclusive of 1.
 *
 * @returns A new `Expr` representing the 'rand' function.
 */
export function rand(): Rand {
  return new Rand();
}

/**
 * @beta
 */
export class BitAnd extends FirestoreFunction {
  constructor(private left: ScalarExpr, private right: ScalarExpr) {
    super('bit_and', [left, right]);
  }
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
export function bitAnd(field: string, otherBits: number | Bytes): BitAnd;
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
export function bitAnd(field: string, bitsExpression: ScalarExpr): BitAnd;
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
  bitsExpression: ScalarExpr,
  otherBits: number | Bytes
): BitAnd;
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
  bitsExpression: ScalarExpr,
  otherBitsExpression: ScalarExpr
): BitAnd;
export function bitAnd(
  fieldOrExpression: string | ScalarExpr,
  bitsOrExpression: number | ScalarExpr | Bytes
): BitAnd {
  return new BitAnd(
    fieldOfOrExpr(fieldOrExpression),
    valueToDefaultExpr(bitsOrExpression)
  );
}

/**
 * @beta
 */
export class BitOr extends FirestoreFunction {
  constructor(private left: ScalarExpr, private right: ScalarExpr) {
    super('bit_or', [left, right]);
  }
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
export function bitOr(field: string, otherBits: number | Bytes): BitOr;
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
export function bitOr(field: string, bitsExpression: ScalarExpr): BitOr;
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
  bitsExpression: ScalarExpr,
  otherBits: number | Bytes
): BitOr;
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
  bitsExpression: ScalarExpr,
  otherBitsExpression: ScalarExpr
): BitOr;
export function bitOr(
  fieldOrExpression: string | ScalarExpr,
  bitsOrExpression: number | ScalarExpr | Bytes
): BitOr {
  return new BitOr(
    fieldOfOrExpr(fieldOrExpression),
    valueToDefaultExpr(bitsOrExpression)
  );
}

/**
 * @beta
 */
export class BitXor extends FirestoreFunction {
  constructor(private left: ScalarExpr, private right: ScalarExpr) {
    super('bit_xor', [left, right]);
  }
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
export function bitXor(field: string, otherBits: number | Bytes): BitXor;
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
export function bitXor(field: string, bitsExpression: ScalarExpr): BitXor;
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
  bitsExpression: ScalarExpr,
  otherBits: number | Bytes
): BitXor;
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
  bitsExpression: ScalarExpr,
  otherBitsExpression: ScalarExpr
): BitXor;
export function bitXor(
  fieldOrExpression: string | ScalarExpr,
  bitsOrExpression: number | ScalarExpr | Bytes
): BitXor {
  return new BitXor(
    fieldOfOrExpr(fieldOrExpression),
    valueToDefaultExpr(bitsOrExpression)
  );
}

/**
 * @beta
 */
export class BitNot extends FirestoreFunction {
  constructor(private value: ScalarExpr) {
    super('bit_not', [value]);
  }
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
export function bitNot(field: string): BitNot;
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
export function bitNot(bitsValueExpression: ScalarExpr): BitNot;
export function bitNot(bits: string | ScalarExpr): BitNot {
  return new BitNot(fieldOfOrExpr(bits));
}

/**
 * @beta
 */
export class BitLeftShift extends FirestoreFunction {
  constructor(value: ScalarExpr, y: ScalarExpr) {
    super('bit_left_shift', [value, y]);
  }
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
export function bitLeftShift(field: string, y: number): BitLeftShift;
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
export function bitLeftShift(
  field: string,
  numberExpr: ScalarExpr
): BitLeftShift;
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
export function bitLeftShift(xValue: ScalarExpr, y: number): BitLeftShift;
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
export function bitLeftShift(
  xValue: ScalarExpr,
  numberExpr: ScalarExpr
): BitLeftShift;
export function bitLeftShift(
  xValue: string | ScalarExpr,
  numberExpr: number | ScalarExpr
): BitLeftShift {
  return new BitLeftShift(
    fieldOfOrExpr(xValue),
    valueToDefaultExpr(numberExpr)
  );
}

/**
 * @beta
 */
export class BitRightShift extends FirestoreFunction {
  constructor(value: ScalarExpr, y: ScalarExpr) {
    super('bit_right_shift', [value, y]);
  }
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
export function bitRightShift(field: string, y: number): BitRightShift;
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
export function bitRightShift(
  field: string,
  numberExpr: ScalarExpr
): BitRightShift;
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
export function bitRightShift(xValue: ScalarExpr, y: number): BitRightShift;
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
export function bitRightShift(
  xValue: ScalarExpr,
  numberExpr: ScalarExpr
): BitRightShift;
export function bitRightShift(
  xValue: string | ScalarExpr,
  numberExpr: number | ScalarExpr
): BitRightShift {
  return new BitRightShift(
    fieldOfOrExpr(xValue),
    valueToDefaultExpr(numberExpr)
  );
}

/**
 * @beta
 */
export class ArrayOffset extends FirestoreFunction {
  constructor(private arrayExpression: ScalarExpr, private offset: ScalarExpr) {
    super('array_offset', [arrayExpression, offset]);
  }
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
export function arrayOffset(arrayField: string, offset: number): ArrayOffset;

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
export function arrayOffset(
  arrayField: string,
  offsetExpr: ScalarExpr
): ArrayOffset;

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
  arrayExpression: ScalarExpr,
  offset: number
): ArrayOffset;

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
  arrayExpression: ScalarExpr,
  offsetExpr: ScalarExpr
): ArrayOffset;
export function arrayOffset(
  array: ScalarExpr | string,
  offset: ScalarExpr | number
): ArrayOffset {
  return new ArrayOffset(fieldOfOrExpr(array), valueToDefaultExpr(offset));
}

/**
 * @beta
 */
export class CurrentContext extends FirestoreFunction {
  constructor() {
    super('current_context', []);
  }
}

/**
 * @beta
 * Creates an Expr that returns a map of all values in the current expression context.
 *
 * @return A new {@code Expr} representing the 'current_context' function.
 */
export function currentContext(): CurrentContext {
  return new CurrentContext();
}

/**
 * @beta
 */
export class IsError extends BooleanExpr {
  constructor(private expr: ScalarExpr) {
    super('is_error', [expr]);
  }

  filterable = true as const;
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
export function isError(value: ScalarExpr): IsError {
  return new IsError(value);
}

/**
 * @beta
 */
export class IfError extends FirestoreFunction {
  constructor(private tryExpr: ScalarExpr, private catchExpr: ScalarExpr) {
    super('if_error', [tryExpr, catchExpr]);
  }
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
export function ifError(tryExpr: ScalarExpr, catchExpr: ScalarExpr): IfError;

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
export function ifError(tryExpr: ScalarExpr, catchValue: any): IfError;
export function ifError(tryExpr: ScalarExpr, catchValue: any): IfError {
  return new IfError(tryExpr, valueToDefaultExpr(catchValue));
}

/**
 * @beta
 */
export class IsAbsent extends BooleanExpr {
  constructor(private expr: ScalarExpr) {
    super('is_absent', [expr]);
  }

  filterable = true as const;
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
export function isAbsent(value: ScalarExpr): IsAbsent;

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
export function isAbsent(field: string): IsAbsent;
export function isAbsent(value: ScalarExpr | string): IsAbsent {
  return new IsAbsent(fieldOfOrExpr(value));
}

/**
 * @beta
 */
export class IsNull extends BooleanExpr {
  constructor(private expr: ScalarExpr) {
    super('is_null', [expr]);
  }

  filterable = true as const;
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
export function isNull(value: ScalarExpr): IsNull;

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
export function isNull(value: string): IsNull;
export function isNull(value: ScalarExpr | string): IsNull {
  return new IsNull(fieldOfOrExpr(value));
}

/**
 * @beta
 */
export class IsNotNull extends BooleanExpr {
  constructor(private expr: ScalarExpr) {
    super('is_not_null', [expr]);
  }

  filterable = true as const;
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
export function isNotNull(value: ScalarExpr): IsNotNull;

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
export function isNotNull(value: string): IsNotNull;
export function isNotNull(value: ScalarExpr | string): IsNotNull {
  return new IsNotNull(fieldOfOrExpr(value));
}

/**
 * @beta
 */
export class IsNotNan extends BooleanExpr {
  constructor(private expr: ScalarExpr) {
    super('is_not_nan', [expr]);
  }

  filterable = true as const;
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
export function isNotNan(value: ScalarExpr): IsNotNan;

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
export function isNotNan(value: string): IsNotNan;
export function isNotNan(value: ScalarExpr | string): IsNotNan {
  return new IsNotNan(fieldOfOrExpr(value));
}

/**
 * @beta
 */
export class MapRemove extends FirestoreFunction {
  constructor(map: ScalarExpr, nameExpr: ScalarExpr) {
    super('map_remove', [map, nameExpr]);
  }
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
export function mapRemove(mapField: string, key: string): MapRemove;
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
export function mapRemove(mapExpr: ScalarExpr, key: string): MapRemove;
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
export function mapRemove(mapField: string, keyExpr: ScalarExpr): MapRemove;
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
export function mapRemove(mapExpr: ScalarExpr, keyExpr: ScalarExpr): MapRemove;

export function mapRemove(
  mapExpr: ScalarExpr | string,
  stringExpr: ScalarExpr | string
): MapRemove {
  return new MapRemove(fieldOfOrExpr(mapExpr), valueToDefaultExpr(stringExpr));
}

/**
 * @beta
 */
export class MapMerge extends FirestoreFunction {
  constructor(maps: ScalarExpr[]) {
    super('map_merge', maps);
  }
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
  secondMap: Record<string, any> | ScalarExpr,
  ...otherMaps: Array<Record<string, any> | ScalarExpr>
): MapMerge;

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
  firstMap: Record<string, any> | ScalarExpr,
  secondMap: Record<string, any> | ScalarExpr,
  ...otherMaps: Array<Record<string, any> | ScalarExpr>
): MapMerge;

export function mapMerge(
  firstMap: string | Record<string, any> | ScalarExpr,
  secondMap: Record<string, any> | ScalarExpr,
  ...otherMaps: Array<Record<string, any> | ScalarExpr>
): MapMerge {
  const firstMapExpr =
    typeof firstMap === 'string'
      ? Field.of(firstMap)
      : valueToDefaultExpr(firstMap);
  const secondMapExpr = valueToDefaultExpr(secondMap);
  const otherMapExprs = otherMaps.map(valueToDefaultExpr);
  return new MapMerge([firstMapExpr, secondMapExpr, ...otherMapExprs]);
}

/**
 * @beta
 */
export class Parent extends FirestoreFunction {
  constructor(pathExpr: ScalarExpr) {
    super('parent', [pathExpr]);
  }
}

export function parentFunction(path: string | DocumentReference): Parent;

export function parentFunction(pathExpr: ScalarExpr): Parent;

export function parentFunction(
  path: ScalarExpr | string | DocumentReference
): Parent {
  // @ts-ignore
  const pathExpr = valueToDefaultExpr(path);
  return new Parent(pathExpr);
}

/**
 * @beta
 */
export class CollectionId extends FirestoreFunction {
  constructor(pathExpr: ScalarExpr) {
    super('collection_id', [pathExpr]);
  }
}

export function collectionId(path: string | DocumentReference): CollectionId;

export function collectionId(pathExpr: ScalarExpr): CollectionId;

export function collectionId(
  path: ScalarExpr | string | DocumentReference
): CollectionId {
  // @ts-ignore
  const pathExpr = valueToDefaultExpr(path);
  return new CollectionId(pathExpr);
}

/**
 * @beta
 */
export class DocumentId extends FirestoreFunction {
  constructor(pathExpr: ScalarExpr) {
    super('document_id', [pathExpr]);
  }
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
): DocumentId;

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
export function documentIdFunction(documentPathExpr: ScalarExpr): DocumentId;

export function documentIdFunction(
  documentPath: ScalarExpr | string | DocumentReference
): DocumentId {
  // @ts-ignore
  const documentPathExpr = valueToDefaultExpr(documentPath);
  return new DocumentId(documentPathExpr);
}

/**
 * @beta
 */
export class Key extends FirestoreFunction {
  constructor(namespaceExpr: ScalarExpr, pathExpr: ScalarExpr) {
    super('key', [namespaceExpr, pathExpr]);
  }
}

export function key(namespace: string, path: string): Key;

export function key(namespaceExpr: ScalarExpr, pathExpr: ScalarExpr): Key;

export function key(
  namespace: ScalarExpr | string,
  path: ScalarExpr | string
): Key {
  const namespaceExpr = valueToDefaultExpr(namespace);
  const pathExpr = path instanceof ScalarExpr ? path : Constant.of(path);
  return new Key(namespaceExpr, pathExpr);
}

/**
 * @beta
 */
export class Substr extends FirestoreFunction {
  constructor(
    inputExpr: ScalarExpr,
    position: ScalarExpr,
    length: ScalarExpr | undefined
  ) {
    if (length) {
      super('substr', [inputExpr, position, length]);
    } else {
      super('substr', [inputExpr, position]);
    }
  }
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
): Substr;

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
  input: ScalarExpr,
  position: number,
  length?: number
): Substr;

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
  position: ScalarExpr,
  length?: ScalarExpr
): Substr;

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
  input: ScalarExpr,
  position: ScalarExpr,
  length?: ScalarExpr
): Substr;

export function substr(
  field: ScalarExpr | string,
  position: ScalarExpr | number,
  length?: ScalarExpr | number
): Substr {
  const fieldExpr = fieldOfOrExpr(field);
  const positionExpr = valueToDefaultExpr(position);
  const lengthExpr =
    length === undefined ? undefined : valueToDefaultExpr(length);
  return new Substr(fieldExpr, positionExpr, lengthExpr);
}

/**
 * @beta
 */
export class ManhattanDistance extends FirestoreFunction {
  constructor(vector1: ScalarExpr, vector2: ScalarExpr) {
    super('manhattan_distance', [vector1, vector2]);
  }
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
export function manhattanDistance(
  field: string,
  other: number[]
): ManhattanDistance;

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
): ManhattanDistance;

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
export function manhattanDistance(
  expr: string,
  other: ScalarExpr
): ManhattanDistance;

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
export function manhattanDistance(
  expr: ScalarExpr,
  other: number[]
): ManhattanDistance;

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
export function manhattanDistance(
  expr: ScalarExpr,
  other: VectorValue
): ManhattanDistance;

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
export function manhattanDistance(
  expr: ScalarExpr,
  other: ScalarExpr
): ManhattanDistance;
export function manhattanDistance(
  fieldOrExpr: ScalarExpr | string,
  other: ScalarExpr | number[] | VectorValue
): ManhattanDistance {
  const expr1 = fieldOfOrExpr(fieldOrExpr);
  const expr2 = other instanceof ScalarExpr ? other : Constant.vector(other);
  return new ManhattanDistance(expr1, expr2);
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
  first: ScalarExpr,
  second: ScalarExpr | any,
  ...others: Array<ScalarExpr | any>
): Add;

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
  second: ScalarExpr | any,
  ...others: Array<ScalarExpr | any>
): Add;

export function add(
  first: ScalarExpr | string,
  ...others: Array<ScalarExpr | any>
): Add {
  const normalizedLeft = fieldOfOrExpr(first);
  const normalizedRight = others.map(value => valueToDefaultExpr(value));
  return new Add(normalizedLeft, normalizedRight);
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
export function subtract(left: ScalarExpr, right: ScalarExpr): Subtract;

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
export function subtract(left: ScalarExpr, right: any): Subtract;

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
export function subtract(left: string, right: ScalarExpr): Subtract;

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
export function subtract(left: string, right: any): Subtract;
export function subtract(
  left: ScalarExpr | string,
  right: ScalarExpr | any
): Subtract {
  const normalizedLeft = typeof left === 'string' ? Field.of(left) : left;
  const normalizedRight =
    right instanceof ScalarExpr ? right : valueToDefaultExpr(right);
  return new Subtract(normalizedLeft, normalizedRight);
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
  first: ScalarExpr,
  second: ScalarExpr | any,
  ...others: Array<ScalarExpr | any>
): Multiply;

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
  second: ScalarExpr | any,
  ...others: Array<ScalarExpr | any>
): Multiply;

export function multiply(
  left: ScalarExpr | string,
  ...others: Array<ScalarExpr | any>
): Multiply {
  const normalizedLeft = fieldOfOrExpr(left);
  const normalizedRight = others.map(value => valueToDefaultExpr(value));
  return new Multiply(normalizedLeft, normalizedRight);
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
export function divide(left: ScalarExpr, right: ScalarExpr): Divide;

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
export function divide(left: ScalarExpr, right: any): Divide;

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
export function divide(left: string, right: ScalarExpr): Divide;

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
export function divide(left: string, right: any): Divide;
export function divide(
  left: ScalarExpr | string,
  right: ScalarExpr | any
): Divide {
  const normalizedLeft = typeof left === 'string' ? Field.of(left) : left;
  const normalizedRight =
    right instanceof ScalarExpr ? right : valueToDefaultExpr(right);
  return new Divide(normalizedLeft, normalizedRight);
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
export function mod(left: ScalarExpr, right: ScalarExpr): Mod;

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
export function mod(left: ScalarExpr, right: any): Mod;

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
export function mod(left: string, right: ScalarExpr): Mod;

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
export function mod(left: string, right: any): Mod;
export function mod(left: ScalarExpr | string, right: ScalarExpr | any): Mod {
  const normalizedLeft = typeof left === 'string' ? Field.of(left) : left;
  const normalizedRight =
    right instanceof ScalarExpr ? right : valueToDefaultExpr(right);
  return new Mod(normalizedLeft, normalizedRight);
}

export function map(elements: Record<string, any>): MapFunction {
  const result: any[] = [];
  for (const key in elements) {
    if (Object.prototype.hasOwnProperty.call(elements, key)) {
      const value = elements[key];
      result.push(Constant.of(key));
      result.push(valueToDefaultExpr(value));
    }
  }
  return new MapFunction(result);
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
  const result: Map<string, ScalarExpr> = new Map<string, ScalarExpr>();
  for (const key in plainObject) {
    if (Object.prototype.hasOwnProperty.call(plainObject, key)) {
      const value = plainObject[key];
      result.set(key, valueToDefaultExpr(value));
    }
  }
  return new MapValue(result);
}

export function array(elements: any[]): ArrayFunction {
  return new ArrayFunction(
    elements.map(element => valueToDefaultExpr(element))
  );
}

// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise AND operation between two expressions.
//  *
//  * ```typescript
//  * // Calculate the bitwise AND of 'field1' and 'field2'.
//  * bitAnd(Field.of("field1"), Field.of("field2"));
//  * ```
//  *
//  * @param left The left operand expression.
//  * @param right The right operand expression.
//  * @return A new {@code Expr} representing the bitwise AND operation.
//  */
// export function bitAnd(left: Expr, right: Expr): BitAnd;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise AND operation between an expression and a constant.
//  *
//  * ```typescript
//  * // Calculate the bitwise AND of 'field1' and 0xFF.
//  * bitAnd(Field.of("field1"), 0xFF);
//  * ```
//  *
//  * @param left The left operand expression.
//  * @param right The right operand constant.
//  * @return A new {@code Expr} representing the bitwise AND operation.
//  */
// export function bitAnd(left: Expr, right: any): BitAnd;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise AND operation between a field and an expression.
//  *
//  * ```typescript
//  * // Calculate the bitwise AND of 'field1' and 'field2'.
//  * bitAnd("field1", Field.of("field2"));
//  * ```
//  *
//  * @param left The left operand field name.
//  * @param right The right operand expression.
//  * @return A new {@code Expr} representing the bitwise AND operation.
//  */
// export function bitAnd(left: string, right: Expr): BitAnd;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise AND operation between a field and a constant.
//  *
//  * ```typescript
//  * // Calculate the bitwise AND of 'field1' and 0xFF.
//  * bitAnd("field1", 0xFF);
//  * ```
//  *
//  * @param left The left operand field name.
//  * @param right The right operand constant.
//  * @return A new {@code Expr} representing the bitwise AND operation.
//  */
// export function bitAnd(left: string, right: any): BitAnd;
// export function bitAnd(left: Expr | string, right: Expr | any): BitAnd {
//   const normalizedLeft = typeof left === 'string' ? Field.of(left) : left;
//   const normalizedRight = right instanceof Expr ? right : valueToDefaultExpr(right);
//   return new BitAnd(normalizedLeft, normalizedRight);
// }
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise OR operation between two expressions.
//  *
//  * ```typescript
//  * // Calculate the bitwise OR of 'field1' and 'field2'.
//  * bitOr(Field.of("field1"), Field.of("field2"));
//  * ```
//  *
//  * @param left The left operand expression.
//  * @param right The right operand expression.
//  * @return A new {@code Expr} representing the bitwise OR operation.
//  */
// export function bitOr(left: Expr, right: Expr): BitOr;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise OR operation between an expression and a constant.
//  *
//  * ```typescript
//  * // Calculate the bitwise OR of 'field1' and 0xFF.
//  * bitOr(Field.of("field1"), 0xFF);
//  * ```
//  *
//  * @param left The left operand expression.
//  * @param right The right operand constant.
//  * @return A new {@code Expr} representing the bitwise OR operation.
//  */
// export function bitOr(left: Expr, right: any): BitOr;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise OR operation between a field and an expression.
//  *
//  * ```typescript
//  * // Calculate the bitwise OR of 'field1' and 'field2'.
//  * bitOr("field1", Field.of("field2"));
//  * ```
//  *
//  * @param left The left operand field name.
//  * @param right The right operand expression.
//  * @return A new {@code Expr} representing the bitwise OR operation.
//  */
// export function bitOr(left: string, right: Expr): BitOr;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise OR operation between a field and a constant.
//  *
//  * ```typescript
//  * // Calculate the bitwise OR of 'field1' and 0xFF.
//  * bitOr("field1", 0xFF);
//  * ```
//  *
//  * @param left The left operand field name.
//  * @param right The right operand constant.
//  * @return A new {@code Expr} representing the bitwise OR operation.
//  */
// export function bitOr(left: string, right: any): BitOr;
// export function bitOr(left: Expr | string, right: Expr | any): BitOr {
//   const normalizedLeft = typeof left === 'string' ? Field.of(left) : left;
//   const normalizedRight = right instanceof Expr ? right : valueToDefaultExpr(right);
//   return new BitOr(normalizedLeft, normalizedRight);
// }
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise XOR operation between two expressions.
//  *
//  * ```typescript
//  * // Calculate the bitwise XOR of 'field1' and 'field2'.
//  * bitXor(Field.of("field1"), Field.of("field2"));
//  * ```
//  *
//  * @param left The left operand expression.
//  * @param right The right operand expression.
//  * @return A new {@code Expr} representing the bitwise XOR operation.
//  */
// export function bitXor(left: Expr, right: Expr): BitXor;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise XOR operation between an expression and a constant.
//  *
//  * ```typescript
//  * // Calculate the bitwise XOR of 'field1' and 0xFF.
//  * bitXor(Field.of("field1"), 0xFF);
//  * ```
//  *
//  * @param left The left operand expression.
//  * @param right The right operand constant.
//  * @return A new {@code Expr} representing the bitwise XOR operation.
//  */
// export function bitXor(left: Expr, right: any): BitXor;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise XOR operation between a field and an expression.
//  *
//  * ```typescript
//  * // Calculate the bitwise XOR of 'field1' and 'field2'.
//  * bitXor("field1", Field.of("field2"));
//  * ```
//  *
//  * @param left The left operand field name.
//  * @param right The right operand expression.
//  * @return A new {@code Expr} representing the bitwise XOR operation.
//  */
// export function bitXor(left: string, right: Expr): BitXor;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise XOR operation between a field and a constant.
//  *
//  * ```typescript
//  * // Calculate the bitwise XOR of 'field1' and 0xFF.
//  * bitXor("field1", 0xFF);
//  * ```
//  *
//  * @param left The left operand field name.
//  * @param right The right operand constant.
//  * @return A new {@code Expr} representing the bitwise XOR operation.
//  */
// export function bitXor(left: string, right: any): BitXor;
// export function bitXor(left: Expr | string, right: Expr | any): BitXor {
//   const normalizedLeft = typeof left === 'string' ? Field.of(left) : left;
//   const normalizedRight = right instanceof Expr ? right : valueToDefaultExpr(right);
//   return new BitXor(normalizedLeft, normalizedRight);
// }
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise NOT operation to an expression.
//  *
//  * ```typescript
//  * // Calculate the bitwise NOT of 'field1'.
//  * bitNot(Field.of("field1"));
//  * ```
//  *
//  * @param operand The operand expression.
//  * @return A new {@code Expr} representing the bitwise NOT operation.
//  */
// export function bitNot(operand: Expr): BitNot;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise NOT operation to a field.
//  *
//  * ```typescript
//  * // Calculate the bitwise NOT of 'field1'.
//  * bitNot("field1");
//  * ```
//  *
//  * @param operand The operand field name.
//  * @return A new {@code Expr} representing the bitwise NOT operation.
//  */
// export function bitNot(operand: string): BitNot;
// export function bitNot(operand: Expr | string): BitNot {
//   const normalizedOperand =
//     typeof operand === 'string' ? Field.of(operand) : operand;
//   return new BitNot(normalizedOperand);
// }
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise left shift operation between two expressions.
//  *
//  * ```typescript
//  * // Calculate the bitwise left shift of 'field1' by 'field2' bits.
//  * bitLeftShift(Field.of("field1"), Field.of("field2"));
//  * ```
//  *
//  * @param left The left operand expression.
//  * @param right The right operand expression representing the number of bits to shift.
//  * @return A new {@code Expr} representing the bitwise left shift operation.
//  */
// export function bitLeftShift(left: Expr, right: Expr): BitLeftShift;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise left shift operation between an expression and a constant.
//  *
//  * ```typescript
//  * // Calculate the bitwise left shift of 'field1' by 2 bits.
//  * bitLeftShift(Field.of("field1"), 2);
//  * ```
//  *
//  * @param left The left operand expression.
//  * @param right The right operand constant representing the number of bits to shift.
//  * @return A new {@code Expr} representing the bitwise left shift operation.
//  */
// export function bitLeftShift(left: Expr, right: any): BitLeftShift;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise left shift operation between a field and an expression.
//  *
//  * ```typescript
//  * // Calculate the bitwise left shift of 'field1' by 'field2' bits.
//  * bitLeftShift("field1", Field.of("field2"));
//  * ```
//  *
//  * @param left The left operand field name.
//  * @param right The right operand expression representing the number of bits to shift.
//  * @return A new {@code Expr} representing the bitwise left shift operation.
//  */
// export function bitLeftShift(left: string, right: Expr): BitLeftShift;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise left shift operation between a field and a constant.
//  *
//  * ```typescript
//  * // Calculate the bitwise left shift of 'field1' by 2 bits.
//  * bitLeftShift("field1", 2);
//  * ```
//  *
//  * @param left The left operand field name.
//  * @param right The right operand constant representing the number of bits to shift.
//  * @return A new {@code Expr} representing the bitwise left shift operation.
//  */
// export function bitLeftShift(left: string, right: any): BitLeftShift;
// export function bitLeftShift(
//   left: Expr | string,
//   right: Expr | any
// ): BitLeftShift {
//   const normalizedLeft = typeof left === 'string' ? Field.of(left) : left;
//   const normalizedRight = right instanceof Expr ? right : valueToDefaultExpr(right);
//   return new BitLeftShift(normalizedLeft, normalizedRight);
// }
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise right shift operation between two expressions.
//  *
//  * ```typescript
//  * // Calculate the bitwise right shift of 'field1' by 'field2' bits.
//  * bitRightShift(Field.of("field1"), Field.of("field2"));
//  * ```
//  *
//  * @param left The left operand expression.
//  * @param right The right operand expression representing the number of bits to shift.
//  * @return A new {@code Expr} representing the bitwise right shift operation.
//  */
// export function bitRightShift(left: Expr, right: Expr): BitRightShift;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise right shift operation between an expression and a constant.
//  *
//  * ```typescript
//  * // Calculate the bitwise right shift of 'field1' by 2 bits.
//  * bitRightShift(Field.of("field1"), 2);
//  * ```
//  *
//  * @param left The left operand expression.
//  * @param right The right operand constant representing the number of bits to shift.
//  * @return A new {@code Expr} representing the bitwise right shift operation.
//  */
// export function bitRightShift(left: Expr, right: any): BitRightShift;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise right shift operation between a field and an expression.
//  *
//  * ```typescript
//  * // Calculate the bitwise right shift of 'field1' by 'field2' bits.
//  * bitRightShift("field1", Field.of("field2"));
//  * ```
//  *
//  * @param left The left operand field name.
//  * @param right The right operand expression representing the number of bits to shift.
//  * @return A new {@code Expr} representing the bitwise right shift operation.
//  */
// export function bitRightShift(left: string, right: Expr): BitRightShift;
//
// /**
//  * @beta
//  *
//  * Creates an expression that applies a bitwise right shift operation between a field and a constant.
//  *
//  * ```typescript
//  * // Calculate the bitwise right shift of 'field1' by 2 bits.
//  * bitRightShift("field1", 2);
//  * ```
//  *
//  * @param left The left operand field name.
//  * @param right The right operand constant representing the number of bits to shift.
//  * @return A new {@code Expr} representing the bitwise right shift operation.
//  */
// export function bitRightShift(left: string, right: any): BitRightShift;
// export function bitRightShift(
//   left: Expr | string,
//   right: Expr | any
// ): BitRightShift {
//   const normalizedLeft = typeof left === 'string' ? Field.of(left) : left;
//   const normalizedRight = right instanceof Expr ? right : valueToDefaultExpr(right);
//   return new BitRightShift(normalizedLeft, normalizedRight);
// }

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
export function eq(left: ScalarExpr, right: ScalarExpr): Eq;

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
export function eq(left: ScalarExpr, right: any): Eq;

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
export function eq(left: string, right: ScalarExpr): Eq;

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
export function eq(left: string, right: any): Eq;
export function eq(left: ScalarExpr | string, right: any): Eq {
  const leftExpr = left instanceof ScalarExpr ? left : Field.of(left);
  const rightExpr =
    right instanceof ScalarExpr ? right : valueToDefaultExpr(right);
  return new Eq(leftExpr, rightExpr);
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
export function neq(left: ScalarExpr, right: ScalarExpr): Neq;

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
export function neq(left: ScalarExpr, right: any): Neq;

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
export function neq(left: string, right: ScalarExpr): Neq;

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
export function neq(left: string, right: any): Neq;
export function neq(left: ScalarExpr | string, right: any): Neq {
  const leftExpr = left instanceof ScalarExpr ? left : Field.of(left);
  const rightExpr =
    right instanceof ScalarExpr ? right : valueToDefaultExpr(right);
  return new Neq(leftExpr, rightExpr);
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
export function lt(left: ScalarExpr, right: ScalarExpr): Lt;

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
export function lt(left: ScalarExpr, right: any): Lt;

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
export function lt(left: string, right: ScalarExpr): Lt;

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
export function lt(left: string, right: any): Lt;
export function lt(left: ScalarExpr | string, right: any): Lt {
  const leftExpr = left instanceof ScalarExpr ? left : Field.of(left);
  const rightExpr =
    right instanceof ScalarExpr ? right : valueToDefaultExpr(right);
  return new Lt(leftExpr, rightExpr);
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
export function lte(left: ScalarExpr, right: ScalarExpr): Lte;

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
export function lte(left: ScalarExpr, right: any): Lte;

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
export function lte(left: string, right: ScalarExpr): Lte;

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
export function lte(left: string, right: any): Lte;
export function lte(left: ScalarExpr | string, right: any): Lte {
  const leftExpr = left instanceof ScalarExpr ? left : Field.of(left);
  const rightExpr =
    right instanceof ScalarExpr ? right : valueToDefaultExpr(right);
  return new Lte(leftExpr, rightExpr);
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
export function gt(left: ScalarExpr, right: ScalarExpr): Gt;

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
export function gt(left: ScalarExpr, right: any): Gt;

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
export function gt(left: string, right: ScalarExpr): Gt;

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
export function gt(left: string, right: any): Gt;
export function gt(left: ScalarExpr | string, right: any): Gt {
  const leftExpr = left instanceof ScalarExpr ? left : Field.of(left);
  const rightExpr =
    right instanceof ScalarExpr ? right : valueToDefaultExpr(right);
  return new Gt(leftExpr, rightExpr);
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
export function gte(left: ScalarExpr, right: ScalarExpr): Gte;

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
export function gte(left: ScalarExpr, right: any): Gte;

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
export function gte(left: string, right: ScalarExpr): Gte;

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
export function gte(left: string, right: any): Gte;
export function gte(left: ScalarExpr | string, right: any): Gte {
  const leftExpr = left instanceof ScalarExpr ? left : Field.of(left);
  const rightExpr =
    right instanceof ScalarExpr ? right : valueToDefaultExpr(right);
  return new Gte(leftExpr, rightExpr);
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
  firstArray: ScalarExpr,
  secondArray: ScalarExpr | any,
  ...otherArrays: Array<ScalarExpr | any>
): ArrayConcat;

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
  secondArray: ScalarExpr | any[],
  ...otherArrays: Array<ScalarExpr | any>
): ArrayConcat;

export function arrayConcat(
  firstArray: ScalarExpr | string,
  ...otherArrays: Array<ScalarExpr | any[]>
): ArrayConcat {
  const arrayExpr = fieldOfOrExpr(firstArray);
  const exprValues = otherArrays.map(element => valueToDefaultExpr(element));
  return new ArrayConcat(arrayExpr, exprValues);
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
export function arrayContains(
  array: ScalarExpr,
  element: ScalarExpr
): ArrayContains;

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
export function arrayContains(array: ScalarExpr, element: any): ArrayContains;

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
export function arrayContains(
  array: string,
  element: ScalarExpr
): ArrayContains;

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
export function arrayContains(array: string, element: any): ArrayContains;
export function arrayContains(
  array: ScalarExpr | string,
  element: any
): ArrayContains {
  const arrayExpr = array instanceof ScalarExpr ? array : Field.of(array);
  const elementExpr =
    element instanceof ScalarExpr ? element : valueToDefaultExpr(element);
  return new ArrayContains(arrayExpr, elementExpr);
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
export function arrayContainsAny(
  array: ScalarExpr,
  values: ScalarExpr[]
): ArrayContainsAny;

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
export function arrayContainsAny(
  array: ScalarExpr,
  values: any[]
): ArrayContainsAny;

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
export function arrayContainsAny(
  array: string,
  values: ScalarExpr[]
): ArrayContainsAny;

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
export function arrayContainsAny(
  array: string,
  values: any[]
): ArrayContainsAny;
export function arrayContainsAny(
  array: ScalarExpr | string,
  values: any[]
): ArrayContainsAny {
  const arrayExpr = array instanceof ScalarExpr ? array : Field.of(array);
  const exprValues = values.map(value =>
    value instanceof ScalarExpr ? value : valueToDefaultExpr(value)
  );
  return new ArrayContainsAny(arrayExpr, exprValues);
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
export function arrayContainsAll(
  array: ScalarExpr,
  values: ScalarExpr[]
): ArrayContainsAll;

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
export function arrayContainsAll(
  array: ScalarExpr,
  values: any[]
): ArrayContainsAll;

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
export function arrayContainsAll(
  array: string,
  values: ScalarExpr[]
): ArrayContainsAll;

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
export function arrayContainsAll(
  array: string,
  values: any[]
): ArrayContainsAll;
export function arrayContainsAll(
  array: ScalarExpr | string,
  values: any[]
): ArrayContainsAll {
  const arrayExpr = array instanceof ScalarExpr ? array : Field.of(array);
  const exprValues = values.map(value =>
    value instanceof ScalarExpr ? value : valueToDefaultExpr(value)
  );
  return new ArrayContainsAll(arrayExpr, exprValues);
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
export function arrayLength(array: ScalarExpr): ArrayLength {
  return new ArrayLength(array);
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
export function eqAny(element: ScalarExpr, others: ScalarExpr[]): EqAny;

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
export function eqAny(element: ScalarExpr, others: any[]): EqAny;

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
export function eqAny(element: string, others: ScalarExpr[]): EqAny;

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
export function eqAny(element: string, others: any[]): EqAny;
export function eqAny(element: ScalarExpr | string, others: any[]): EqAny {
  const elementExpr =
    element instanceof ScalarExpr ? element : Field.of(element);
  const exprOthers = others.map(other =>
    other instanceof ScalarExpr ? other : valueToDefaultExpr(other)
  );
  return new EqAny(elementExpr, exprOthers);
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
export function notEqAny(element: ScalarExpr, others: ScalarExpr[]): NotEqAny;

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
export function notEqAny(element: ScalarExpr, others: any[]): NotEqAny;

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
export function notEqAny(element: string, others: ScalarExpr[]): NotEqAny;

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
export function notEqAny(element: string, others: any[]): NotEqAny;
export function notEqAny(
  element: ScalarExpr | string,
  others: any[]
): NotEqAny {
  const elementExpr =
    element instanceof ScalarExpr ? element : Field.of(element);
  const exprOthers = others.map(other =>
    other instanceof ScalarExpr ? other : valueToDefaultExpr(other)
  );
  return new NotEqAny(elementExpr, exprOthers);
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
): Xor {
  return new Xor([first, second, ...more]);
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
  thenExpr: ScalarExpr,
  elseExpr: ScalarExpr
): Cond {
  return new Cond(condition, thenExpr, elseExpr);
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
export function not(filter: BooleanExpr): Not {
  return new Not(filter);
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
  first: ScalarExpr,
  second: ScalarExpr | any,
  ...others: Array<ScalarExpr | any>
): LogicalMaximum;

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
  second: ScalarExpr | any,
  ...others: Array<ScalarExpr | any>
): LogicalMaximum;

export function logicalMaximum(
  first: ScalarExpr | string,
  ...others: Array<ScalarExpr | any>
): LogicalMaximum {
  return new LogicalMaximum(
    fieldOfOrExpr(first),
    others.map(value => valueToDefaultExpr(value))
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
  first: ScalarExpr,
  second: ScalarExpr | any,
  ...others: Array<ScalarExpr | any>
): LogicalMinimum;

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
  second: ScalarExpr | any,
  ...others: Array<ScalarExpr | any>
): LogicalMinimum;

export function logicalMinimum(
  first: ScalarExpr | string,
  ...others: Array<ScalarExpr | any>
): LogicalMinimum {
  return new LogicalMinimum(
    fieldOfOrExpr(first),
    others.map(value => valueToDefaultExpr(value))
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
export function exists(value: ScalarExpr): Exists;

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
export function exists(field: string): Exists;
export function exists(valueOrField: ScalarExpr | string): Exists {
  const valueExpr =
    valueOrField instanceof ScalarExpr ? valueOrField : Field.of(valueOrField);
  return new Exists(valueExpr);
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
export function isNan(value: ScalarExpr): IsNan;

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
export function isNan(value: string): IsNan;
export function isNan(value: ScalarExpr | string): IsNan {
  const valueExpr = value instanceof ScalarExpr ? value : Field.of(value);
  return new IsNan(valueExpr);
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
export function reverse(expr: ScalarExpr): Reverse;

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
export function reverse(field: string): Reverse;
export function reverse(expr: ScalarExpr | string): Reverse {
  const normalizedExpr = typeof expr === 'string' ? Field.of(expr) : expr;
  return new Reverse(normalizedExpr);
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
  value: ScalarExpr,
  find: string,
  replace: string
): ReplaceFirst;

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
  value: ScalarExpr,
  find: ScalarExpr,
  replace: ScalarExpr
): ReplaceFirst;

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
): ReplaceFirst;
export function replaceFirst(
  value: ScalarExpr | string,
  find: ScalarExpr | string,
  replace: ScalarExpr | string
): ReplaceFirst {
  const normalizedValue = typeof value === 'string' ? Field.of(value) : value;
  const normalizedFind = typeof find === 'string' ? Constant.of(find) : find;
  const normalizedReplace =
    typeof replace === 'string' ? Constant.of(replace) : replace;
  return new ReplaceFirst(normalizedValue, normalizedFind, normalizedReplace);
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
  value: ScalarExpr,
  find: string,
  replace: string
): ReplaceAll;

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
  value: ScalarExpr,
  find: ScalarExpr,
  replace: ScalarExpr
): ReplaceAll;

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
): ReplaceAll;
export function replaceAll(
  value: ScalarExpr | string,
  find: ScalarExpr | string,
  replace: ScalarExpr | string
): ReplaceAll {
  const normalizedValue = typeof value === 'string' ? Field.of(value) : value;
  const normalizedFind = typeof find === 'string' ? Constant.of(find) : find;
  const normalizedReplace =
    typeof replace === 'string' ? Constant.of(replace) : replace;
  return new ReplaceAll(normalizedValue, normalizedFind, normalizedReplace);
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
export function byteLength(expr: ScalarExpr): ByteLength;

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
export function byteLength(field: string): ByteLength;
export function byteLength(expr: ScalarExpr | string): ByteLength {
  const normalizedExpr = typeof expr === 'string' ? Field.of(expr) : expr;
  return new ByteLength(normalizedExpr);
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
export function charLength(field: string): CharLength;

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
export function charLength(expr: ScalarExpr): CharLength;
export function charLength(value: ScalarExpr | string): CharLength {
  const valueExpr = value instanceof ScalarExpr ? value : Field.of(value);
  return new CharLength(valueExpr);
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
export function like(left: string, pattern: string): Like;

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
export function like(left: string, pattern: ScalarExpr): Like;

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
export function like(left: ScalarExpr, pattern: string): Like;

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
export function like(left: ScalarExpr, pattern: ScalarExpr): Like;
export function like(
  left: ScalarExpr | string,
  pattern: ScalarExpr | string
): Like {
  const leftExpr = left instanceof ScalarExpr ? left : Field.of(left);
  const patternExpr =
    pattern instanceof ScalarExpr ? pattern : valueToDefaultExpr(pattern);
  return new Like(leftExpr, patternExpr);
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
export function regexContains(left: string, pattern: string): RegexContains;

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
export function regexContains(left: string, pattern: ScalarExpr): RegexContains;

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
export function regexContains(left: ScalarExpr, pattern: string): RegexContains;

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
export function regexContains(
  left: ScalarExpr,
  pattern: ScalarExpr
): RegexContains;
export function regexContains(
  left: ScalarExpr | string,
  pattern: ScalarExpr | string
): RegexContains {
  const leftExpr = left instanceof ScalarExpr ? left : Field.of(left);
  const patternExpr =
    pattern instanceof ScalarExpr ? pattern : valueToDefaultExpr(pattern);
  return new RegexContains(leftExpr, patternExpr);
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
export function regexMatch(left: string, pattern: string): RegexMatch;

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
export function regexMatch(left: string, pattern: ScalarExpr): RegexMatch;

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
export function regexMatch(left: ScalarExpr, pattern: string): RegexMatch;

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
export function regexMatch(left: ScalarExpr, pattern: ScalarExpr): RegexMatch;
export function regexMatch(
  left: ScalarExpr | string,
  pattern: ScalarExpr | string
): RegexMatch {
  const leftExpr = left instanceof ScalarExpr ? left : Field.of(left);
  const patternExpr =
    pattern instanceof ScalarExpr ? pattern : valueToDefaultExpr(pattern);
  return new RegexMatch(leftExpr, patternExpr);
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
export function strContains(left: string, substring: string): StrContains;

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
export function strContains(left: string, substring: ScalarExpr): StrContains;

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
export function strContains(left: ScalarExpr, substring: string): StrContains;

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
export function strContains(
  left: ScalarExpr,
  substring: ScalarExpr
): StrContains;
export function strContains(
  left: ScalarExpr | string,
  substring: ScalarExpr | string
): StrContains {
  const leftExpr = left instanceof ScalarExpr ? left : Field.of(left);
  const substringExpr =
    substring instanceof ScalarExpr ? substring : valueToDefaultExpr(substring);
  return new StrContains(leftExpr, substringExpr);
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
export function startsWith(expr: string, prefix: string): StartsWith;

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
export function startsWith(expr: string, prefix: ScalarExpr): StartsWith;

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
export function startsWith(expr: ScalarExpr, prefix: string): StartsWith;

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
export function startsWith(expr: ScalarExpr, prefix: ScalarExpr): StartsWith;
export function startsWith(
  expr: ScalarExpr | string,
  prefix: ScalarExpr | string
): StartsWith {
  const exprLeft = expr instanceof ScalarExpr ? expr : Field.of(expr);
  const prefixExpr =
    prefix instanceof ScalarExpr ? prefix : valueToDefaultExpr(prefix);
  return new StartsWith(exprLeft, prefixExpr);
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
export function endsWith(expr: string, suffix: string): EndsWith;

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
export function endsWith(expr: string, suffix: ScalarExpr): EndsWith;

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
export function endsWith(expr: ScalarExpr, suffix: string): EndsWith;

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
export function endsWith(expr: ScalarExpr, suffix: ScalarExpr): EndsWith;
export function endsWith(
  expr: ScalarExpr | string,
  suffix: ScalarExpr | string
): EndsWith {
  const exprLeft = expr instanceof ScalarExpr ? expr : Field.of(expr);
  const suffixExpr =
    suffix instanceof ScalarExpr ? suffix : valueToDefaultExpr(suffix);
  return new EndsWith(exprLeft, suffixExpr);
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
export function toLower(expr: string): ToLower;

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
export function toLower(expr: ScalarExpr): ToLower;
export function toLower(expr: ScalarExpr | string): ToLower {
  return new ToLower(expr instanceof ScalarExpr ? expr : Field.of(expr));
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
export function toUpper(expr: string): ToUpper;

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
export function toUpper(expr: ScalarExpr): ToUpper;
export function toUpper(expr: ScalarExpr | string): ToUpper {
  return new ToUpper(expr instanceof ScalarExpr ? expr : Field.of(expr));
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
export function trim(expr: string): Trim;

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
export function trim(expr: ScalarExpr): Trim;
export function trim(expr: ScalarExpr | string): Trim {
  return new Trim(expr instanceof ScalarExpr ? expr : Field.of(expr));
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
  secondString: ScalarExpr | string,
  ...otherStrings: Array<ScalarExpr | string>
): StrConcat;

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
  firstString: ScalarExpr,
  secondString: ScalarExpr | string,
  ...otherStrings: Array<ScalarExpr | string>
): StrConcat;
export function strConcat(
  first: string | ScalarExpr,
  ...elements: Array<string | ScalarExpr>
): StrConcat {
  const exprs = elements.map(e =>
    e instanceof ScalarExpr ? e : valueToDefaultExpr(e)
  );
  return new StrConcat(valueToDefaultExpr(first), exprs);
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
export function mapGet(mapField: string, subField: string): MapGet;

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
export function mapGet(mapExpr: ScalarExpr, subField: string): MapGet;
export function mapGet(
  fieldOrExpr: string | ScalarExpr,
  subField: string
): MapGet {
  return new MapGet(
    typeof fieldOrExpr === 'string' ? Field.of(fieldOrExpr) : fieldOrExpr,
    subField
  );
}

/**
 * @beta
 *
 * Creates an aggregation that counts the total number of stage inputs.
 *
 * ```typescript
 * // Count the total number of users
 * countAll().as("totalUsers");
 * ```
 *
 * @return A new {@code AggregateFunction} representing the 'countAll' aggregation.
 */
export function countAll(): Count {
  return new Count(undefined, false);
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
export function countFunction(value: ScalarExpr): Count;

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
export function countFunction(value: string): Count;
export function countFunction(value: ScalarExpr | string): Count {
  const exprValue = value instanceof ScalarExpr ? value : Field.of(value);
  return new Count(exprValue, false);
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
export function sumFunction(value: ScalarExpr): Sum;

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
export function sumFunction(value: string): Sum;
export function sumFunction(value: ScalarExpr | string): Sum {
  const exprValue = value instanceof ScalarExpr ? value : Field.of(value);
  return new Sum(exprValue, false);
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
export function avgFunction(value: ScalarExpr): Avg;

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
export function avgFunction(value: string): Avg;
export function avgFunction(value: ScalarExpr | string): Avg {
  const exprValue = value instanceof ScalarExpr ? value : Field.of(value);
  return new Avg(exprValue, false);
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
export function minimum(value: ScalarExpr): Minimum;

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
export function minimum(value: string): Minimum;
export function minimum(value: ScalarExpr | string): Minimum {
  const exprValue = value instanceof ScalarExpr ? value : Field.of(value);
  return new Minimum(exprValue, false);
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
export function maximum(value: ScalarExpr): Maximum;

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
export function maximum(value: string): Maximum;
export function maximum(value: ScalarExpr | string): Maximum {
  const exprValue = value instanceof ScalarExpr ? value : Field.of(value);
  return new Maximum(exprValue, false);
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
export function cosineDistance(expr: string, other: number[]): CosineDistance;

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
export function cosineDistance(
  expr: string,
  other: VectorValue
): CosineDistance;

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
export function cosineDistance(expr: string, other: ScalarExpr): CosineDistance;

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
export function cosineDistance(
  expr: ScalarExpr,
  other: number[]
): CosineDistance;

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
export function cosineDistance(
  expr: ScalarExpr,
  other: VectorValue
): CosineDistance;

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
export function cosineDistance(
  expr: ScalarExpr,
  other: ScalarExpr
): CosineDistance;
export function cosineDistance(
  expr: ScalarExpr | string,
  other: ScalarExpr | number[] | VectorValue
): CosineDistance {
  const expr1 = expr instanceof ScalarExpr ? expr : Field.of(expr);
  const expr2 = other instanceof ScalarExpr ? other : Constant.vector(other);
  return new CosineDistance(expr1, expr2);
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
export function dotProduct(expr: string, other: number[]): DotProduct;

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
export function dotProduct(expr: string, other: VectorValue): DotProduct;

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
export function dotProduct(expr: string, other: ScalarExpr): DotProduct;

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
export function dotProduct(expr: ScalarExpr, other: number[]): DotProduct;

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
export function dotProduct(expr: ScalarExpr, other: VectorValue): DotProduct;

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
export function dotProduct(expr: ScalarExpr, other: ScalarExpr): DotProduct;
export function dotProduct(
  expr: ScalarExpr | string,
  other: ScalarExpr | number[] | VectorValue
): DotProduct {
  const expr1 = expr instanceof ScalarExpr ? expr : Field.of(expr);
  const expr2 = other instanceof ScalarExpr ? other : Constant.vector(other);
  return new DotProduct(expr1, expr2);
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
export function euclideanDistance(
  expr: string,
  other: number[]
): EuclideanDistance;

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
): EuclideanDistance;

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
export function euclideanDistance(
  expr: string,
  other: ScalarExpr
): EuclideanDistance;

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
export function euclideanDistance(
  expr: ScalarExpr,
  other: number[]
): EuclideanDistance;

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
export function euclideanDistance(
  expr: ScalarExpr,
  other: VectorValue
): EuclideanDistance;

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
export function euclideanDistance(
  expr: ScalarExpr,
  other: ScalarExpr
): EuclideanDistance;
export function euclideanDistance(
  expr: ScalarExpr | string,
  other: ScalarExpr | number[] | VectorValue
): EuclideanDistance {
  const expr1 = expr instanceof ScalarExpr ? expr : Field.of(expr);
  const expr2 = other instanceof ScalarExpr ? other : Constant.vector(other);
  return new EuclideanDistance(expr1, expr2);
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
export function vectorLength(expr: ScalarExpr): VectorLength;

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
export function vectorLength(field: string): VectorLength;
export function vectorLength(expr: ScalarExpr | string): VectorLength {
  const normalizedExpr = typeof expr === 'string' ? Field.of(expr) : expr;
  return new VectorLength(normalizedExpr);
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
export function unixMicrosToTimestamp(expr: ScalarExpr): UnixMicrosToTimestamp;

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
export function unixMicrosToTimestamp(field: string): UnixMicrosToTimestamp;
export function unixMicrosToTimestamp(
  expr: ScalarExpr | string
): UnixMicrosToTimestamp {
  const normalizedExpr = typeof expr === 'string' ? Field.of(expr) : expr;
  return new UnixMicrosToTimestamp(normalizedExpr);
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
export function timestampToUnixMicros(expr: ScalarExpr): TimestampToUnixMicros;

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
export function timestampToUnixMicros(field: string): TimestampToUnixMicros;
export function timestampToUnixMicros(
  expr: ScalarExpr | string
): TimestampToUnixMicros {
  const normalizedExpr = typeof expr === 'string' ? Field.of(expr) : expr;
  return new TimestampToUnixMicros(normalizedExpr);
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
export function unixMillisToTimestamp(expr: ScalarExpr): UnixMillisToTimestamp;

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
export function unixMillisToTimestamp(field: string): UnixMillisToTimestamp;
export function unixMillisToTimestamp(
  expr: ScalarExpr | string
): UnixMillisToTimestamp {
  const normalizedExpr = typeof expr === 'string' ? Field.of(expr) : expr;
  return new UnixMillisToTimestamp(normalizedExpr);
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
export function timestampToUnixMillis(expr: ScalarExpr): TimestampToUnixMillis;

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
export function timestampToUnixMillis(field: string): TimestampToUnixMillis;
export function timestampToUnixMillis(
  expr: ScalarExpr | string
): TimestampToUnixMillis {
  const normalizedExpr = typeof expr === 'string' ? Field.of(expr) : expr;
  return new TimestampToUnixMillis(normalizedExpr);
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
export function unixSecondsToTimestamp(
  expr: ScalarExpr
): UnixSecondsToTimestamp;

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
export function unixSecondsToTimestamp(field: string): UnixSecondsToTimestamp;
export function unixSecondsToTimestamp(
  expr: ScalarExpr | string
): UnixSecondsToTimestamp {
  const normalizedExpr = typeof expr === 'string' ? Field.of(expr) : expr;
  return new UnixSecondsToTimestamp(normalizedExpr);
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
export function timestampToUnixSeconds(
  expr: ScalarExpr
): TimestampToUnixSeconds;

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
export function timestampToUnixSeconds(field: string): TimestampToUnixSeconds;
export function timestampToUnixSeconds(
  expr: ScalarExpr | string
): TimestampToUnixSeconds {
  const normalizedExpr = typeof expr === 'string' ? Field.of(expr) : expr;
  return new TimestampToUnixSeconds(normalizedExpr);
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
  timestamp: ScalarExpr,
  unit: ScalarExpr,
  amount: ScalarExpr
): TimestampAdd;

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
  timestamp: ScalarExpr,
  unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
  amount: number
): TimestampAdd;

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
): TimestampAdd;
export function timestampAdd(
  timestamp: ScalarExpr | string,
  unit:
    | ScalarExpr
    | 'microsecond'
    | 'millisecond'
    | 'second'
    | 'minute'
    | 'hour'
    | 'day',
  amount: ScalarExpr | number
): TimestampAdd {
  const normalizedTimestamp =
    typeof timestamp === 'string' ? Field.of(timestamp) : timestamp;
  const normalizedUnit =
    unit instanceof ScalarExpr ? unit : valueToDefaultExpr(unit);
  const normalizedAmount =
    typeof amount === 'number' ? Constant.of(amount) : amount;
  return new TimestampAdd(
    normalizedTimestamp,
    normalizedUnit,
    normalizedAmount
  );
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
  timestamp: ScalarExpr,
  unit: ScalarExpr,
  amount: ScalarExpr
): TimestampSub;

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
  timestamp: ScalarExpr,
  unit: 'microsecond' | 'millisecond' | 'second' | 'minute' | 'hour' | 'day',
  amount: number
): TimestampSub;

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
): TimestampSub;
export function timestampSub(
  timestamp: ScalarExpr | string,
  unit:
    | ScalarExpr
    | 'microsecond'
    | 'millisecond'
    | 'second'
    | 'minute'
    | 'hour'
    | 'day',
  amount: ScalarExpr | number
): TimestampSub {
  const normalizedTimestamp =
    typeof timestamp === 'string' ? Field.of(timestamp) : timestamp;
  const normalizedUnit =
    unit instanceof ScalarExpr ? unit : valueToDefaultExpr(unit);
  const normalizedAmount =
    typeof amount === 'number' ? Constant.of(amount) : amount;
  return new TimestampSub(
    normalizedTimestamp,
    normalizedUnit,
    normalizedAmount
  );
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
): FirestoreFunction {
  return new FirestoreFunction(functionName, params.map(valueToDefaultExpr));
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
): And {
  return new And([first, second, ...more]);
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
): Or {
  return new Or([first, second, ...more]);
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
export function ascending(expr: ScalarExpr): Ordering {
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
export function descending(expr: ScalarExpr): Ordering;
export function descending(fieldName: string): Ordering;
export function descending(field: ScalarExpr | string): Ordering {
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
    readonly expr: ScalarExpr,
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
