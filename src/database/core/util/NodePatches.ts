declare const TARGET_ENVIRONMENT;

(function() {
  if (TARGET_ENVIRONMENT === 'node') {
    var version = process['version'];
    if (version === 'v0.10.22' || version === 'v0.10.23' || version === 'v0.10.24') {
      /**
       * The following duplicates much of `/lib/_stream_writable.js` at
       * b922b5e90d2c14dd332b95827c2533e083df7e55, applying the fix for
       * https://github.com/joyent/node/issues/6506. Note that this fix also
       * needs to be applied to `Duplex.prototype.write()` (in
       * `/lib/_stream_duplex.js`) as well.
       */
      var Writable = require('_stream_writable');

      Writable['prototype']['write'] = function(chunk, encoding, cb) {
        var state = this['_writableState'];
        var ret = false;

        if (typeof encoding === 'function') {
          cb = encoding;
          encoding = null;
        }

        if (Buffer['isBuffer'](chunk))
          encoding = 'buffer';
        else if (!encoding)
          encoding = state['defaultEncoding'];

        if (typeof cb !== 'function')
          cb = function() {};

        if (state['ended'])
          writeAfterEnd(this, state, cb);
        else if (validChunk(this, state, chunk, cb))
          ret = writeOrBuffer(this, state, chunk, encoding, cb);

        return ret;
      };

      function writeAfterEnd(stream, state, cb) {
        var er = new Error('write after end');
        // TODO: defer error events consistently everywhere, not just the cb
        stream['emit']('error', er);
        process['nextTick'](function() {
          cb(er);
        });
      }

      function validChunk(stream, state, chunk, cb) {
        var valid = true;
        if (!Buffer['isBuffer'](chunk) &&
            'string' !== typeof chunk &&
            chunk !== null &&
            chunk !== undefined &&
            !state['objectMode']) {
          var er = new TypeError('Invalid non-string/buffer chunk');
          stream['emit']('error', er);
          process['nextTick'](function() {
            cb(er);
          });
          valid = false;
        }
        return valid;
      }

      function writeOrBuffer(stream, state, chunk, encoding, cb) {
        chunk = decodeChunk(state, chunk, encoding);
        if (Buffer['isBuffer'](chunk))
          encoding = 'buffer';
        var len = state['objectMode'] ? 1 : chunk['length'];

        state['length'] += len;

        var ret = state['length'] < state['highWaterMark'];
        // we must ensure that previous needDrain will not be reset to false.
        if (!ret)
          state['needDrain'] = true;

        if (state['writing'])
          state['buffer']['push'](new WriteReq(chunk, encoding, cb));
        else
          doWrite(stream, state, len, chunk, encoding, cb);

        return ret;
      }

      function decodeChunk(state, chunk, encoding) {
        if (!state['objectMode'] &&
            state['decodeStrings'] !== false &&
            typeof chunk === 'string') {
          chunk = new Buffer(chunk, encoding);
        }
        return chunk;
      }

      /**
       * @constructor
       */
      function WriteReq(chunk, encoding, cb) {
        this['chunk'] = chunk;
        this['encoding'] = encoding;
        this['callback'] = cb;
      }

      function doWrite(stream, state, len, chunk, encoding, cb) {
        state['writelen'] = len;
        state['writecb'] = cb;
        state['writing'] = true;
        state['sync'] = true;
        stream['_write'](chunk, encoding, state['onwrite']);
        state['sync'] = false;
      }

      var Duplex = require('_stream_duplex');
      Duplex['prototype']['write'] = Writable['prototype']['write'];
    }
  }
})();
