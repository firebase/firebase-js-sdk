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
 * Check to make sure the appropriate number of arguments are provided for a public function.
 * Throws an error if it fails.
 *
 * @param fnName The function name
 * @param minCount The minimum number of arguments to allow for the function call
 * @param maxCount The maximum number of argument to allow for the function call
 * @param argCount The actual number of arguments provided.
 */
export const validateArgCount = function(
  fnName: string,
  minCount: number,
  maxCount: number,
  argCount: number
): void {
  let argError;
  if (argCount < minCount) {
    argError = 'at least ' + minCount;
  } else if (argCount > maxCount) {
    argError = maxCount === 0 ? 'none' : 'no more than ' + maxCount;
  }
  if (argError) {
    const error =
      fnName +
      ' failed: Was called with ' +
      argCount +
      (argCount === 1 ? ' argument.' : ' arguments.') +
      ' Expects ' +
      argError +
      '.';
    throw new Error(error);
  }
};

/**
 * Generates a string to prefix an error message about failed argument validation
 *
 * @param fnName The function name
 * @param argumentNumber The index of the argument
 * @param optional Whether or not the argument is optional
 * @return The prefix to add to the error thrown for validation.
 */
export function errorPrefix(
  fnName: string,
  argumentNumber: number,
  optional: boolean
): string {
  let argName = '';
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
      throw new Error(
        'errorPrefix called with argumentNumber > 4.  Need to update it?'
      );
  }

  let error = fnName + ' failed: ';

  error += argName + ' argument ';
  return error;
}

/**
 * @param fnName
 * @param argumentNumber
 * @param namespace
 * @param optional
 */
export function validateNamespace(
  fnName: string,
  argumentNumber: number,
  namespace: string,
  optional: boolean
): void {
  if (optional && !namespace) {
    return;
  }
  if (typeof namespace !== 'string') {
    //TODO: I should do more validation here. We only allow certain chars in namespaces.
    throw new Error(
      errorPrefix(fnName, argumentNumber, optional) +
        'must be a valid firebase namespace.'
    );
  }
}

export function validateCallback(
  fnName: string,
  argumentNumber: number,
  callback: Function,
  optional: boolean
): void {
  if (optional && !callback) {
    return;
  }
  if (typeof callback !== 'function') {
    throw new Error(
      errorPrefix(fnName, argumentNumber, optional) +
        'must be a valid function.'
    );
  }
}

export function validateContextObject(
  fnName: string,
  argumentNumber: number,
  context: unknown,
  optional: boolean
): void {
  if (optional && !context) {
    return;
  }
  if (typeof context !== 'object' || context === null) {
    throw new Error(
      errorPrefix(fnName, argumentNumber, optional) +
        'must be a valid context object.'
    );
  }
}
