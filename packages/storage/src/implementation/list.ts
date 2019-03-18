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
 * @fileoverview Documentation for the listOptions and listResult format
 */
import { AuthWrapper } from './authwrapper';
import { Location } from './location';
import * as json from './json';
import * as type from './type';
import { ListResult } from '../list';

export function fromResource(
  authWrapper: AuthWrapper,
  resource: { [name: string]: any }
): ListResult {
  let listResult: ListResult = {
    prefixes: [],
    items: [],
    nextPageToken: resource['nextPageToken']
  };
  const prefixesKey = 'prefixes';
  if (resource[prefixesKey]) {
    for (let path of resource[prefixesKey]) {
      let reference = authWrapper.makeStorageReference(
        new Location(authWrapper.bucket(), path.replace(/\/$/, ''))
      );
      listResult.prefixes.push(reference);
    }
  }

  const itemsKey = 'items';
  if (resource[itemsKey]) {
    for (let item of resource[itemsKey]) {
      let reference = authWrapper.makeStorageReference(
        new Location(authWrapper.bucket(), item['name'])
      );
      listResult.items.push(reference);
    }
  }
  return listResult;
}

export function fromResourceString(
  authWrapper: AuthWrapper,
  resourceString: string
): ListResult | null {
  let obj = json.jsonObjectOrNull(resourceString);
  if (obj === null) {
    return null;
  }
  let resource = obj as ListResult;
  return fromResource(authWrapper, resource);
}

export function listOptionsValidator(p: any) {
  const validType = p && type.isObject(p);
  if (!validType) {
    throw 'Expected ListOptions object.';
  }
  const maxResultsKey = 'maxResults';
  const pageTokenKey = 'pageToken';
  for (let key in p) {
    if (key === maxResultsKey) {
      if (!type.isInteger(p[maxResultsKey]) || p[maxResultsKey] <= 0) {
        throw 'Expected maxResults to be positive.';
      }
    } else if (key === pageTokenKey) {
      if (!type.isString(p[pageTokenKey])) {
        throw 'Expected pageToken to be string.';
      }
    } else {
      throw 'Unknown option ' + key;
    }
  }
}
