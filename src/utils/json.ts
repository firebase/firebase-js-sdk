/**
 * Evaluates a JSON string into a javascript object.
 *
 * @param {string} str A string containing JSON.
 * @return {*} The javascript object representing the specified JSON.
 */
export const jsonEval = function(str) {
  return JSON.parse(str);
};


/**
 * Returns JSON representing a javascript object.
 * @param {*} data Javascript object to be stringified.
 * @return {string} The JSON contents of the object.
 */
export const stringify = function(data) {
  return JSON.stringify(data);
};
