/**
 * @license
 * Copyright 2019 Google Inc.
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

interface ListMetadataReource {
  name: string;
  bucket: string;
}

interface ListResultResource {
  prefixes: string[];
  items: ListMetadataReource[];
  nextPageToken?: string;
}

const maxResultsKey = 'maxResults';
const pageTokenKey = 'pageToken';
const prefixesKey = 'prefixes';
const itemsKey = 'items';

function fromResource(
  authWrapper: AuthWrapper,
  resource: ListResultResource
): ListResult {
  const listResult: ListResult = {
    prefixes: [],
    items: [],
    nextPageToken: resource['nextPageToken']
  };
  if (resource[prefixesKey]) {
    for (const path of resource[prefixesKey]) {
      const pathWithoutTrailingSlash = path.replace(/\/$/, '');
      const reference = authWrapper.makeStorageReference(
        new Location(authWrapper.bucket(), pathWithoutTrailingSlash)
      );
      listResult.prefixes.push(reference);
    }
  }

  if (resource[itemsKey]) {
    for (const item of resource[itemsKey]) {
      const reference = authWrapper.makeStorageReference(
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
  const obj = json.jsonObjectOrNull(resourceString);
  if (obj === null) {
    return null;
  }
  const resource = obj as ListResultResource;
  return fromResource(authWrapper, resource);
}

export function listOptionsValidator(p: any) {
  const validType = p && type.isObject(p);
  if (!validType) {
    throw 'Expected ListOptions object.';
  }
  for (const key in p) {
    if (key === maxResultsKey) {
      if (!type.isInteger(p[maxResultsKey]) || p[maxResultsKey] <= 0) {
        throw 'Expected maxResults to be positive number.';
      }
    } else if (key === pageTokenKey) {
      if (!type.isString(p[pageTokenKey])) {
        throw 'Expected pageToken to be string.';
      }
    } else {
      throw 'Unknown option: ' + key;
    }
  }
}
