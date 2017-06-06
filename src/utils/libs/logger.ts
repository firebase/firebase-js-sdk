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

import { isArrayLike } from "./array";
import { SessionStorage } from "./storage";
import { assert } from "./assert";

export interface LoggerFunction {
  (message:string): null | undefined | void;
}

let _logFunction: LoggerFunction;
let _firstLog = true;

function _getDefaultLogFunction(): LoggerFunction {
  let logFunc;
  if (typeof console !== 'undefined') {
    if (typeof console.log === 'function') {
      logFunc = console.log.bind(console);
    } else if (typeof console.log === 'object') {
      // IE does this.
      logFunc = message => console.log(message);
    }
  }
  return logFunc;
}

/**
 * @param {...*} var_args
 * @return {string}
 * @private
 */
function _buildLogMessage(...args) {
  let message = '';
  for (let i = 0; i < args.length; i++) {
    if (isArrayLike(args[i])) {
      message += _buildLogMessage.apply(null, args[i]);
    } else if (typeof args[i] === 'object') {
      message += JSON.stringify(args[i], null, 2);
    } else {
      message += args[i];
    }
    message += ' ';
  }
  return message;
};

export function log(...args) {
  if (_firstLog === true) {
    _firstLog = false;
    if (_logFunction === null && SessionStorage.get('logging_enabled') === true) {
      enableLogging(true);
    }
  }

  if (_logFunction) {
    var message = _buildLogMessage.apply(null, args);
    _logFunction(message);
  }
}

/**
 * @param {...*} args
 */
export function warn(...args) {
  if (typeof console !== 'undefined') {
    var message = 'FIREBASE WARNING: ' + _buildLogMessage.apply(null, args);
    if (typeof console.warn !== 'undefined') {
      console.warn(message);
    } else {
      console.log(message);
    }
  }
};

/**
 * @param {...string} args
 */
export function fatal(...args) {
  const message = _buildLogMessage.apply(null, args);
  throw new Error('FIREBASE FATAL ERROR: ' + message);
};

/**
 * The implementation of Firebase.enableLogging (defined here to break dependencies)
 * @param {boolean|?function(string)} logger A flag to turn on logging, or a custom logger
 * @param {boolean=} opt_persistent Whether or not to persist logging settings across refreshes
 */
export function enableLogging(logger: (boolean | LoggerFunction), 
                              persistLogs: boolean = false) {
  assert(!persistLogs || (logger === true || logger === false), "Can't turn on custom loggers persistently.");
  if (logger === true) {
    _logFunction = _getDefaultLogFunction();
    if (persistLogs)
      SessionStorage.set('logging_enabled', true);
  } else if (typeof logger === 'function') {
    _logFunction = logger;
  } else {
    _logFunction = null;
    SessionStorage.remove('logging_enabled');
  }
}