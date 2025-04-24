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

import { isPlainObject } from '../util/input_validation';

import { Code, FirestoreError } from './error';

/** A list of data types Firestore objects may serialize in their toJSON implemenetations. */
export type JsonTypeDesc = "string" | "number" | "boolean" | "null" | "undefined";

/** An association of JsonTypeDesc values to their native types. */
type TSType<T extends JsonTypeDesc> =
  T extends "string" ? string :
  T extends "number" ? number :
  T extends "boolean" ? boolean :
  T extends "null" ? null :
  T extends "undefined" ? undefined :
  never;

/** The representation of a JSON object property name and its type value. */
export interface Property<T extends JsonTypeDesc> {
  value?: TSType<T>;
  typeString: JsonTypeDesc;
};

/** A type Firestore data types may use to define the fields used in their JSON serialization. */
export interface JsonSchema {
  [key: string]: Property<JsonTypeDesc>;
};

/**  Associates the JSON property type to the native type and sets them to be Required. */
export type Json<T extends JsonSchema> = {
  [K in keyof T]: Required<T[K]>['value']
};

/** Helper function to define a JSON schema {@link Property} */
export function property<T extends JsonTypeDesc>(typeString: T, optionalValue?: TSType<T>): Property<T> {
  const result: Property<T> = {
    typeString
  };
  if (optionalValue) {
    result.value = optionalValue;
  }
  return result;
};

/** Validates the JSON object based on the provided schema, and narrows the type to the provided
 * JSON schaem.
 * 
 * @param json A JSON object to validate.
 * @param scheme a {@link JsonSchema} that defines the properties to validate.
 * @returns true if the JSON schema exists within the object. Throws a FirestoreError otherwise.
 */
export function validateJSON<S extends JsonSchema>(json: object, schema: S): json is Json<S> {
  if (!isPlainObject(json)) {
    throw new FirestoreError(Code.INVALID_ARGUMENT, "json must be an object");
  }
  let error: string | undefined = undefined;
  for (const key in schema) {
    if (schema[key]) {
      const typeString = schema[key].typeString;
      const value: { value: unknown } | undefined = ('value' in schema[key]) ? { value: schema[key].value } : undefined;
      if (!(key in json)) {
        error = `json missing required field: ${key}`;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fieldValue = (json as any)[key];
      if (typeString && ((typeof fieldValue) !== typeString)) {
        error = `json field '${key}' must be a ${typeString}.`;
        break;
      } else if ((value !== undefined) && fieldValue !== value.value) {
        error = `Expected '${key}' field to equal '${value.value}'`;
        break;
      }
    }
  }
  if (error) {
    throw new FirestoreError(Code.INVALID_ARGUMENT, error);
  }
  return true;
}