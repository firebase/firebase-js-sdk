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
goog.provide('fb.core.util.validation');

goog.require('fb.core.util');
goog.require('fb.core.util.Path');
goog.require('fb.core.util.ValidationPath');
goog.require('fb.util.obj');
goog.require('fb.util.utf8');
goog.require('fb.util.validation');


/**
 * Namespace of validation functions.
 */
fb.core.util.validation = {
  /**
   * True for invalid Firebase keys
   * @type {RegExp}
   * @private
   */
  INVALID_KEY_REGEX_: /[\[\].#$\/\u0000-\u001F\u007F]/,

  /**
   * True for invalid Firebase paths.
   * Allows '/' in paths.
   * @type {RegExp}
   * @private
   */
  INVALID_PATH_REGEX_: /[\[\].#$\u0000-\u001F\u007F]/,

  /**
   * Maximum number of characters to allow in leaf value
   * @type {number}
   * @private
   */
  MAX_LEAF_SIZE_: 10 * 1024 * 1024,


  /**
   * @param {*} key
   * @return {boolean}
   */
  isValidKey: function(key) {
    return goog.isString(key) && key.length !== 0 &&
        !fb.core.util.validation.INVALID_KEY_REGEX_.test(key);
  },

  /**
   * @param {string} pathString
   * @return {boolean}
   */
  isValidPathString: function(pathString) {
    return goog.isString(pathString) && pathString.length !== 0 &&
        !fb.core.util.validation.INVALID_PATH_REGEX_.test(pathString);
  },

  /**
   * @param {string} pathString
   * @return {boolean}
   */
  isValidRootPathString: function(pathString) {
    if (pathString) {
      // Allow '/.info/' at the beginning.
      pathString = pathString.replace(/^\/*\.info(\/|$)/, '/');
    }

    return fb.core.util.validation.isValidPathString(pathString);
  },

  /**
   * @param {*} priority
   * @return {boolean}
   */
  isValidPriority: function(priority) {
    return priority === null ||
        goog.isString(priority) ||
        (goog.isNumber(priority) && !fb.core.util.isInvalidJSONNumber(priority)) ||
        (goog.isObject(priority) && fb.util.obj.contains(priority, '.sv'));
  },

  /**
   * Pre-validate a datum passed as an argument to Firebase function.
   *
   * @param {string} fnName
   * @param {number} argumentNumber
   * @param {*} data
   * @param {!fb.core.util.Path} path
   * @param {boolean} optional
   */
  validateFirebaseDataArg: function(fnName, argumentNumber, data, path, optional) {
    if (optional && !goog.isDef(data))
      return;

    fb.core.util.validation.validateFirebaseData(
        fb.util.validation.errorPrefix(fnName, argumentNumber, optional),
        data, path
    );
  },

  /**
   * Validate a data object client-side before sending to server.
   *
   * @param {string} errorPrefix
   * @param {*} data
   * @param {!fb.core.util.Path|!fb.core.util.ValidationPath} path
   */
  validateFirebaseData: function(errorPrefix, data, path) {
    if (path instanceof fb.core.util.Path) {
      path = new fb.core.util.ValidationPath(path, errorPrefix);
    }

    if (!goog.isDef(data)) {
      throw new Error(errorPrefix + 'contains undefined ' + path.toErrorString());
    }
    if (goog.isFunction(data)) {
      throw new Error(errorPrefix + 'contains a function ' + path.toErrorString() +
                      ' with contents: ' + data.toString());
    }
    if (fb.core.util.isInvalidJSONNumber(data)) {
      throw new Error(errorPrefix + 'contains ' + data.toString() + ' ' + path.toErrorString());
    }

    // Check max leaf size, but try to avoid the utf8 conversion if we can.
    if (goog.isString(data) &&
        data.length > fb.core.util.validation.MAX_LEAF_SIZE_ / 3 &&
        fb.util.utf8.stringLength(data) > fb.core.util.validation.MAX_LEAF_SIZE_) {
      throw new Error(errorPrefix + 'contains a string greater than ' +
                      fb.core.util.validation.MAX_LEAF_SIZE_ +
                      ' utf8 bytes ' + path.toErrorString() +
                      " ('" + data.substring(0, 50) + "...')");
    }

    // TODO: Perf: Consider combining the recursive validation of keys into NodeFromJSON
    // to save extra walking of large objects.
    if (goog.isObject(data)) {
      var hasDotValue = false, hasActualChild = false;
      fb.util.obj.foreach(data, function(key, value) {
        if (key === '.value') {
          hasDotValue = true;
        }
        else if (key !== '.priority' && key !== '.sv') {
          hasActualChild = true;
          if (!fb.core.util.validation.isValidKey(key)) {
            throw new Error(errorPrefix + ' contains an invalid key (' + key + ') ' +
                            path.toErrorString() +
                            '.  Keys must be non-empty strings ' +
                            'and can\'t contain ".", "#", "$", "/", "[", or "]"');
          }
        }

        path.push(key);
        fb.core.util.validation.validateFirebaseData(errorPrefix, value, path);
        path.pop();
      });

      if (hasDotValue && hasActualChild) {
        throw new Error(errorPrefix + ' contains ".value" child ' +
                        path.toErrorString() +
                        ' in addition to actual children.');
      }
    }
  },

  /**
   * Pre-validate paths passed in the firebase function.
   *
   * @param {string} errorPrefix
   * @param {Array<!fb.core.util.Path>} mergePaths
   */
  validateFirebaseMergePaths: function(errorPrefix, mergePaths) {
    var i, curPath;
    for (i = 0; i < mergePaths.length; i++) {
      curPath = mergePaths[i];
      var keys = curPath.slice();
      for (var j = 0; j < keys.length; j++) {
        if (keys[j] === '.priority' && j === (keys.length - 1)) {
          // .priority is OK
        } else if (!fb.core.util.validation.isValidKey(keys[j])) {
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
    mergePaths.sort(fb.core.util.Path.comparePaths);
    var prevPath = null;
    for (i = 0; i < mergePaths.length; i++) {
      curPath = mergePaths[i];
      if (prevPath !== null && prevPath.contains(curPath)) {
        throw new Error(errorPrefix + 'contains a path ' + prevPath.toString() +
            ' that is ancestor of another path ' + curPath.toString());
      }
      prevPath = curPath;
    }
  },

  /**
   * pre-validate an object passed as an argument to firebase function (
   * must be an object - e.g. for firebase.update()).
   *
   * @param {string} fnName
   * @param {number} argumentNumber
   * @param {*} data
   * @param {!fb.core.util.Path} path
   * @param {boolean} optional
   */
  validateFirebaseMergeDataArg: function(fnName, argumentNumber, data, path, optional) {
    if (optional && !goog.isDef(data))
      return;

    var errorPrefix = fb.util.validation.errorPrefix(fnName, argumentNumber, optional);

    if (!goog.isObject(data) || goog.isArray(data)) {
      throw new Error(errorPrefix + ' must be an object containing the children to replace.');
    }

    var mergePaths = [];
    fb.util.obj.foreach(data, function(key, value) {
      var curPath = new fb.core.util.Path(key);
      fb.core.util.validation.validateFirebaseData(errorPrefix, value, path.child(curPath));
      if (curPath.getBack() === '.priority') {
        if (!fb.core.util.validation.isValidPriority(value)) {
          throw new Error(
              errorPrefix + 'contains an invalid value for \'' + curPath.toString() + '\', which must be a valid ' +
              'Firebase priority (a string, finite number, server value, or null).');
        }
      }
      mergePaths.push(curPath);
    });
    fb.core.util.validation.validateFirebaseMergePaths(errorPrefix, mergePaths);
  },

  validatePriority: function(fnName, argumentNumber, priority, optional) {
    if (optional && !goog.isDef(priority))
      return;
    if (fb.core.util.isInvalidJSONNumber(priority))
      throw new Error(
          fb.util.validation.errorPrefix(fnName, argumentNumber, optional) +
              'is ' + priority.toString() +
              ', but must be a valid Firebase priority (a string, finite number, ' +
              'server value, or null).');
    // Special case to allow importing data with a .sv.
    if (!fb.core.util.validation.isValidPriority(priority))
      throw new Error(
          fb.util.validation.errorPrefix(fnName, argumentNumber, optional) +
              'must be a valid Firebase priority ' +
              '(a string, finite number, server value, or null).');
  },

  validateEventType: function(fnName, argumentNumber, eventType, optional) {
    if (optional && !goog.isDef(eventType))
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
            fb.util.validation.errorPrefix(fnName, argumentNumber, optional) +
                'must be a valid event type: "value", "child_added", "child_removed", ' +
                '"child_changed", or "child_moved".');
    }
  },

  validateKey: function(fnName, argumentNumber, key, optional) {
    if (optional && !goog.isDef(key))
      return;
    if (!fb.core.util.validation.isValidKey(key))
      throw new Error(fb.util.validation.errorPrefix(fnName, argumentNumber, optional) +
                      'was an invalid key: "' + key +
                      '".  Firebase keys must be non-empty strings and ' +
                      'can\'t contain ".", "#", "$", "/", "[", or "]").');
  },

  validatePathString: function(fnName, argumentNumber, pathString, optional) {
    if (optional && !goog.isDef(pathString))
      return;

    if (!fb.core.util.validation.isValidPathString(pathString))
      throw new Error(fb.util.validation.errorPrefix(fnName, argumentNumber, optional) +
                      'was an invalid path: "' +
                      pathString +
                      '". Paths must be non-empty strings and ' +
                      'can\'t contain ".", "#", "$", "[", or "]"');
  },

  validateRootPathString: function(fnName, argumentNumber, pathString, optional) {
    if (pathString) {
      // Allow '/.info/' at the beginning.
      pathString = pathString.replace(/^\/*\.info(\/|$)/, '/');
    }

    fb.core.util.validation.validatePathString(fnName, argumentNumber, pathString, optional);
  },

  validateWritablePath: function(fnName, path) {
    if (path.getFront() === '.info') {
      throw new Error(fnName + ' failed: Can\'t modify data under /.info/');
    }
  },

  validateUrl: function(fnName, argumentNumber, parsedUrl) {
    // TODO: Validate server better.
    var pathString = parsedUrl.path.toString();
    if (!goog.isString(parsedUrl.repoInfo.host) || parsedUrl.repoInfo.host.length === 0 ||
        !fb.core.util.validation.isValidKey(parsedUrl.repoInfo.namespace) ||
        (pathString.length !== 0 && !fb.core.util.validation.isValidRootPathString(pathString))) {
      throw new Error(fb.util.validation.errorPrefix(fnName, argumentNumber, false) +
                      'must be a valid firebase URL and ' +
                      'the path can\'t contain ".", "#", "$", "[", or "]".');
    }
  },

  validateCredential: function(fnName, argumentNumber, cred, optional) {
    if (optional && !goog.isDef(cred))
      return;
    if (!goog.isString(cred))
      throw new Error(
          fb.util.validation.errorPrefix(fnName, argumentNumber, optional) +
              'must be a valid credential (a string).');
  },

  validateBoolean: function(fnName, argumentNumber, bool, optional) {
    if (optional && !goog.isDef(bool))
      return;
    if (!goog.isBoolean(bool))
      throw new Error(fb.util.validation.errorPrefix(fnName, argumentNumber, optional) +
                      'must be a boolean.');
  },

  validateString: function(fnName, argumentNumber, string, optional) {
    if (optional && !goog.isDef(string))
      return;
    if (!goog.isString(string)) {
      throw new Error(
          fb.util.validation.errorPrefix(fnName, argumentNumber, optional) +
              'must be a valid string.');
    }
  },

  validateObject: function(fnName, argumentNumber, obj, optional) {
    if (optional && !goog.isDef(obj))
      return;
    if (!goog.isObject(obj) || obj === null) {
      throw new Error(
          fb.util.validation.errorPrefix(fnName, argumentNumber, optional) +
              'must be a valid object.');
    }
  },

  validateObjectContainsKey: function(fnName, argumentNumber, obj, key, optional, opt_type) {
    var objectContainsKey = (goog.isObject(obj) && fb.util.obj.contains(obj, key));

    if (!objectContainsKey) {
      if (optional) {
        return;
      } else {
        throw new Error(
            fb.util.validation.errorPrefix(fnName, argumentNumber, optional) +
                'must contain the key "' + key + '"');
      }
    }

    if (opt_type) {
      var val = fb.util.obj.get(obj, key);
      if ((opt_type === 'number' && !goog.isNumber(val)) ||
          (opt_type === 'string' && !goog.isString(val)) ||
          (opt_type === 'boolean' && !goog.isBoolean(val)) ||
          (opt_type === 'function' && !goog.isFunction(val)) ||
          (opt_type === 'object' && !goog.isObject(val))) {
        if (optional) {
          throw new Error(fb.util.validation.errorPrefix(fnName, argumentNumber, optional) +
                        'contains invalid value for key "' + key + '" (must be of type "' + opt_type + '")');
        } else {
          throw new Error(fb.util.validation.errorPrefix(fnName, argumentNumber, optional) +
                        'must contain the key "' + key + '" with type "' + opt_type + '"');
        }
      }
    }
  }
}; // end fb.core.util.validation
