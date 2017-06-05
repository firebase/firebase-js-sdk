/**
 * Returns true if data is NaN, or +/- Infinity.
 * @param {*} data
 * @return {boolean}
 */
export function isInvalidJSONNumber(data) {
  return typeof data === 'number' &&
    (data != data || // NaN
     data == Number.POSITIVE_INFINITY ||
     data == Number.NEGATIVE_INFINITY);
};

export function isNumber(val) {
  return typeof val === 'number';
}