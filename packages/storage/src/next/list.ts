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
import * as json from '../implementation/json';
import * as type from '../implementation/type';
import * as errors from '../implementation/error';
import { ListResult, ListOptions } from '../list';
import { ReferenceImplNext } from './reference';
import { LocationNext } from './location';
import { Reference } from '../reference';

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

const MAX_RESULTS_KEY = 'maxResults';
const MAX_MAX_RESULTS = 1000;
const PAGE_TOKEN_KEY = 'pageToken';
const PREFIXES_KEY = 'prefixes';
const ITEMS_KEY = 'items';

function fromBackendResponse(
    ref: ReferenceImplNext,
    resource: ListResultResponse
): ListResult {
    const listResult: ListResult = {
        prefixes: [],
        items: [],
        nextPageToken: resource['nextPageToken']
    };

    if (ref.location.bucket === null) {
        throw errors.noDefaultBucket();
    }
    if (resource[PREFIXES_KEY]) {
        for (const path of resource[PREFIXES_KEY]) {
            const pathWithoutTrailingSlash = path.replace(/\/$/, '');
            const reference = new ReferenceImplNext(
                ref.storage,
                new LocationNext(ref.location.bucket, pathWithoutTrailingSlash)
            );
            listResult.prefixes.push(reference as unknown as Reference);
        }
    }

    if (resource[ITEMS_KEY]) {
        for (const item of resource[ITEMS_KEY]) {
            const reference = new ReferenceImplNext(
                ref.storage,
                new LocationNext(ref.location.bucket, item['name'])
            );
            listResult.items.push(reference as unknown as Reference);
        }
    }
    return listResult;
}

export function fromResponseString(
    ref: ReferenceImplNext,
    resourceString: string
): ListResult | null {
    const obj = json.jsonObjectOrNull(resourceString);
    if (obj === null) {
        return null;
    }
    const resource = (obj as unknown) as ListResultResponse;
    return fromBackendResponse(ref, resource);
}

export function listOptionsValidator(p: unknown): void {
    if (!type.isObject(p) || !p) {
        throw 'Expected ListOptions object.';
    }
    for (const key in p) {
        if (key === MAX_RESULTS_KEY) {
            if (
                !type.isInteger(p[MAX_RESULTS_KEY]) ||
                (p[MAX_RESULTS_KEY] as number) <= 0
            ) {
                throw 'Expected maxResults to be a positive number.';
            }
            if ((p[MAX_RESULTS_KEY] as number) > 1000) {
                throw `Expected maxResults to be less than or equal to ${MAX_MAX_RESULTS}.`;
            }
        } else if (key === PAGE_TOKEN_KEY) {
            if (p[PAGE_TOKEN_KEY] && !type.isString(p[PAGE_TOKEN_KEY])) {
                throw 'Expected pageToken to be string.';
            }
        } else {
            throw 'Unknown option: ' + key;
        }
    }
}

