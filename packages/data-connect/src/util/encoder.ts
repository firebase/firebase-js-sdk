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

export type HmacImpl = (obj: Record<string, unknown>) => string;
export let encoderImpl: HmacImpl;
export type DecodeHmacImpl = (s: string) => Record<string, unknown>;
export let decoderImpl: DecodeHmacImpl;
export function setEncoder(encoder: HmacImpl): void {
  encoderImpl = encoder;
}
export function setDecoder(decoder: DecodeHmacImpl): void {
  decoderImpl = decoder;
}
function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively sorts the keys of every plain object in `value` so that objects
 * which only differ in property order encode to the same string.
 *
 * Arrays keep their order, and non-plain objects (Date, Timestamp, class
 * instances) are returned as-is rather than rebuilt into `{}` - these feed
 * cache keys, so collapsing them would make distinct values look identical.
 *
 * The streaming transport canonicalizes request keys the same way; the two
 * have to agree or the query layer and the transport disagree on whether two
 * subscriptions are the same.
 */
export function sortKeysDeep(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const source = value as Record<string, unknown>;
  return Object.keys(source)
    .sort()
    .reduce(
      (accumulator, currentKey) => {
        accumulator[currentKey] = sortKeysDeep(source[currentKey]);
        return accumulator;
      },
      {} as Record<string, unknown>
    );
}
setEncoder((o: Record<string, unknown>) => JSON.stringify(sortKeysDeep(o)));
setDecoder(s => sortKeysDeep(JSON.parse(s)) as Record<string, unknown>);
