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
 * @fileoverview Documentation for the metadata format
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
    nextPageToken: resource['pageToken']
  };
  var prefixLength = resource['prefixes'] ? resource['prefixes'].length : 0;
  for (var i = 0; i < prefixLength; i++) {
    let path = resource['prefixes'][i];
    let reference = authWrapper.makeStorageReference(
      new Location(authWrapper.bucket(), path)
    );
    listResult.prefixes.push(reference);
  }

  var itemLength = resource['items'] ? resource['items'].length : 0;
  for (var i = 0; i < itemLength; i++) {
    let path = resource['items'][i]['name'];
    let reference = authWrapper.makeStorageReference(
      new Location(authWrapper.bucket(), path)
    );
    listResult.items.push(reference);
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

const maxResultsKey = 'maxResults';
const pageTokenKey = 'pageToken';

export function listOptionsValidator(p: any) {
  let validType = p && type.isObject(p);
  if (!validType) {
    throw 'Expected ListOptions object.';
  }
  for (let key in p) {
    if (key === maxResultsKey) {
      if (p[maxResultsKey] && p[maxResultsKey] < 0) {
        throw 'Expected maxResults to be positive.';
      }
    } else if (key === pageTokenKey) {
      if (p[pageTokenKey] && !type.isString(p[pageTokenKey])) {
        throw 'Expected pageToken to be string.';
      }
    } else {
      throw 'Unknown option ' + key;
    }
  }
}
