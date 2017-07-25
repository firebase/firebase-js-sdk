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
 * @fileoverview Documentation for the metadata format
 */
import { Metadata } from '../metadata';

import { AuthWrapper } from './authwrapper';
import * as json from './json';
import { Location } from './location';
import * as path from './path';
import * as type from './type';
import * as UrlUtils from './url';

export function noXform_(metadata: Metadata, value: any): any {
  return value;
}

/**
 * @struct
 */
export class Mapping {
  local: string;
  writable: boolean;
  xform: (p1: Metadata, p2: any) => any;

  constructor(
    public server: string,
    opt_local?: string | null,
    opt_writable?: boolean,
    opt_xform?: (p1: Metadata, p2: any) => any | null
  ) {
    this.local = opt_local || server;
    this.writable = !!opt_writable;
    this.xform = opt_xform || noXform_;
  }
}
type Mappings = Mapping[];

export { Mappings };

let mappings_: Mappings | null = null;

export function xformPath(fullPath: any): string {
  let valid = type.isString(fullPath);
  if (!valid || fullPath.length < 2) {
    return fullPath;
  } else {
    fullPath = fullPath as string;
    return path.lastComponent(fullPath);
  }
}

export function getMappings(): Mappings {
  if (mappings_) {
    return mappings_;
  }
  let mappings = [];
  mappings.push(new Mapping('bucket'));
  mappings.push(new Mapping('generation'));
  mappings.push(new Mapping('metageneration'));
  mappings.push(new Mapping('name', 'fullPath', true));

  function mappingsXformPath(metadata: Metadata, fullPath: any): string {
    return xformPath(fullPath);
  }
  let nameMapping = new Mapping('name');
  nameMapping.xform = mappingsXformPath;
  mappings.push(nameMapping);

  /**
   * Coerces the second param to a number, if it is defined.
   */
  function xformSize(metadata: Metadata, size: any): number | null | undefined {
    if (type.isDef(size)) {
      return +(size as number);
    } else {
      return size;
    }
  }
  let sizeMapping = new Mapping('size');
  sizeMapping.xform = xformSize;
  mappings.push(sizeMapping);
  mappings.push(new Mapping('timeCreated'));
  mappings.push(new Mapping('updated'));
  mappings.push(new Mapping('md5Hash', null, true));
  mappings.push(new Mapping('cacheControl', null, true));
  mappings.push(new Mapping('contentDisposition', null, true));
  mappings.push(new Mapping('contentEncoding', null, true));
  mappings.push(new Mapping('contentLanguage', null, true));
  mappings.push(new Mapping('contentType', null, true));
  mappings.push(new Mapping('metadata', 'customMetadata', true));

  /**
   * Transforms a comma-separated string of tokens into a list of download
   * URLs.
   */
  function xformTokens(metadata: Metadata, tokens: any): string[] {
    let valid = type.isString(tokens) && tokens.length > 0;
    if (!valid) {
      // This can happen if objects are uploaded through GCS and retrieved
      // through list, so we don't want to throw an Error.
      return [];
    }
    let encode = encodeURIComponent;
    let tokensList = tokens.split(',');
    let urls = tokensList.map(function(token: string) {
      let bucket: string = metadata['bucket'] as string;
      let path: string = metadata['fullPath'] as string;
      let urlPart = '/b/' + encode(bucket) + '/o/' + encode(path);
      let base = UrlUtils.makeDownloadUrl(urlPart);
      let queryString = UrlUtils.makeQueryString({
        alt: 'media',
        token: token
      });
      return base + queryString;
    });
    return urls;
  }
  mappings.push(
    new Mapping('downloadTokens', 'downloadURLs', false, xformTokens)
  );
  mappings_ = mappings;
  return mappings_;
}

export function addRef(metadata: Metadata, authWrapper: AuthWrapper) {
  function generateRef() {
    let bucket: string = metadata['bucket'] as string;
    let path: string = metadata['fullPath'] as string;
    let loc = new Location(bucket, path);
    return authWrapper.makeStorageReference(loc);
  }
  Object.defineProperty(metadata, 'ref', { get: generateRef });
}

export function fromResource(
  authWrapper: AuthWrapper,
  resource: { [name: string]: any },
  mappings: Mappings
): Metadata {
  let metadata: Metadata = {} as Metadata;
  metadata['type'] = 'file';
  let len = mappings.length;
  for (let i = 0; i < len; i++) {
    let mapping = mappings[i];
    metadata[mapping.local] = mapping.xform(metadata, resource[mapping.server]);
  }
  addRef(metadata, authWrapper);
  return metadata;
}

export function fromResourceString(
  authWrapper: AuthWrapper,
  resourceString: string,
  mappings: Mappings
): Metadata | null {
  let obj = json.jsonObjectOrNull(resourceString);
  if (obj === null) {
    return null;
  }
  let resource = obj as Metadata;
  return fromResource(authWrapper, resource, mappings);
}

export function toResourceString(
  metadata: Metadata,
  mappings: Mappings
): string {
  let resource: {
    [prop: string]: any;
  } = {};
  let len = mappings.length;
  for (let i = 0; i < len; i++) {
    let mapping = mappings[i];
    if (mapping.writable) {
      resource[mapping.server] = metadata[mapping.local];
    }
  }
  return JSON.stringify(resource);
}

export function metadataValidator(p: any) {
  let validType = p && type.isObject(p);
  if (!validType) {
    throw 'Expected Metadata object.';
  }
  for (let key in p) {
    let val = p[key];
    if (key === 'customMetadata') {
      if (!type.isObject(val)) {
        throw 'Expected object for \'customMetadata\' mapping.';
      }
    } else {
      if (type.isNonNullObject(val)) {
        throw "Mapping for '" + key + "' cannot be an object.";
      }
    }
  }
}
