import { CONSTANTS } from "./constants";

/**
 * Throws an error if the provided assertion is falsy
 * @param {*} assertion The assertion to be tested for falsiness
 * @param {!string} message The message to display if the check fails
 */
export const assert = function(assertion, message) {
  if (!assertion) {
    throw assertionError(message);
  }
};

/**
 * Returns an Error object suitable for throwing.
 * @param {string} message
 * @return {!Error}
 */
export const assertionError = function(message) {
  return new Error('Firebase Database (' + CONSTANTS.SDK_VERSION + ') INTERNAL ASSERT FAILED: ' + message);
};
