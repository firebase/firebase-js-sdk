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
import { Metadata } from '../metadata';

import { AuthWrapper } from './authwrapper';
import * as json from './json';
import { Location } from './location';
import * as path from './path';
import * as type from './type';
import * as UrlUtils from './url';
import { Reference } from '../reference';

export function noXform_<T>(metadata: Metadata, value: T): T {
  return value;
}

/**
 * @struct
 */
class Mapping<T> {
  local: string;
  writable: boolean;
  xform: (p1: Metadata, p2?: T) => T | undefined;

  constructor(
    public server: string,
    local?: string | null,
    writable?: boolean,
    xform?: ((p1: Metadata, p2?: T) => T | undefined) | null
  ) {
    this.local = local || server;
    this.writable = !!writable;
    this.xform = xform || noXform_;
  }
}
type Mappings = Array<Mapping<string> | Mapping<number>>;

export { Mappings };

let mappings_: Mappings | null = null;

export function xformPath(fullPath: string | undefined): string | undefined {
  if (!type.isString(fullPath) || fullPath.length < 2) {
    return fullPath;
  } else {
    return path.lastComponent(fullPath);
  }
}

export function getMappings(): Mappings {
  if (mappings_) {
    return mappings_;
  }
  const mappings: Mappings = [];
  mappings.push(new Mapping<string>('bucket'));
  mappings.push(new Mapping<string>('generation'));
  mappings.push(new Mapping<string>('metageneration'));
  mappings.push(new Mapping<string>('name', 'fullPath', true));

  function mappingsXformPath(
    _metadata: Metadata,
    fullPath: string | undefined
  ): string | undefined {
    return xformPath(fullPath);
  }
  const nameMapping = new Mapping<string>('name');
  nameMapping.xform = mappingsXformPath;
  mappings.push(nameMapping);

  /**
   * Coerces the second param to a number, if it is defined.
   */
  function xformSize(
    _metadata: Metadata,
    size: number | string | undefined
  ): number | undefined {
    if (type.isDef(size)) {
      return Number(size);
    } else {
      return size;
    }
  }
  const sizeMapping = new Mapping<number>('size');
  sizeMapping.xform = xformSize;
  mappings.push(sizeMapping);
  mappings.push(new Mapping<number>('timeCreated'));
  mappings.push(new Mapping<string>('updated'));
  mappings.push(new Mapping<string>('md5Hash', null, true));
  mappings.push(new Mapping<string>('cacheControl', null, true));
  mappings.push(new Mapping<string>('contentDisposition', null, true));
  mappings.push(new Mapping<string>('contentEncoding', null, true));
  mappings.push(new Mapping<string>('contentLanguage', null, true));
  mappings.push(new Mapping<string>('contentType', null, true));
  mappings.push(new Mapping<string>('metadata', 'customMetadata', true));
  mappings_ = mappings;
  return mappings_;
}

export function addRef(metadata: Metadata, authWrapper: AuthWrapper): void {
  function generateRef(): Reference {
    const bucket: string = metadata['bucket'] as string;
    const path: string = metadata['fullPath'] as string;
    const loc = new Location(bucket, path);
    return authWrapper.makeStorageReference(loc);
  }
  Object.defineProperty(metadata, 'ref', { get: generateRef });
}

export function fromResource(
  authWrapper: AuthWrapper,
  resource: { [name: string]: unknown },
  mappings: Mappings
): Metadata {
  const metadata: Metadata = {} as Metadata;
  metadata['type'] = 'file';
  const len = mappings.length;
  for (let i = 0; i < len; i++) {
    const mapping = mappings[i];
    metadata[mapping.local] = (mapping as Mapping<unknown>).xform(
      metadata,
      resource[mapping.server]
    );
  }
  addRef(metadata, authWrapper);
  return metadata;
}

export function fromResourceString(
  authWrapper: AuthWrapper,
  resourceString: string,
  mappings: Mappings
): Metadata | null {
  const obj = json.jsonObjectOrNull(resourceString);
  if (obj === null) {
    return null;
  }
  const resource = obj as Metadata;
  return fromResource(authWrapper, resource, mappings);
}

export function downloadUrlFromResourceString(
  metadata: Metadata,
  resourceString: string
): string | null {
  const obj = json.jsonObjectOrNull(resourceString);
  if (obj === null) {
    return null;
  }
  if (!type.isString(obj['downloadTokens'])) {
    // This can happen if objects are uploaded through GCS and retrieved
    // through list, so we don't want to throw an Error.
    return null;
  }
  const tokens: string = obj['downloadTokens'] as string;
  if (tokens.length === 0) {
    return null;
  }
  const encode = encodeURIComponent;
  const tokensList = tokens.split(',');
  const urls = tokensList.map(
    (token: string): string => {
      const bucket: string = metadata['bucket'] as string;
      const path: string = metadata['fullPath'] as string;
      const urlPart = '/b/' + encode(bucket) + '/o/' + encode(path);
      const base = UrlUtils.makeUrl(urlPart);
      const queryString = UrlUtils.makeQueryString({
        alt: 'media',
        token
      });
      return base + queryString;
    }
  );
  return urls[0];
}

export function toResourceString(
  metadata: Metadata,
  mappings: Mappings
): string {
  const resource: {
    [prop: string]: unknown;
  } = {};
  const len = mappings.length;
  for (let i = 0; i < len; i++) {
    const mapping = mappings[i];
    if (mapping.writable) {
      resource[mapping.server] = metadata[mapping.local];
    }
  }
  return JSON.stringify(resource);
}

export function metadataValidator(p: unknown): void {
  if (!type.isObject(p) || !p) {
    throw 'Expected Metadata object.';
  }
  for (const key in p) {
    if (p.hasOwnProperty(key)) {
      const val = p[key];
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
}
