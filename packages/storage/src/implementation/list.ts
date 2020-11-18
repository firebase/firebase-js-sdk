/**
 * @license
 * Copyright 2019 Google LLC
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
import { Location } from './location';
import * as json from './json';
import { ListResult } from '../list';
import { StorageService } from '../service';

/**
 * Represents the simplified object metadata returned by List API.
 * Other fields are filtered because list in Firebase Rules does not grant
 * the permission to read the metadata.
 */
interface ListMetadataResponse {
  name: string;
  bucket: string;
}

/**
 * Represents the JSON response of List API.
 */
interface ListResultResponse {
  prefixes: string[];
  items: ListMetadataResponse[];
  nextPageToken?: string;
}

const PREFIXES_KEY = 'prefixes';
const ITEMS_KEY = 'items';

function fromBackendResponse(
  service: StorageService,
  bucket: string,
  resource: ListResultResponse
): ListResult {
  const listResult: ListResult = {
    prefixes: [],
    items: [],
    nextPageToken: resource['nextPageToken']
  };
  if (resource[PREFIXES_KEY]) {
    for (const path of resource[PREFIXES_KEY]) {
      const pathWithoutTrailingSlash = path.replace(/\/$/, '');
      const reference = service.makeStorageReference(
        new Location(bucket, pathWithoutTrailingSlash)
      );
      listResult.prefixes.push(reference);
    }
  }

  if (resource[ITEMS_KEY]) {
    for (const item of resource[ITEMS_KEY]) {
      const reference = service.makeStorageReference(
        new Location(bucket, item['name'])
      );
      listResult.items.push(reference);
    }
  }
  return listResult;
}

export function fromResponseString(
  service: StorageService,
  bucket: string,
  resourceString: string
): ListResult | null {
  const obj = json.jsonObjectOrNull(resourceString);
  if (obj === null) {
    return null;
  }
  const resource = (obj as unknown) as ListResultResponse;
  return fromBackendResponse(service, bucket, resource);
}
