/**
 * @license
 * Copyright 2017 Google LLC
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
 * Returns a querystring-formatted string (e.g. &arg=val&arg2=val2) from a
 * params object (e.g. {arg: 'val', arg2: 'val2'})
 * Note: You must prepend it with ? when adding it to a URL.
 */
export function querystring(querystringParams: {
  [key: string]: string | number;
}): string {
  const params = [];
  for (const [key, value] of Object.entries(querystringParams)) {
    if (Array.isArray(value)) {
      value.forEach(arrayVal => {
        params.push(
          encodeURIComponent(key) + '=' + encodeURIComponent(arrayVal)
        );
      });
    } else {
      params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }
  }
  return params.length ? '&' + params.join('&') : '';
}

/**
 * Decodes a querystring (e.g. ?arg=val&arg2=val2) into a params object
 * (e.g. {arg: 'val', arg2: 'val2'})
 */
export function querystringDecode(querystring: string): Record<string, string> {
  const obj: Record<string, string> = {};
  const tokens = querystring.replace(/^\?/, '').split('&');

  tokens.forEach(token => {
    if (token) {
      const [key, value] = token.split('=');
      obj[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  });
  return obj;
}

/**
 * Extract the query string part of a URL, including the leading question mark (if present).
 */
export function extractQuerystring(url: string): string {
  const queryStart = url.indexOf('?');
  if (!queryStart) {
    return '';
  }
  const fragmentStart = url.indexOf('#', queryStart);
  return url.substring(
    queryStart,
    fragmentStart > 0 ? fragmentStart : undefined
  );
}
