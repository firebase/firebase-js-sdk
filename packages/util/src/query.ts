/**
 * @license
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

import { forEach } from './obj';

/**
 * Returns a querystring-formatted string (e.g. &arg=val&arg2=val2) from a params
 * object (e.g. {arg: 'val', arg2: 'val2'})
 * Note: You must prepend it with ? when adding it to a URL.
 */
<<<<<<< HEAD
export const querystring = function<V>(querystringParams: {
  [key: string]: string;
}): string {
  const params: string[] = [];
  forEach(querystringParams, (key: string, value) => {
=======
export const querystring = function(querystringParams): string {
  const params: string[] = [];
  forEach(querystringParams, (key, value) => {
>>>>>>> 76539be9b3ab19f5be70275f2334bee9b022e3c4
    if (Array.isArray(value)) {
      value.forEach(arrayVal => {
        params.push(
          encodeURIComponent(key) + '=' + encodeURIComponent(arrayVal)
        );
      });
    } else {
      params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }
  });
  return params.length ? '&' + params.join('&') : '';
};

/**
 * Decodes a querystring (e.g. ?arg=val&arg2=val2) into a params object (e.g. {arg: 'val', arg2: 'val2'})
 *
 * @param {string} querystring
 * @return {!Object}
 */
<<<<<<< HEAD
export const querystringDecode = function(querystring: string): object {
  const obj: { [key: string]: unknown } = {};
=======
export const querystringDecode = function(querystring): object {
  const obj = {};
>>>>>>> 76539be9b3ab19f5be70275f2334bee9b022e3c4
  const tokens = querystring.replace(/^\?/, '').split('&');

  tokens.forEach(token => {
    if (token) {
      const key = token.split('=');
      obj[key[0]] = key[1];
    }
  });
  return obj;
};
