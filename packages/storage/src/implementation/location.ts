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
 * @fileoverview Functionality related to the parsing/composition of bucket/
 * object location.
 */
import * as errorsExports from './error';
import { errors } from './error';

/**
 * @struct
 */
export class Location {
  private path_: string;

  constructor(public readonly bucket: string, path: string) {
    this.path_ = path;
  }

  get path(): string {
    return this.path_;
  }

  fullServerUrl(): string {
    let encode = encodeURIComponent;
    return '/b/' + encode(this.bucket) + '/o/' + encode(this.path);
  }

  bucketOnlyServerUrl(): string {
    let encode = encodeURIComponent;
    return '/b/' + encode(this.bucket) + '/o';
  }

  static makeFromBucketSpec(bucketString: string): Location {
    let bucketLocation;
    try {
      bucketLocation = Location.makeFromUrl(bucketString);
    } catch (e) {
      // Not valid URL, use as-is. This lets you put bare bucket names in
      // config.
      return new Location(bucketString, '');
    }
    if (bucketLocation.path === '') {
      return bucketLocation;
    } else {
      throw errorsExports.invalidDefaultBucket(bucketString);
    }
  }

  static makeFromUrl(url: string): Location {
    let location = null;
    let bucketDomain = '([A-Za-z0-9.\\-_]+)';

    function gsModify(loc: Location) {
      if (loc.path.charAt(loc.path.length - 1) === '/') {
        loc.path_ = loc.path_.slice(0, -1);
      }
    }
    let gsPath = '(/(.*))?$';
    let path = '(/([^?#]*).*)?$';
    let gsRegex = new RegExp('^gs://' + bucketDomain + gsPath, 'i');
    let gsIndices = { bucket: 1, path: 3 };

    function httpModify(loc: Location) {
      loc.path_ = decodeURIComponent(loc.path);
    }
    let version = 'v[A-Za-z0-9_]+';
    let httpRegex = new RegExp(
      '^https?://firebasestorage\\.googleapis\\.com/' +
        version +
        '/b/' +
        bucketDomain +
        '/o' +
        path,
      'i'
    );
    let httpIndices = { bucket: 1, path: 3 };
    let groups = [
      { regex: gsRegex, indices: gsIndices, postModify: gsModify },
      { regex: httpRegex, indices: httpIndices, postModify: httpModify }
    ];
    for (let i = 0; i < groups.length; i++) {
      let group = groups[i];
      let captures = group.regex.exec(url);
      if (captures) {
        let bucketValue = captures[group.indices.bucket];
        let pathValue = captures[group.indices.path];
        if (!pathValue) {
          pathValue = '';
        }
        location = new Location(bucketValue, pathValue);
        group.postModify(location);
        break;
      }
    }
    if (location == null) {
      throw errorsExports.invalidUrl(url);
    }
    return location;
  }
}
