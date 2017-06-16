/**
 * Check to make sure the appropriate number of arguments are provided for a public function.
 * Throws an error if it fails.
 *
 * @param {!string} fnName The function name
 * @param {!number} minCount The minimum number of arguments to allow for the function call
 * @param {!number} maxCount The maximum number of argument to allow for the function call
 * @param {!number} argCount The actual number of arguments provided.
 */
export const validateArgCount = function(fnName, minCount, maxCount, argCount) {
  var argError;
  if (argCount < minCount) {
    argError = 'at least ' + minCount;
  } else if (argCount > maxCount) {
    argError = (maxCount === 0) ? 'none' : ('no more than ' + maxCount);
  }
  if (argError) {
    var error = fnName + ' failed: Was called with ' + argCount +
      ((argCount === 1) ? ' argument.' : ' arguments.') +
      ' Expects ' + argError + '.';
    throw new Error(error);
  }
};

/**
 * Generates a string to prefix an error message about failed argument validation
 *
 * @param {!string} fnName The function name
 * @param {!number} argumentNumber The index of the argument
 * @param {boolean} optional Whether or not the argument is optional
 * @return {!string} The prefix to add to the error thrown for validation.
 */
export const errorPrefix = function(fnName, argumentNumber, optional) {
  var argName = '';
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

  var error = fnName + ' failed: ';

  error += argName + ' argument ';
  return error;
};

/**
 * @param {!string} fnName
 * @param {!number} argumentNumber
 * @param {!string} namespace
 * @param {boolean} optional
 */
export const validateNamespace = function(fnName, argumentNumber, namespace, optional) {
  if (optional && !(namespace))
    return;
  if (typeof namespace !== 'string') {
    //TODO: I should do more validation here. We only allow certain chars in namespaces.
    throw new Error(errorPrefix(fnName, argumentNumber, optional) +
      'must be a valid firebase namespace.');
  }
};

export const validateCallback = function(fnName, argumentNumber, callback, optional) {
  if (optional && !(callback))
    return;
  if (typeof callback !== 'function')
    throw new Error(errorPrefix(fnName, argumentNumber, optional) + 'must be a valid function.');
};

export const validateContextObject = function(fnName, argumentNumber, context, optional) {
  if (optional && !(context))
    return;
  if (typeof context !== 'object' || context === null)
    throw new Error(errorPrefix(fnName, argumentNumber, optional) +
      'must be a valid context object.');
};
