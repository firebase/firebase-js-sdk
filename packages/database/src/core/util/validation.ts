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

import { Path, ValidationPath } from './Path';
import { forEach, contains, safeGet } from '@firebase/util';
import { isInvalidJSONNumber } from './util';
import { errorPrefix as errorPrefixFxn } from '@firebase/util';
import { stringLength } from '@firebase/util';
import { RepoInfo } from '../RepoInfo';

/**
 * True for invalid Firebase keys
 * @type {RegExp}
 * @private
 */
export const INVALID_KEY_REGEX_ = /[\[\].#$\/\u0000-\u001F\u007F]/;

/**
 * True for invalid Firebase paths.
 * Allows '/' in paths.
 * @type {RegExp}
 * @private
 */
export const INVALID_PATH_REGEX_ = /[\[\].#$\u0000-\u001F\u007F]/;

/**
 * Maximum number of characters to allow in leaf value
 * @type {number}
 * @private
 */
export const MAX_LEAF_SIZE_ = 10 * 1024 * 1024;

/**
 * @param {*} key
 * @return {boolean}
 */
export const isValidKey = function(key: any): boolean {
  return (
    typeof key === 'string' && key.length !== 0 && !INVALID_KEY_REGEX_.test(key)
  );
};

/**
 * @param {string} pathString
 * @return {boolean}
 */
export const isValidPathString = function(pathString: string): boolean {
  return (
    typeof pathString === 'string' &&
    pathString.length !== 0 &&
    !INVALID_PATH_REGEX_.test(pathString)
  );
};

/**
 * @param {string} pathString
 * @return {boolean}
 */
export const isValidRootPathString = function(pathString: string): boolean {
  if (pathString) {
    // Allow '/.info/' at the beginning.
    pathString = pathString.replace(/^\/*\.info(\/|$)/, '/');
  }

  return isValidPathString(pathString);
};

/**
 * @param {*} priority
 * @return {boolean}
 */
export const isValidPriority = function(priority: any): boolean {
  return (
    priority === null ||
    typeof priority === 'string' ||
    (typeof priority === 'number' && !isInvalidJSONNumber(priority)) ||
    (priority && typeof priority === 'object' && contains(priority, '.sv'))
  );
};

/**
 * Pre-validate a datum passed as an argument to Firebase function.
 *
 * @param {string} fnName
 * @param {number} argumentNumber
 * @param {*} data
 * @param {!Path} path
 * @param {boolean} optional
 */
export const validateFirebaseDataArg = function(
  fnName: string,
  argumentNumber: number,
  data: any,
  path: Path,
  optional: boolean
) {
  if (optional && data === undefined) return;

  validateFirebaseData(
    errorPrefixFxn(fnName, argumentNumber, optional),
    data,
    path
  );
};

/**
 * Validate a data object client-side before sending to server.
 *
 * @param {string} errorPrefix
 * @param {*} data
 * @param {!Path|!ValidationPath} path_
 */
export const validateFirebaseData = function(
  errorPrefix: string,
  data: any,
  path_: Path | ValidationPath
) {
  const path =
    path_ instanceof Path ? new ValidationPath(path_, errorPrefix) : path_;

  if (data === undefined) {
    throw new Error(errorPrefix + 'contains undefined ' + path.toErrorString());
  }
  if (typeof data === 'function') {
    throw new Error(
      errorPrefix +
        'contains a function ' +
        path.toErrorString() +
        ' with contents = ' +
        data.toString()
    );
  }
  if (isInvalidJSONNumber(data)) {
    throw new Error(
      errorPrefix + 'contains ' + data.toString() + ' ' + path.toErrorString()
    );
  }

  // Check max leaf size, but try to avoid the utf8 conversion if we can.
  if (
    typeof data === 'string' &&
    data.length > MAX_LEAF_SIZE_ / 3 &&
    stringLength(data) > MAX_LEAF_SIZE_
  ) {
    throw new Error(
      errorPrefix +
        'contains a string greater than ' +
        MAX_LEAF_SIZE_ +
        ' utf8 bytes ' +
        path.toErrorString() +
        " ('" +
        data.substring(0, 50) +
        "...')"
    );
  }

  // TODO = Perf = Consider combining the recursive validation of keys into NodeFromJSON
  // to save extra walking of large objects.
  if (data && typeof data === 'object') {
    let hasDotValue = false,
      hasActualChild = false;
    forEach(data, function(key: string, value: any) {
      if (key === '.value') {
        hasDotValue = true;
      } else if (key !== '.priority' && key !== '.sv') {
        hasActualChild = true;
        if (!isValidKey(key)) {
          throw new Error(
            errorPrefix +
              ' contains an invalid key (' +
              key +
              ') ' +
              path.toErrorString() +
              '.  Keys must be non-empty strings ' +
              'and can\'t contain ".", "#", "$", "/", "[", or "]"'
          );
        }
      }

      path.push(key);
      validateFirebaseData(errorPrefix, value, path);
      path.pop();
    });

    if (hasDotValue && hasActualChild) {
      throw new Error(
        errorPrefix +
          ' contains ".value" child ' +
          path.toErrorString() +
          ' in addition to actual children.'
      );
    }
  }
};

/**
 * Pre-validate paths passed in the firebase function.
 *
 * @param {string} errorPrefix
 * @param {Array<!Path>} mergePaths
 */
export const validateFirebaseMergePaths = function(
  errorPrefix: string,
  mergePaths: Path[]
) {
  let i, curPath;
  for (i = 0; i < mergePaths.length; i++) {
    curPath = mergePaths[i];
    const keys = curPath.slice();
    for (let j = 0; j < keys.length; j++) {
      if (keys[j] === '.priority' && j === keys.length - 1) {
        // .priority is OK
      } else if (!isValidKey(keys[j])) {
        throw new Error(
          errorPrefix +
            'contains an invalid key (' +
            keys[j] +
            ') in path ' +
            curPath.toString() +
            '. Keys must be non-empty strings ' +
            'and can\'t contain ".", "#", "$", "/", "[", or "]"'
        );
      }
    }
  }

  // Check that update keys are not descendants of each other.
  // We rely on the property that sorting guarantees that ancestors come
  // right before descendants.
  mergePaths.sort(Path.comparePaths);
  let prevPath: Path | null = null;
  for (i = 0; i < mergePaths.length; i++) {
    curPath = mergePaths[i];
    if (prevPath !== null && prevPath.contains(curPath)) {
      throw new Error(
        errorPrefix +
          'contains a path ' +
          prevPath.toString() +
          ' that is ancestor of another path ' +
          curPath.toString()
      );
    }
    prevPath = curPath;
  }
};

/**
 * pre-validate an object passed as an argument to firebase function (
 * must be an object - e.g. for firebase.update()).
 *
 * @param {string} fnName
 * @param {number} argumentNumber
 * @param {*} data
 * @param {!Path} path
 * @param {boolean} optional
 */
export const validateFirebaseMergeDataArg = function(
  fnName: string,
  argumentNumber: number,
  data: any,
  path: Path,
  optional: boolean
) {
  if (optional && data === undefined) return;

  const errorPrefix = errorPrefixFxn(fnName, argumentNumber, optional);

  if (!(data && typeof data === 'object') || Array.isArray(data)) {
    throw new Error(
      errorPrefix + ' must be an object containing the children to replace.'
    );
  }

  const mergePaths: Path[] = [];
  forEach(data, function(key: string, value: any) {
    const curPath = new Path(key);
    validateFirebaseData(errorPrefix, value, path.child(curPath));
    if (curPath.getBack() === '.priority') {
      if (!isValidPriority(value)) {
        throw new Error(
          errorPrefix +
            "contains an invalid value for '" +
            curPath.toString() +
            "', which must be a valid " +
            'Firebase priority (a string, finite number, server value, or null).'
        );
      }
    }
    mergePaths.push(curPath);
  });
  validateFirebaseMergePaths(errorPrefix, mergePaths);
};

export const validatePriority = function(
  fnName: string,
  argumentNumber: number,
  priority: any,
  optional: boolean
) {
  if (optional && priority === undefined) return;
  if (isInvalidJSONNumber(priority))
    throw new Error(
      errorPrefixFxn(fnName, argumentNumber, optional) +
        'is ' +
        priority.toString() +
        ', but must be a valid Firebase priority (a string, finite number, ' +
        'server value, or null).'
    );
  // Special case to allow importing data with a .sv.
  if (!isValidPriority(priority))
    throw new Error(
      errorPrefixFxn(fnName, argumentNumber, optional) +
        'must be a valid Firebase priority ' +
        '(a string, finite number, server value, or null).'
    );
};

export const validateEventType = function(
  fnName: string,
  argumentNumber: number,
  eventType: string,
  optional: boolean
) {
  if (optional && eventType === undefined) return;

  switch (eventType) {
    case 'value':
    case 'child_added':
    case 'child_removed':
    case 'child_changed':
    case 'child_moved':
      break;
    default:
      throw new Error(
        errorPrefixFxn(fnName, argumentNumber, optional) +
          'must be a valid event type = "value", "child_added", "child_removed", ' +
          '"child_changed", or "child_moved".'
      );
  }
};

export const validateKey = function(
  fnName: string,
  argumentNumber: number,
  key: string,
  optional: boolean
) {
  if (optional && key === undefined) return;
  if (!isValidKey(key))
    throw new Error(
      errorPrefixFxn(fnName, argumentNumber, optional) +
        'was an invalid key = "' +
        key +
        '".  Firebase keys must be non-empty strings and ' +
        'can\'t contain ".", "#", "$", "/", "[", or "]").'
    );
};

export const validatePathString = function(
  fnName: string,
  argumentNumber: number,
  pathString: string,
  optional: boolean
) {
  if (optional && pathString === undefined) return;

  if (!isValidPathString(pathString))
    throw new Error(
      errorPrefixFxn(fnName, argumentNumber, optional) +
        'was an invalid path = "' +
        pathString +
        '". Paths must be non-empty strings and ' +
        'can\'t contain ".", "#", "$", "[", or "]"'
    );
};

export const validateRootPathString = function(
  fnName: string,
  argumentNumber: number,
  pathString: string,
  optional: boolean
) {
  if (pathString) {
    // Allow '/.info/' at the beginning.
    pathString = pathString.replace(/^\/*\.info(\/|$)/, '/');
  }

  validatePathString(fnName, argumentNumber, pathString, optional);
};

export const validateWritablePath = function(fnName: string, path: Path) {
  if (path.getFront() === '.info') {
    throw new Error(fnName + " failed = Can't modify data under /.info/");
  }
};

export const validateUrl = function(
  fnName: string,
  argumentNumber: number,
  parsedUrl: { repoInfo: RepoInfo; path: Path }
) {
  // TODO = Validate server better.
  const pathString = parsedUrl.path.toString();
  if (
    !(typeof parsedUrl.repoInfo.host === 'string') ||
    parsedUrl.repoInfo.host.length === 0 ||
    !isValidKey(parsedUrl.repoInfo.namespace) ||
    (pathString.length !== 0 && !isValidRootPathString(pathString))
  ) {
    throw new Error(
      errorPrefixFxn(fnName, argumentNumber, false) +
        'must be a valid firebase URL and ' +
        'the path can\'t contain ".", "#", "$", "[", or "]".'
    );
  }
};

export const validateCredential = function(
  fnName: string,
  argumentNumber: number,
  cred: any,
  optional: boolean
) {
  if (optional && cred === undefined) return;
  if (!(typeof cred === 'string'))
    throw new Error(
      errorPrefixFxn(fnName, argumentNumber, optional) +
        'must be a valid credential (a string).'
    );
};

export const validateBoolean = function(
  fnName: string,
  argumentNumber: number,
  bool: any,
  optional: boolean
) {
  if (optional && bool === undefined) return;
  if (typeof bool !== 'boolean')
    throw new Error(
      errorPrefixFxn(fnName, argumentNumber, optional) + 'must be a boolean.'
    );
};

export const validateString = function(
  fnName: string,
  argumentNumber: number,
  string: any,
  optional: boolean
) {
  if (optional && string === undefined) return;
  if (!(typeof string === 'string')) {
    throw new Error(
      errorPrefixFxn(fnName, argumentNumber, optional) +
        'must be a valid string.'
    );
  }
};

export const validateObject = function(
  fnName: string,
  argumentNumber: number,
  obj: any,
  optional: boolean
) {
  if (optional && obj === undefined) return;
  if (!(obj && typeof obj === 'object') || obj === null) {
    throw new Error(
      errorPrefixFxn(fnName, argumentNumber, optional) +
        'must be a valid object.'
    );
  }
};

export const validateObjectContainsKey = function(
  fnName: string,
  argumentNumber: number,
  obj: any,
  key: string,
  optional: boolean,
  opt_type?: string
) {
  const objectContainsKey =
    obj && typeof obj === 'object' && contains(obj, key);

  if (!objectContainsKey) {
    if (optional) {
      return;
    } else {
      throw new Error(
        errorPrefixFxn(fnName, argumentNumber, optional) +
          'must contain the key "' +
          key +
          '"'
      );
    }
  }

  if (opt_type) {
    const val = safeGet(obj, key);
    if (
      (opt_type === 'number' && !(typeof val === 'number')) ||
      (opt_type === 'string' && !(typeof val === 'string')) ||
      (opt_type === 'boolean' && !(typeof val === 'boolean')) ||
      (opt_type === 'function' && !(typeof val === 'function')) ||
      (opt_type === 'object' && !(typeof val === 'object') && val)
    ) {
      if (optional) {
        throw new Error(
          errorPrefixFxn(fnName, argumentNumber, optional) +
            'contains invalid value for key "' +
            key +
            '" (must be of type "' +
            opt_type +
            '")'
        );
      } else {
        throw new Error(
          errorPrefixFxn(fnName, argumentNumber, optional) +
            'must contain the key "' +
            key +
            '" with type "' +
            opt_type +
            '"'
        );
      }
    }
  }
};
