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

import {
  contains,
  errorPrefix as errorPrefixFxn,
  safeGet,
  stringLength
} from '@firebase/util';

import { RepoInfo } from '../RepoInfo';

import {
  Path,
  pathChild,
  pathCompare,
  pathContains,
  pathGetBack,
  pathGetFront,
  pathSlice,
  ValidationPath,
  validationPathPop,
  validationPathPush,
  validationPathToErrorString
} from './Path';
import { each, isInvalidJSONNumber } from './util';

/**
 * True for invalid Firebase keys
 */
export const INVALID_KEY_REGEX_ = /[\[\].#$\/\u0000-\u001F\u007F]/;

/**
 * True for invalid Firebase paths.
 * Allows '/' in paths.
 */
export const INVALID_PATH_REGEX_ = /[\[\].#$\u0000-\u001F\u007F]/;

/**
 * Maximum number of characters to allow in leaf value
 */
export const MAX_LEAF_SIZE_ = 10 * 1024 * 1024;

export const isValidKey = function (key: unknown): boolean {
  return (
    typeof key === 'string' && key.length !== 0 && !INVALID_KEY_REGEX_.test(key)
  );
};

export const isValidPathString = function (pathString: string): boolean {
  return (
    typeof pathString === 'string' &&
    pathString.length !== 0 &&
    !INVALID_PATH_REGEX_.test(pathString)
  );
};

export const isValidRootPathString = function (pathString: string): boolean {
  if (pathString) {
    // Allow '/.info/' at the beginning.
    pathString = pathString.replace(/^\/*\.info(\/|$)/, '/');
  }

  return isValidPathString(pathString);
};

export const isValidPriority = function (priority: unknown): boolean {
  return (
    priority === null ||
    typeof priority === 'string' ||
    (typeof priority === 'number' && !isInvalidJSONNumber(priority)) ||
    (priority &&
      typeof priority === 'object' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contains(priority as any, '.sv'))
  );
};

/**
 * Pre-validate a datum passed as an argument to Firebase function.
 */
export const validateFirebaseDataArg = function (
  fnName: string,
  value: unknown,
  path: Path,
  optional: boolean
) {
  if (optional && value === undefined) {
    return;
  }

  validateFirebaseData(errorPrefixFxn(fnName, 'value'), value, path);
};

/**
 * Validate a data object client-side before sending to server.
 */
export const validateFirebaseData = function (
  errorPrefix: string,
  data: unknown,
  path_: Path | ValidationPath
) {
  const path =
    path_ instanceof Path ? new ValidationPath(path_, errorPrefix) : path_;

  if (data === undefined) {
    throw new Error(
      errorPrefix + 'contains undefined ' + validationPathToErrorString(path)
    );
  }
  if (typeof data === 'function') {
    throw new Error(
      errorPrefix +
        'contains a function ' +
        validationPathToErrorString(path) +
        ' with contents = ' +
        data.toString()
    );
  }
  if (isInvalidJSONNumber(data)) {
    throw new Error(
      errorPrefix +
        'contains ' +
        data.toString() +
        ' ' +
        validationPathToErrorString(path)
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
        validationPathToErrorString(path) +
        " ('" +
        data.substring(0, 50) +
        "...')"
    );
  }

  // TODO = Perf = Consider combining the recursive validation of keys into NodeFromJSON
  // to save extra walking of large objects.
  if (data && typeof data === 'object') {
    let hasDotValue = false;
    let hasActualChild = false;
    each(data, (key: string, value: unknown) => {
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
              validationPathToErrorString(path) +
              '.  Keys must be non-empty strings ' +
              'and can\'t contain ".", "#", "$", "/", "[", or "]"'
          );
        }
      }

      validationPathPush(path, key);
      validateFirebaseData(errorPrefix, value, path);
      validationPathPop(path);
    });

    if (hasDotValue && hasActualChild) {
      throw new Error(
        errorPrefix +
          ' contains ".value" child ' +
          validationPathToErrorString(path) +
          ' in addition to actual children.'
      );
    }
  }
};

/**
 * Pre-validate paths passed in the firebase function.
 */
export const validateFirebaseMergePaths = function (
  errorPrefix: string,
  mergePaths: Path[]
) {
  let i, curPath: Path;
  for (i = 0; i < mergePaths.length; i++) {
    curPath = mergePaths[i];
    const keys = pathSlice(curPath);
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
  mergePaths.sort(pathCompare);
  let prevPath: Path | null = null;
  for (i = 0; i < mergePaths.length; i++) {
    curPath = mergePaths[i];
    if (prevPath !== null && pathContains(prevPath, curPath)) {
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
 */
export const validateFirebaseMergeDataArg = function (
  fnName: string,
  data: unknown,
  path: Path,
  optional: boolean
) {
  if (optional && data === undefined) {
    return;
  }

  const errorPrefix = errorPrefixFxn(fnName, 'values');

  if (!(data && typeof data === 'object') || Array.isArray(data)) {
    throw new Error(
      errorPrefix + ' must be an object containing the children to replace.'
    );
  }

  const mergePaths: Path[] = [];
  each(data, (key: string, value: unknown) => {
    const curPath = new Path(key);
    validateFirebaseData(errorPrefix, value, pathChild(path, curPath));
    if (pathGetBack(curPath) === '.priority') {
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

export const validatePriority = function (
  fnName: string,
  priority: unknown,
  optional: boolean
) {
  if (optional && priority === undefined) {
    return;
  }
  if (isInvalidJSONNumber(priority)) {
    throw new Error(
      errorPrefixFxn(fnName, 'priority') +
        'is ' +
        priority.toString() +
        ', but must be a valid Firebase priority (a string, finite number, ' +
        'server value, or null).'
    );
  }
  // Special case to allow importing data with a .sv.
  if (!isValidPriority(priority)) {
    throw new Error(
      errorPrefixFxn(fnName, 'priority') +
        'must be a valid Firebase priority ' +
        '(a string, finite number, server value, or null).'
    );
  }
};

export const validateKey = function (
  fnName: string,
  argumentName: string,
  key: string,
  optional: boolean
) {
  if (optional && key === undefined) {
    return;
  }
  if (!isValidKey(key)) {
    throw new Error(
      errorPrefixFxn(fnName, argumentName) +
        'was an invalid key = "' +
        key +
        '".  Firebase keys must be non-empty strings and ' +
        'can\'t contain ".", "#", "$", "/", "[", or "]").'
    );
  }
};

/**
 * @internal
 */
export const validatePathString = function (
  fnName: string,
  argumentName: string,
  pathString: string,
  optional: boolean
) {
  if (optional && pathString === undefined) {
    return;
  }

  if (!isValidPathString(pathString)) {
    throw new Error(
      errorPrefixFxn(fnName, argumentName) +
        'was an invalid path = "' +
        pathString +
        '". Paths must be non-empty strings and ' +
        'can\'t contain ".", "#", "$", "[", or "]"'
    );
  }
};

export const validateRootPathString = function (
  fnName: string,
  argumentName: string,
  pathString: string,
  optional: boolean
) {
  if (pathString) {
    // Allow '/.info/' at the beginning.
    pathString = pathString.replace(/^\/*\.info(\/|$)/, '/');
  }

  validatePathString(fnName, argumentName, pathString, optional);
};

/**
 * @internal
 */
export const validateWritablePath = function (fnName: string, path: Path) {
  if (pathGetFront(path) === '.info') {
    throw new Error(fnName + " failed = Can't modify data under /.info/");
  }
};

export const validateUrl = function (
  fnName: string,
  parsedUrl: { repoInfo: RepoInfo; path: Path }
) {
  // TODO = Validate server better.
  const pathString = parsedUrl.path.toString();
  if (
    !(typeof parsedUrl.repoInfo.host === 'string') ||
    parsedUrl.repoInfo.host.length === 0 ||
    (!isValidKey(parsedUrl.repoInfo.namespace) &&
      parsedUrl.repoInfo.host.split(':')[0] !== 'localhost') ||
    (pathString.length !== 0 && !isValidRootPathString(pathString))
  ) {
    throw new Error(
      errorPrefixFxn(fnName, 'url') +
        'must be a valid firebase URL and ' +
        'the path can\'t contain ".", "#", "$", "[", or "]".'
    );
  }
};

export const validateString = function (
  fnName: string,
  argumentName: string,
  string: unknown,
  optional: boolean
) {
  if (optional && string === undefined) {
    return;
  }
  if (!(typeof string === 'string')) {
    throw new Error(
      errorPrefixFxn(fnName, argumentName) + 'must be a valid string.'
    );
  }
};

export const validateObject = function (
  fnName: string,
  argumentName: string,
  obj: unknown,
  optional: boolean
) {
  if (optional && obj === undefined) {
    return;
  }
  if (!(obj && typeof obj === 'object') || obj === null) {
    throw new Error(
      errorPrefixFxn(fnName, argumentName) + 'must be a valid object.'
    );
  }
};

export const validateObjectContainsKey = function (
  fnName: string,
  argumentName: string,
  obj: unknown,
  key: string,
  optional: boolean,
  optType?: string
) {
  const objectContainsKey =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obj && typeof obj === 'object' && contains(obj as any, key);

  if (!objectContainsKey) {
    if (optional) {
      return;
    } else {
      throw new Error(
        errorPrefixFxn(fnName, argumentName) +
          'must contain the key "' +
          key +
          '"'
      );
    }
  }

  if (optType) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = safeGet(obj as any, key);
    if (
      (optType === 'number' && !(typeof val === 'number')) ||
      (optType === 'string' && !(typeof val === 'string')) ||
      (optType === 'boolean' && !(typeof val === 'boolean')) ||
      (optType === 'function' && !(typeof val === 'function')) ||
      (optType === 'object' && !(typeof val === 'object') && val)
    ) {
      if (optional) {
        throw new Error(
          errorPrefixFxn(fnName, argumentName) +
            'contains invalid value for key "' +
            key +
            '" (must be of type "' +
            optType +
            '")'
        );
      } else {
        throw new Error(
          errorPrefixFxn(fnName, argumentName) +
            'must contain the key "' +
            key +
            '" with type "' +
            optType +
            '"'
        );
      }
    }
  }
};
