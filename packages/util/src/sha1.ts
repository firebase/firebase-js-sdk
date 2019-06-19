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
 * @fileoverview SHA-1 cryptographic hash.
 * Variable names follow the notation in FIPS PUB 180-3:
 * http://csrc.nist.gov/publications/fips/fips180-3/fips180-3_final.pdf.
 *
 * Usage:
 *   var sha1 = new sha1();
 *   sha1.update(bytes);
 *   var hash = sha1.digest();
 *
 * Performance:
 *   Chrome 23:   ~400 Mbit/s
 *   Firefox 16:  ~250 Mbit/s
 *
 */

/**
 * SHA-1 cryptographic hash constructor.
 *
 * The properties declared here are discussed in the above algorithm document.
 * @constructor
 * @final
 * @struct
 */
export class Sha1 {
  /**
   * Holds the previous values of accumulated variables a-e in the compress_
   * function.
   * @private
   */
  private chain_: number[] = [];

  /**
   * A buffer holding the partially computed hash result.
   * @private
   */
  private buf_: number[] = [];

  /**
   * An array of 80 bytes, each a part of the message to be hashed.  Referred to
   * as the message schedule in the docs.
   * @private
   */
  private W_: number[] = [];

  /**
   * Contains data needed to pad messages less than 64 bytes.
   * @private
   */
  private pad_: number[] = [];

  /**
   * @private {number}
   */
  private inbuf_: number = 0;

  /**
   * @private {number}
   */
  private total_: number = 0;

  blockSize: number;

  constructor() {
    this.blockSize = 512 / 8;

    this.pad_[0] = 128;
    for (let i = 1; i < this.blockSize; ++i) {
      this.pad_[i] = 0;
    }

    this.reset();
  }

  reset(): void {
    this.chain_[0] = 0x67452301;
    this.chain_[1] = 0xefcdab89;
    this.chain_[2] = 0x98badcfe;
    this.chain_[3] = 0x10325476;
    this.chain_[4] = 0xc3d2e1f0;

    this.inbuf_ = 0;
    this.total_ = 0;
  }

  /**
   * Internal compress helper function.
   * @param buf Block to compress.
   * @param offset Offset of the block in the buffer.
   * @private
   */
  compress_(buf: number[] | Uint8Array | string, offset?: number): void {
    if (!offset) {
      offset = 0;
    }

    const W = this.W_;

    // get 16 big endian words
    if (typeof buf === 'string') {
      for (let i = 0; i < 16; i++) {
        // TODO(user): [bug 8140122] Recent versions of Safari for Mac OS and iOS
        // have a bug that turns the post-increment ++ operator into pre-increment
        // during JIT compilation.  We have code that depends heavily on SHA-1 for
        // correctness and which is affected by this bug, so I've removed all uses
        // of post-increment ++ in which the result value is used.  We can revert
        // this change once the Safari bug
        // (https://bugs.webkit.org/show_bug.cgi?id=109036) has been fixed and
        // most clients have been updated.
        W[i] =
          (buf.charCodeAt(offset) << 24) |
          (buf.charCodeAt(offset + 1) << 16) |
          (buf.charCodeAt(offset + 2) << 8) |
          buf.charCodeAt(offset + 3);
        offset += 4;
      }
    } else {
      for (let i = 0; i < 16; i++) {
        W[i] =
          (buf[offset] << 24) |
          (buf[offset + 1] << 16) |
          (buf[offset + 2] << 8) |
          buf[offset + 3];
        offset += 4;
      }
    }

    // expand to 80 words
    for (let i = 16; i < 80; i++) {
      const t = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
      W[i] = ((t << 1) | (t >>> 31)) & 0xffffffff;
    }

    let a = this.chain_[0];
    let b = this.chain_[1];
    let c = this.chain_[2];
    let d = this.chain_[3];
    let e = this.chain_[4];
    let f, k;

    // TODO(user): Try to unroll this loop to speed up the computation.
    for (let i = 0; i < 80; i++) {
      if (i < 40) {
        if (i < 20) {
          f = d ^ (b & (c ^ d));
          k = 0x5a827999;
        } else {
          f = b ^ c ^ d;
          k = 0x6ed9eba1;
        }
      } else {
        if (i < 60) {
          f = (b & c) | (d & (b | c));
          k = 0x8f1bbcdc;
        } else {
          f = b ^ c ^ d;
          k = 0xca62c1d6;
        }
      }

      const t = (((a << 5) | (a >>> 27)) + f + e + k + W[i]) & 0xffffffff;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) & 0xffffffff;
      b = a;
      a = t;
    }

    this.chain_[0] = (this.chain_[0] + a) & 0xffffffff;
    this.chain_[1] = (this.chain_[1] + b) & 0xffffffff;
    this.chain_[2] = (this.chain_[2] + c) & 0xffffffff;
    this.chain_[3] = (this.chain_[3] + d) & 0xffffffff;
    this.chain_[4] = (this.chain_[4] + e) & 0xffffffff;
  }

  update(bytes?: number[] | Uint8Array | string, length?: number): void {
    // TODO(johnlenz): tighten the function signature and remove this check
    if (bytes == null) {
      return;
    }

    if (length === undefined) {
      length = bytes.length;
    }

    const lengthMinusBlock = length - this.blockSize;
    let n = 0;
    // Using local instead of member variables gives ~5% speedup on Firefox 16.
    const buf = this.buf_;
    let inbuf = this.inbuf_;

    // The outer while loop should execute at most twice.
    while (n < length) {
      // When we have no data in the block to top up, we can directly process the
      // input buffer (assuming it contains sufficient data). This gives ~25%
      // speedup on Chrome 23 and ~15% speedup on Firefox 16, but requires that
      // the data is provided in large chunks (or in multiples of 64 bytes).
      if (inbuf === 0) {
        while (n <= lengthMinusBlock) {
          this.compress_(bytes, n);
          n += this.blockSize;
        }
      }

      if (typeof bytes === 'string') {
        while (n < length) {
          buf[inbuf] = bytes.charCodeAt(n);
          ++inbuf;
          ++n;
          if (inbuf === this.blockSize) {
            this.compress_(buf);
            inbuf = 0;
            // Jump to the outer loop so we use the full-block optimization.
            break;
          }
        }
      } else {
        while (n < length) {
          buf[inbuf] = bytes[n];
          ++inbuf;
          ++n;
          if (inbuf === this.blockSize) {
            this.compress_(buf);
            inbuf = 0;
            // Jump to the outer loop so we use the full-block optimization.
            break;
          }
        }
      }
    }

    this.inbuf_ = inbuf;
    this.total_ += length;
  }

  /** @override */
  digest(): number[] {
    const digest: number[] = [];
    let totalBits = this.total_ * 8;

    // Add pad 0x80 0x00*.
    if (this.inbuf_ < 56) {
      this.update(this.pad_, 56 - this.inbuf_);
    } else {
      this.update(this.pad_, this.blockSize - (this.inbuf_ - 56));
    }

    // Add # bits.
    for (let i = this.blockSize - 1; i >= 56; i--) {
      this.buf_[i] = totalBits & 255;
      totalBits /= 256; // Don't use bit-shifting here!
    }

    this.compress_(this.buf_);

    let n = 0;
    for (let i = 0; i < 5; i++) {
      for (let j = 24; j >= 0; j -= 8) {
        digest[n] = (this.chain_[i] >> j) & 255;
        ++n;
      }
    }
    return digest;
  }
}
