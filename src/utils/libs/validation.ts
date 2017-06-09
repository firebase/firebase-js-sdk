import { isObject } from "./object";

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

export function validateCallback(fnName, argumentNumber, callback, optional) {
  if (optional && callback === undefined) return;
  if (typeof callback !== 'function')
    throw new Error(`${errorPrefix(fnName, argumentNumber, optional)} must be a valid function.`);
}

export function validateContextObject(fnName, argumentNumber, context, optional) {
  if (optional && context === undefined)
    return;
  if (!isObject(context) || context === null)
    throw new Error(errorPrefix(fnName, argumentNumber, optional) +
      'must be a valid context object.');
};

export function validateNamespace(fnName, argumentNumber, namespace, optional) {
  if (optional && namespace === undefined)
    return;
  if (typeof namespace !== 'string') {
    //TODO: I should do more validation here. We only allow certain chars in namespaces.
    throw new Error(errorPrefix(fnName, argumentNumber, optional) +
      'must be a valid firebase namespace.');
  }
};