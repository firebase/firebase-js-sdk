/**
 * @license
 * Copyright 2021 Google LLC
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

import { UpdateData } from './reference';

/**
 * These types primarily exist to support the `UpdateData`,
 * `WithFieldValue`, and `PartialWithFieldValue` types and are not consumed
 * directly by the end developer.
 */

/** Primitive types. */
export type Primitive = string | number | boolean | undefined | null;

/**
 * For each field (e.g. 'bar'), find all nested keys (e.g. {'bar.baz': T1,
 * 'bar.qux': T2}). Intersect them together to make a single map containing
 * all possible keys that are all marked as optional
 */
export type NestedUpdateFields<T extends Record<string, unknown>> =
  UnionToIntersection<
    {
      // Check that T[K] extends Record to only allow nesting for map values.
      [K in keyof T & string]: T[K] extends Record<string, unknown>
        ? // Recurse into the map and add the prefix in front of each key
          // (e.g. Prefix 'bar.' to create: 'bar.baz' and 'bar.qux'.
          AddPrefixToKeys<K, UpdateData<T[K]>>
        : // TypedUpdateData is always a map of values.
          never;
    }[keyof T & string] // Also include the generated prefix-string keys.
  >;

/**
 * Returns a new map where every key is prefixed with the outer key appended
 * to a dot.
 */
export type AddPrefixToKeys<
  Prefix extends string,
  T extends Record<string, unknown>
> =
  // Remap K => Prefix.K. See https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#key-remapping-via-as
  { [K in keyof T & string as `${Prefix}.${K}`]+?: T[K] };

/**
 * Given a union type `U = T1 | T2 | ...`, returns an intersected type
 * `(T1 & T2 & ...)`.
 *
 * Uses distributive conditional types and inference from conditional types.
 * This works because multiple candidates for the same type variable in
 * contra-variant positions causes an intersection type to be inferred.
 * https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-inference-in-conditional-types
 * https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type
 */
export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;
