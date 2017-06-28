import { globalScope } from './globalScope';

const stringToByteArray = function(str) {
  var output = [], p = 0;
  for (var i = 0;i < str.length;i++) {
    var c = str.charCodeAt(i);
    while (c > 255) {
      output[p++] = c & 255;
      c >>= 8;
    }
    output[p++] = c;
  }
  return output;
};

/**
 * Turns an array of numbers into the string given by the concatenation of the
 * characters to which the numbers correspond.
 * @param {Array<number>} bytes Array of numbers representing characters.
 * @return {string} Stringification of the array.
 */
const byteArrayToString = function(bytes) {
  var CHUNK_SIZE = 8192;

  // Special-case the simple case for speed's sake.
  if (bytes.length < CHUNK_SIZE) {
    return String.fromCharCode.apply(null, bytes);
  }

  // The remaining logic splits conversion by chunks since
  // Function#apply() has a maximum parameter count.
  // See discussion: http://goo.gl/LrWmZ9

  var str = '';
  for (var i = 0; i < bytes.length; i += CHUNK_SIZE) {
    var chunk = bytes.slice(i, i + CHUNK_SIZE);
    str += String.fromCharCode.apply(null, chunk);
  }
  return str;
};

// Static lookup maps, lazily populated by init_()
export const base64 = {
  /**
   * Maps bytes to characters.
   * @type {Object}
   * @private
   */
  byteToCharMap_: null,
  
  /**
   * Maps characters to bytes.
   * @type {Object}
   * @private
   */
  charToByteMap_: null,

  /**
   * Maps bytes to websafe characters.
   * @type {Object}
   * @private
   */
  byteToCharMapWebSafe_: null,
  
  
  /**
   * Maps websafe characters to bytes.
   * @type {Object}
   * @private
   */
  charToByteMapWebSafe_: null,
  
  
  /**
   * Our default alphabet, shared between
   * ENCODED_VALS and ENCODED_VALS_WEBSAFE
   * @type {string}
   */
  ENCODED_VALS_BASE:
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
      'abcdefghijklmnopqrstuvwxyz' +
      '0123456789',

  /**
   * Our default alphabet. Value 64 (=) is special; it means "nothing."
   * @type {string}
   */
  get ENCODED_VALS() {
    return this.ENCODED_VALS_BASE + '+/=';
  },
  
  /**
   * Our websafe alphabet.
   * @type {string}
   */
  get ENCODED_VALS_WEBSAFE() {
    return this.ENCODED_VALS_BASE + '-_.'
  },
  
  /**
   * Whether this browser supports the atob and btoa functions. This extension
   * started at Mozilla but is now implemented by many browsers. We use the
   * ASSUME_* variables to avoid pulling in the full useragent detection library
   * but still allowing the standard per-browser compilations.
   *
   * @type {boolean}
   */
  HAS_NATIVE_SUPPORT: typeof globalScope.atob === 'function',
  
  /**
   * Base64-encode an array of bytes.
   *
   * @param {Array<number>|Uint8Array} input An array of bytes (numbers with
   *     value in [0, 255]) to encode.
   * @param {boolean=} opt_webSafe Boolean indicating we should use the
   *     alternative alphabet.
   * @return {string} The base64 encoded string.
   */
  encodeByteArray(input, opt_webSafe?) {
    if (!Array.isArray(input)) {
      throw Error('encodeByteArray takes an array as a parameter');
    }
  
    this.init_();
  
    var byteToCharMap = opt_webSafe ?
                        this.byteToCharMapWebSafe_ :
                        this.byteToCharMap_;
  
    var output = [];
  
    for (var i = 0; i < input.length; i += 3) {
      var byte1 = input[i];
      var haveByte2 = i + 1 < input.length;
      var byte2 = haveByte2 ? input[i + 1] : 0;
      var haveByte3 = i + 2 < input.length;
      var byte3 = haveByte3 ? input[i + 2] : 0;
  
      var outByte1 = byte1 >> 2;
      var outByte2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
      var outByte3 = ((byte2 & 0x0F) << 2) | (byte3 >> 6);
      var outByte4 = byte3 & 0x3F;
  
      if (!haveByte3) {
        outByte4 = 64;
  
        if (!haveByte2) {
          outByte3 = 64;
        }
      }
  
      output.push(byteToCharMap[outByte1],
                  byteToCharMap[outByte2],
                  byteToCharMap[outByte3],
                  byteToCharMap[outByte4]);
    }
  
    return output.join('');
  },
  
  
  /**
   * Base64-encode a string.
   *
   * @param {string} input A string to encode.
   * @param {boolean=} opt_webSafe If true, we should use the
   *     alternative alphabet.
   * @return {string} The base64 encoded string.
   */
  encodeString(input, opt_webSafe) {
    // Shortcut for Mozilla browsers that implement
    // a native base64 encoder in the form of "btoa/atob"
    if (this.HAS_NATIVE_SUPPORT && !opt_webSafe) {
      return btoa(input);
    }
    return this.encodeByteArray(
        stringToByteArray(input), opt_webSafe);
  },
  
  
  /**
   * Base64-decode a string.
   *
   * @param {string} input to decode.
   * @param {boolean=} opt_webSafe True if we should use the
   *     alternative alphabet.
   * @return {string} string representing the decoded value.
   */
  decodeString(input, opt_webSafe) {
    // Shortcut for Mozilla browsers that implement
    // a native base64 encoder in the form of "btoa/atob"
    if (this.HAS_NATIVE_SUPPORT && !opt_webSafe) {
      return atob(input);
    }
    return byteArrayToString(this.decodeStringToByteArray(input, opt_webSafe));
  },
  
  
  /**
   * Base64-decode a string.
   *
   * In base-64 decoding, groups of four characters are converted into three
   * bytes.  If the encoder did not apply padding, the input length may not
   * be a multiple of 4.
   *
   * In this case, the last group will have fewer than 4 characters, and
   * padding will be inferred.  If the group has one or two characters, it decodes
   * to one byte.  If the group has three characters, it decodes to two bytes.
   *
   * @param {string} input Input to decode.
   * @param {boolean=} opt_webSafe True if we should use the web-safe alphabet.
   * @return {!Array<number>} bytes representing the decoded value.
   */
  decodeStringToByteArray(input, opt_webSafe) {
    this.init_();
  
    var charToByteMap = opt_webSafe ?
                        this.charToByteMapWebSafe_ :
                        this.charToByteMap_;
  
    var output = [];
  
    for (var i = 0; i < input.length; ) {
      var byte1 = charToByteMap[input.charAt(i++)];
  
      var haveByte2 = i < input.length;
      var byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
      ++i;
  
      var haveByte3 = i < input.length;
      var byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
      ++i;
  
      var haveByte4 = i < input.length;
      var byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
      ++i;
  
      if (byte1 == null || byte2 == null ||
          byte3 == null || byte4 == null) {
        throw Error();
      }
  
      var outByte1 = (byte1 << 2) | (byte2 >> 4);
      output.push(outByte1);
  
      if (byte3 != 64) {
        var outByte2 = ((byte2 << 4) & 0xF0) | (byte3 >> 2);
        output.push(outByte2);
  
        if (byte4 != 64) {
          var outByte3 = ((byte3 << 6) & 0xC0) | byte4;
          output.push(outByte3);
        }
      }
    }
  
    return output;
  },
  
  
  /**
   * Lazy static initialization function. Called before
   * accessing any of the static map variables.
   * @private
   */
  init_() {
    if (!this.byteToCharMap_) {
      this.byteToCharMap_ = {};
      this.charToByteMap_ = {};
      this.byteToCharMapWebSafe_ = {};
      this.charToByteMapWebSafe_ = {};
  
      // We want quick mappings back and forth, so we precompute two maps.
      for (var i = 0; i < this.ENCODED_VALS.length; i++) {
        this.byteToCharMap_[i] =
            this.ENCODED_VALS.charAt(i);
        this.charToByteMap_[this.byteToCharMap_[i]] = i;
        this.byteToCharMapWebSafe_[i] =
            this.ENCODED_VALS_WEBSAFE.charAt(i);
        this.charToByteMapWebSafe_[
            this.byteToCharMapWebSafe_[i]] = i;
  
        // Be forgiving when decoding and correctly decode both encodings.
        if (i >= this.ENCODED_VALS_BASE.length) {
          this.charToByteMap_[
              this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
          this.charToByteMapWebSafe_[
              this.ENCODED_VALS.charAt(i)] = i;
        }
      }
    }
  }
};

 
 
 
 