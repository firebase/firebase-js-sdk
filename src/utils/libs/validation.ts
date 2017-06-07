import { isInvalidJSONNumber, isNumber } from "./number";
import { stringLength } from "./utf8";
import { 
  contains, 
  foreach, 
  isObject 
} from "./object";
import { Path } from "../../database-ts/core/Path";
import { ValidationPath } from "../../database-ts/core/ValidationPath";

/**
 * True for invalid Firebase paths.
 * Allows '/' in paths.
 */
const INVALID_PATH_REGEX = /[\[\].#$\u0000-\u001F\u007F]/;

/**
 * True for invalid Firebase keys
 * @type {RegExp}
 * @private
 */
const INVALID_KEY_REGEX = /[\[\].#$\/\u0000-\u001F\u007F]/;

/**
 * Maximum number of characters to allow in leaf value
 * @type {number}
 */
const MAX_LEAF_SIZE = 10 * 1024 * 1024;

export function errorPrefix(fnName, argumentNumber, optional) {
  let argName;
  switch (argumentNumber) {
    case 1:
      argName = optional ? 'first' : 'First';
      break;
    case 2:
      argName = optional ? 'second' : 'Second';
      break;
    case 3:
      argName = optional ? 'third' : 'Third';
      break;
    case 4:
      argName = optional ? 'fourth' : 'Fourth';
      break;
    default:
      throw new Error('errorPrefix called with argumentNumber > 4.  Need to update it?');
  }

  return `${fnName} failed: ${argName} argument `;
}

export function validateArgCount(fnName, minCount, maxCount, argCount) {
  let argError;
  if (argCount < minCount) {
    argError = `at least ${minCount}`;
  } else if (argCount > maxCount) {
    argError = (maxCount === 0) ? 'none' : `no more than ${maxCount}`;
  }
  if (argError) {
    throw new Error(`${fnName} failed: Was called with ${argCount} argument${argCount > 1 ? 's' : ''}. Expects ${argError}.`);
  }
}

export function validateRootPathString(fnName, argumentNumber, pathString, optional) {
  if (pathString) {
    // Allow '/.info/' at the beginning.
    pathString = pathString.replace(/^\/*\.info(\/|$)/, '/');
  }
  
  validatePathString(fnName, argumentNumber, pathString, optional);
}

export function validatePathString(fnName, argumentNumber, pathString, optional) {
  if (optional && pathString === undefined) return;
  
  if (!isValidPathString(pathString))
    throw new Error(`${errorPrefix(fnName, argumentNumber, optional)} was an invalid path: "${pathString}". Paths must be non-empty strings and can't contain ".", "#", "$", "[", or "]"`);
}

export function isValidPathString(pathString) {
  return typeof pathString === 'string' && pathString.length && !INVALID_PATH_REGEX.test(pathString);
}

export function isValidRootPathString(pathString) {
  if (pathString) {
    // Allow '/.info/' at the beginning.
    pathString = pathString.replace(/^\/*\.info(\/|$)/, '/');
  }

  return isValidPathString(pathString);
}

export function validateWritablePath(fnName, path) {
  if (path.getFront() === '.info') {
    throw new Error(`${fnName} failed: Can't modify data under .info`);
  }
}

export function validateCallback(fnName, argumentNumber, callback, optional) {
  if (optional && callback === undefined) return;
  if (typeof callback !== 'function')
    throw new Error(`${errorPrefix(fnName, argumentNumber, optional)} must be a valid function.`);
}

/**
 * Pre-validate a datum passed as an argument to Firebase function.
 *
 * @param {string} fnName
 * @param {number} argumentNumber
 * @param {*} data
 * @param {!Path} path
 * @param {boolean} optional
 */
export function validateFirebaseDataArg(fnName, argumentNumber, data, path, optional) {
  if (optional && data === undefined)
    return;

  validateFirebaseData(errorPrefix(fnName, argumentNumber, optional),data, path);
}

/**
 * Validate a data object client-side before sending to server.
 *
 * @param {string} errorPrefix
 * @param {*} data
 * @param {!Path|!ValidationPath} path
 */
export function validateFirebaseData(errorPrefix, data, path) {
  if (path instanceof Path) {
    path = new ValidationPath(path, errorPrefix);
  }

  if (data === undefined) {
    throw new Error(errorPrefix + 'contains undefined ' + path.toErrorString());
  }
  if (typeof data === 'function') {
    throw new Error(errorPrefix + 'contains a function ' + path.toErrorString() +
                    ' with contents: ' + data.toString());
  }
  if (isInvalidJSONNumber(data)) {
    throw new Error(errorPrefix + 'contains ' + data.toString() + ' ' + path.toErrorString());
  }

  // Check max leaf size, but try to avoid the utf8 conversion if we can.
  if (typeof data === 'string' &&
      data.length > MAX_LEAF_SIZE / 3 &&
      stringLength(data) > MAX_LEAF_SIZE) {
    throw new Error(errorPrefix + 'contains a string greater than ' +
                    MAX_LEAF_SIZE +
                    ' utf8 bytes ' + path.toErrorString() +
                    " ('" + data.substring(0, 50) + "...')");
  }
}

/**
 * @param {*} priority
 * @return {boolean}
 */
export function isValidPriority(priority) {
  return priority === null || typeof priority === 'string' ||
      (isNumber(priority) && !isInvalidJSONNumber(priority)) ||
      (isObject(priority) && contains(priority, '.sv'));
}

export function validatePriority(fnName, argumentNumber, priority, optional) {
  if (optional && priority === undefined) return;
  if (isInvalidJSONNumber(priority))
    throw new Error(`${errorPrefix(fnName, argumentNumber, optional)} is ${priority.toString()} but must be a valid Firebase priority (a string, finite number, server value, or null).`);
  // Special case to allow importing data with a .sv.
  if (!isValidPriority(priority))
    throw new Error(`${errorPrefix(fnName, argumentNumber, optional)} must be a valid Firebase priority (a string, finite number, server value, or null).`);
}

export function validateBoolean(fnName, argumentNumber, bool, optional) {
  if (optional && bool === undefined) return;
  if (typeof bool !== 'boolean') 
    throw new Error(`${errorPrefix(fnName, argumentNumber, optional)} must be a boolean.`);
}

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
export function validateFirebaseMergeDataArg(fnName, argumentNumber, data, path, optional) {
  if (optional && data === undefined) return;

  var errorPrefix = errorPrefix(fnName, argumentNumber, optional);

  if (!isObject(data) || Array.isArray(data)) {
    throw new Error(`${errorPrefix} must be an object containing the children to replace.`);
  }

  var mergePaths = [];
  
  foreach(data, function(key, value) {
    var curPath = new Path(key);
    validateFirebaseData(errorPrefix, value, path.child(curPath));
    if (curPath.getBack() === '.priority') {
      if (!isValidPriority(value)) {
        throw new Error(
            errorPrefix + 'contains an invalid value for \'' + curPath.toString() + '\', which must be a valid ' +
            'Firebase priority (a string, finite number, server value, or null).');
      }
    }
    mergePaths.push(curPath);
  });
  validateFirebaseMergePaths(errorPrefix, mergePaths);
}

export function isValidKey(key) {
  return typeof key === 'string' && key.length && !INVALID_KEY_REGEX.test(key);
}

/**
 * Pre-validate paths passed in the firebase function.
 *
 * @param {string} errorPrefix
 * @param {Array<!fb.core.util.Path>} mergePaths
 */
export function validateFirebaseMergePaths(errorPrefix, mergePaths) {
  var i, curPath;
  for (i = 0; i < mergePaths.length; i++) {
    curPath = mergePaths[i];
    var keys = curPath.slice();
    for (var j = 0; j < keys.length; j++) {
      if (keys[j] === '.priority' && j === (keys.length - 1)) {
        // .priority is OK
      } else if (!isValidKey(keys[j])) {
        throw new Error(errorPrefix + 'contains an invalid key (' + keys[j] + ') in path ' +
            curPath.toString() +
            '. Keys must be non-empty strings ' +
            'and can\'t contain ".", "#", "$", "/", "[", or "]"');
      }
    }
  }

  // Check that update keys are not descendants of each other.
  // We rely on the property that sorting guarantees that ancestors come
  // right before descendants.
  mergePaths.sort(Path.comparePaths);
  var prevPath = null;
  for (i = 0; i < mergePaths.length; i++) {
    curPath = mergePaths[i];
    if (prevPath !== null && prevPath.contains(curPath)) {
      throw new Error(errorPrefix + 'contains a path ' + prevPath.toString() +
          ' that is ancestor of another path ' + curPath.toString());
    }
    prevPath = curPath;
  }
}

export function validateUrl(fnName, argumentNumber, parsedUrl) {
  // TODO: Validate server better.
  var pathString = parsedUrl.path.toString();
  if (typeof parsedUrl.repoInfo.host !== 'string' || parsedUrl.repoInfo.host.length === 0 ||
      !isValidKey(parsedUrl.repoInfo.namespace) ||
      (pathString.length !== 0 && !isValidRootPathString(pathString))) {
    throw new Error(errorPrefix(fnName, argumentNumber, false) +
                    'must be a valid firebase URL and ' +
                    'the path can\'t contain ".", "#", "$", "[", or "]".');
  }
}

export function validateKey(fnName, argumentNumber, key, optional) {
  if (optional && key === undefined) return;
  if (!isValidKey(key))
    throw new Error(errorPrefix(fnName, argumentNumber, optional) +
                    'was an invalid key: "' + key +
                    '".  Firebase keys must be non-empty strings and ' +
                    'can\'t contain ".", "#", "$", "/", "[", or "]").');
}

export function validateContextObject(fnName, argumentNumber, context, optional) {
  if (optional && context === undefined)
    return;
  if (!isObject(context) || context === null)
    throw new Error(errorPrefix(fnName, argumentNumber, optional) +
      'must be a valid context object.');
};

export function validateEventType(fnName, argumentNumber, eventType, optional) {
  if (optional && eventType === undefined)
    return;

  switch (eventType) {
    case 'value':
    case 'child_added':
    case 'child_removed':
    case 'child_changed':
    case 'child_moved':
      break;
    default:
      throw new Error(
          errorPrefix(fnName, argumentNumber, optional) +
              'must be a valid event type: "value", "child_added", "child_removed", ' +
              '"child_changed", or "child_moved".');
  }
}