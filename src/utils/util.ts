import { forEach } from "./obj";

/**
 * Returns a querystring-formatted string (e.g. &arg=val&arg2=val2) from a params
 * object (e.g. {arg: 'val', arg2: 'val2'})
 * Note: You must prepend it with ? when adding it to a URL.
 *
 * @param {!Object} querystringParams
 * @return {string}
 */
export const querystring = function(querystringParams) {
  var params = [];
  forEach(querystringParams, function(key, value) {
    if (Array.isArray(value)) {
      value.forEach(function(arrayVal) {
        params.push(encodeURIComponent(key) + '=' + encodeURIComponent(arrayVal));
      });
    } else {
      params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }
  });
  return (params.length) ? '&' + params.join('&') : '';
};


/**
 * Decodes a querystring (e.g. ?arg=val&arg2=val2) into a params object (e.g. {arg: 'val', arg2: 'val2'})
 *
 * @param {string} querystring
 * @return {!Object}
 */
export const querystringDecode = function(querystring) {
  var obj = {};
  var tokens = querystring.replace(/^\?/, '').split('&');

  tokens.forEach(function(token) {
    if (token) {
      var key = token.split('=');
      obj[key[0]] = key[1];
    }
  });
  return obj;
};