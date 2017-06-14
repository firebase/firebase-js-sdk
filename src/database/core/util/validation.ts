import { Path, ValidationPath } from "./Path";
import { forEach, contains } from "../../../utils/obj";
import { isInvalidJSONNumber } from "./util";
import { errorPrefix as errorPrefixFxn } from "../../../utils/validation";
import { stringLength } from "../../../utils/utf8";

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
export const isValidKey = function(key) {
  return typeof key === 'string' && key.length !== 0 &&
      !INVALID_KEY_REGEX_.test(key);
}

/**
 * @param {string} pathString
 * @return {boolean}
 */
export const isValidPathString = function(pathString) {
  return typeof pathString === 'string' && pathString.length !== 0 &&
      !INVALID_PATH_REGEX_.test(pathString);
}

/**
 * @param {string} pathString
 * @return {boolean}
 */
export const isValidRootPathString = function(pathString) {
  if (pathString) {
    // Allow '/.info/' at the beginning.
    pathString = pathString.replace(/^\/*\.info(\/|$)/, '/');
  }

  return isValidPathString(pathString);
}

/**
 * @param {*} priority
 * @return {boolean}
 */
export const isValidPriority = function(priority) {
  return priority === null ||
      typeof priority === 'string' ||
      (typeof priority === 'number' && !isInvalidJSONNumber(priority)) ||
      ((priority && typeof priority === 'object') && contains(priority, '.sv'));
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
export const validateFirebaseDataArg = function(fnName, argumentNumber, data, path, optional) {
  if (optional && data === undefined)
    return;

  validateFirebaseData(
      errorPrefixFxn(fnName, argumentNumber, optional),
      data, path
  );
}

/**
 * Validate a data object client-side before sending to server.
 *
 * @param {string} errorPrefix
 * @param {*} data
 * @param {!Path|!ValidationPath} path
 */
export const validateFirebaseData = function(errorPrefix, data, path) {
  if (path instanceof Path) {
    path = new ValidationPath(path, errorPrefix);
  }

  if (data === undefined) {
    throw new Error(errorPrefix + 'contains undefined ' + path.toErrorString());
  }
  if (typeof data === 'function') {
    throw new Error(errorPrefix + 'contains a function ' + path.toErrorString() +
                    ' with contents = ' + data.toString());
  }
  if (isInvalidJSONNumber(data)) {
    throw new Error(errorPrefix + 'contains ' + data.toString() + ' ' + path.toErrorString());
  }

  // Check max leaf size, but try to avoid the utf8 conversion if we can.
  if (typeof data === 'string' &&
      data.length > MAX_LEAF_SIZE_ / 3 &&
      stringLength(data) > MAX_LEAF_SIZE_) {
    throw new Error(errorPrefix + 'contains a string greater than ' +
                    MAX_LEAF_SIZE_ +
                    ' utf8 bytes ' + path.toErrorString() +
                    " ('" + data.substring(0, 50) + "...')");
  }

  // TODO = Perf = Consider combining the recursive validation of keys into NodeFromJSON
  // to save extra walking of large objects.
  if ((data && typeof data === 'object')) {
    var hasDotValue = false, hasActualChild = false;
    forEach(data, function(key, value) {
      if (key === '.value') {
        hasDotValue = true;
      }
      else if (key !== '.priority' && key !== '.sv') {
        hasActualChild = true;
        if (!isValidKey(key)) {
          throw new Error(errorPrefix + ' contains an invalid key (' + key + ') ' +
                          path.toErrorString() +
                          '.  Keys must be non-empty strings ' +
                          'and can\'t contain ".", "#", "$", "/", "[", or "]"');
        }
      }

      path.push(key);
      validateFirebaseData(errorPrefix, value, path);
      path.pop();
    });

    if (hasDotValue && hasActualChild) {
      throw new Error(errorPrefix + ' contains ".value" child ' +
                      path.toErrorString() +
                      ' in addition to actual children.');
    }
  }
}

/**
 * Pre-validate paths passed in the firebase function.
 *
 * @param {string} errorPrefix
 * @param {Array<!Path>} mergePaths
 */
export const validateFirebaseMergePaths = function(errorPrefix, mergePaths) {
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
export const validateFirebaseMergeDataArg = function(fnName, argumentNumber, data, path, optional) {
  if (optional && data === undefined)
    return;

  var errorPrefix = errorPrefixFxn(fnName, argumentNumber, optional);

  if (!(data && typeof data === 'object') || Array.isArray(data)) {
    throw new Error(errorPrefix + ' must be an object containing the children to replace.');
  }

  var mergePaths = [];
  forEach(data, function(key, value) {
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

export const validatePriority = function(fnName, argumentNumber, priority, optional) {
  if (optional && priority === undefined)
    return;
  if (isInvalidJSONNumber(priority))
    throw new Error(
        errorPrefixFxn(fnName, argumentNumber, optional) +
            'is ' + priority.toString() +
            ', but must be a valid Firebase priority (a string, finite number, ' +
            'server value, or null).');
  // Special case to allow importing data with a .sv.
  if (!isValidPriority(priority))
    throw new Error(
        errorPrefixFxn(fnName, argumentNumber, optional) +
            'must be a valid Firebase priority ' +
            '(a string, finite number, server value, or null).');
}

export const validateEventType = function(fnName, argumentNumber, eventType, optional) {
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
          errorPrefixFxn(fnName, argumentNumber, optional) +
              'must be a valid event type = "value", "child_added", "child_removed", ' +
              '"child_changed", or "child_moved".');
  }
}

export const validateKey = function(fnName, argumentNumber, key, optional) {
  if (optional && key === undefined)
    return;
  if (!isValidKey(key))
    throw new Error(errorPrefixFxn(fnName, argumentNumber, optional) +
                    'was an invalid key = "' + key +
                    '".  Firebase keys must be non-empty strings and ' +
                    'can\'t contain ".", "#", "$", "/", "[", or "]").');
}

export const validatePathString = function(fnName, argumentNumber, pathString, optional) {
  if (optional && pathString === undefined)
    return;

  if (!isValidPathString(pathString))
    throw new Error(errorPrefixFxn(fnName, argumentNumber, optional) +
                    'was an invalid path = "' +
                    pathString +
                    '". Paths must be non-empty strings and ' +
                    'can\'t contain ".", "#", "$", "[", or "]"');
}

export const validateRootPathString = function(fnName, argumentNumber, pathString, optional) {
  if (pathString) {
    // Allow '/.info/' at the beginning.
    pathString = pathString.replace(/^\/*\.info(\/|$)/, '/');
  }

  validatePathString(fnName, argumentNumber, pathString, optional);
}

export const validateWritablePath = function(fnName, path) {
  if (path.getFront() === '.info') {
    throw new Error(fnName + ' failed = Can\'t modify data under /.info/');
  }
}

export const validateUrl = function(fnName, argumentNumber, parsedUrl) {
  // TODO = Validate server better.
  var pathString = parsedUrl.path.toString();
  if (!(typeof parsedUrl.repoInfo.host === 'string') || parsedUrl.repoInfo.host.length === 0 ||
      !isValidKey(parsedUrl.repoInfo.namespace) ||
      (pathString.length !== 0 && !isValidRootPathString(pathString))) {
    throw new Error(errorPrefixFxn(fnName, argumentNumber, false) +
                    'must be a valid firebase URL and ' +
                    'the path can\'t contain ".", "#", "$", "[", or "]".');
  }
}

export const validateCredential = function(fnName, argumentNumber, cred, optional) {
  if (optional && cred === undefined)
    return;
  if (!(typeof cred === 'string'))
    throw new Error(
        errorPrefixFxn(fnName, argumentNumber, optional) +
            'must be a valid credential (a string).');
}

export const validateBoolean = function(fnName, argumentNumber, bool, optional) {
  if (optional && bool === undefined)
    return;
  if (typeof bool !== 'boolean')
    throw new Error(errorPrefixFxn(fnName, argumentNumber, optional) +
                    'must be a boolean.');
}

export const validateString = function(fnName, argumentNumber, string, optional) {
  if (optional && string === undefined)
    return;
  if (!(typeof string === 'string')) {
    throw new Error(
        errorPrefixFxn(fnName, argumentNumber, optional) +
            'must be a valid string.');
  }
}

export const validateObject = function(fnName, argumentNumber, obj, optional) {
  if (optional && obj === undefined)
    return;
  if (!(obj && typeof obj === 'object') || obj === null) {
    throw new Error(
        errorPrefixFxn(fnName, argumentNumber, optional) +
            'must be a valid object.');
  }
}

export const validateObjectContainsKey = function(fnName, argumentNumber, obj, key, optional, opt_type) {
  var objectContainsKey = ((obj && typeof obj === 'object') && contains(obj, key));

  if (!objectContainsKey) {
    if (optional) {
      return;
    } else {
      throw new Error(
          errorPrefixFxn(fnName, argumentNumber, optional) +
              'must contain the key "' + key + '"');
    }
  }

  if (opt_type) {
    var val = obj[key];
    if ((opt_type === 'number' && !(typeof val === 'number')) ||
        (opt_type === 'string' && !(typeof val === 'string')) ||
        (opt_type === 'boolean' && !(typeof val === 'boolean')) ||
        (opt_type === 'function' && !(typeof val === 'function')) ||
        (opt_type === 'object' && !(typeof val === 'object') && val)) {
      if (optional) {
        throw new Error(errorPrefixFxn(fnName, argumentNumber, optional) +
                      'contains invalid value for key "' + key + '" (must be of type "' + opt_type + '")');
      } else {
        throw new Error(errorPrefixFxn(fnName, argumentNumber, optional) +
                      'must contain the key "' + key + '" with type "' + opt_type + '"');
      }
    }
  }
}
