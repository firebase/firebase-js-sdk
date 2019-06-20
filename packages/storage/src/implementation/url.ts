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

/**
 * @fileoverview Functions to create and manipulate URLs for the server API.
 */
import { DEFAULT_HOST } from './constants';
import { UrlParams } from './requestinfo';

export function makeUrl(urlPart: string): string {
  return `https://${DEFAULT_HOST}/v0${urlPart}`;
}

export function makeQueryString(params: UrlParams): string {
  const encode = encodeURIComponent;
  let queryPart = '?';
  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      // @ts-ignore TODO: remove once typescript is upgraded to 3.5.x
      const nextPart = encode(key) + '=' + encode(params[key]);
      queryPart = queryPart + nextPart + '&';
    }
  }

  // Chop off the extra '&' or '?' on the end
  queryPart = queryPart.slice(0, -1);
  return queryPart;
}
