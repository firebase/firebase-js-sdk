/**
* Copyright 2017 Google Inc.
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

/**
 * @return False if the object is undefined or null, true otherwise.
 */
export function isDef(p: any): boolean {
  return p != null;
}

export function isJustDef(p: any): boolean {
  return p !== void 0;
}

export function isFunction(p: any): boolean {
  return typeof p === 'function';
}

export function isObject(p: any): boolean {
  return typeof p === 'object';
}

export function isNonNullObject(p: any): boolean {
  return isObject(p) && p !== null;
}

export function isNonArrayObject(p: any): boolean {
  return isObject(p) && !Array.isArray(p);
}

export function isString(p: any): boolean {
  return typeof p === 'string' || p instanceof String;
}

export function isNumber(p: any): boolean {
  return typeof p === 'number' || p instanceof Number;
}

export function isNativeBlob(p: any): boolean {
  return isNativeBlobDefined() && p instanceof Blob;
}

export function isNativeBlobDefined(): boolean {
  return typeof Blob !== 'undefined';
}
