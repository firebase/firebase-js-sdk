/**
 * @license
 * Copyright 2017 Google LLC
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

import { ResourcePath } from '../model/path';
import { fail, hardAssert } from '../util/assert';

/**
 * Helpers for dealing with resource paths stored in IndexedDB.
 *
 * Resource paths in their canonical string form do not sort as the server
 * sorts them. Specifically the server splits paths into segments first and then
 * sorts, putting end-of-segment before any character. In a UTF-8 string
 * encoding the slash ('/') that denotes the end-of-segment naturally comes
 * after other characters so the intent here is to encode the path delimiters in
 * such a way that the resulting strings sort naturally.
 *
 * Resource paths are also used for prefix scans so it's important to
 * distinguish whole segments from any longer segments of which they might be a
 * prefix. For example, it's important to make it possible to scan documents in
 * a collection "foo" without encountering documents in a collection "foobar".
 *
 * Separate from the concerns about resource path ordering and separation,
 * On Android, SQLite imposes additional restrictions since it does not handle
 * keys with embedded NUL bytes particularly well. Rather than change the
 * implementation we keep the encoding identical to keep the ports similar.
 *
 * Taken together this means resource paths when encoded for storage in
 * IndexedDB have the following characteristics:
 *
 *   * Segment separators ("/") sort before everything else.
 *   * All paths have a trailing separator.
 *   * NUL bytes do not exist in the output, since IndexedDB doesn't treat them
 * well.
 *
 * Therefore resource paths are encoded into string form using the following
 * rules:
 *
 *   * '\x01' is used as an escape character.
 *   * Path separators are encoded as "\x01\x01"
 *   * NUL bytes are encoded as "\x01\x10"
 *   * '\x01' is encoded as "\x01\x11"
 *
 * This encoding leaves some room between path separators and the NUL byte
 * just in case we decide to support integer document ids after all.
 *
 * Note that characters treated specially by the backend ('.', '/', and '~')
 * are not treated specially here. This class assumes that any unescaping of
 * resource path strings into actual ResourcePath objects will handle these
 * characters there.
 */
export type EncodedResourcePath = string;

const escapeChar = '\u0001';
const encodedSeparatorChar = '\u0001';
const encodedNul = '\u0010';
const encodedEscape = '\u0011';

/**
 * Encodes a resource path into a IndexedDb-compatible string form.
 */
export function encodeResourcePath(path: ResourcePath): EncodedResourcePath {
  let result = '';
  for (let i = 0; i < path.length; i++) {
    if (result.length > 0) {
      result = encodeSeparator(result);
    }
    result = encodeSegment(path.get(i), result);
  }
  return encodeSeparator(result);
}

/** Encodes a single segment of a resource path into the given result */
function encodeSegment(segment: string, resultBuf: string): string {
  let result = resultBuf;
  const length = segment.length;
  for (let i = 0; i < length; i++) {
    const c = segment.charAt(i);
    switch (c) {
      case '\0':
        result += escapeChar + encodedNul;
        break;
      case escapeChar:
        result += escapeChar + encodedEscape;
        break;
      default:
        result += c;
    }
  }
  return result;
}

/** Encodes a path separator into the given result */
function encodeSeparator(result: string): string {
  return result + escapeChar + encodedSeparatorChar;
}

/**
 * Decodes the given IndexedDb-compatible string form of a resource path into
 * a ResourcePath instance. Note that this method is not suitable for use with
 * decoding resource names from the server; those are One Platform format
 * strings.
 */
export function decodeResourcePath(path: EncodedResourcePath): ResourcePath {
  // Event the empty path must encode as a path of at least length 2. A path
  // with exactly 2 must be the empty path.
  const length = path.length;
  hardAssert(length >= 2, 'Invalid path ' + path);
  if (length === 2) {
    hardAssert(
      path.charAt(0) === escapeChar && path.charAt(1) === encodedSeparatorChar,
      'Non-empty path ' + path + ' had length 2'
    );
    return ResourcePath.emptyPath();
  }

  // Escape characters cannot exist past the second-to-last position in the
  // source value.
  const lastReasonableEscapeIndex = length - 2;

  const segments: string[] = [];
  let segmentBuilder = '';

  for (let start = 0; start < length; ) {
    // The last two characters of a valid encoded path must be a separator, so
    // there must be an end to this segment.
    const end = path.indexOf(escapeChar, start);
    if (end < 0 || end > lastReasonableEscapeIndex) {
      fail('Invalid encoded resource path: "' + path + '"');
    }

    const next = path.charAt(end + 1);
    switch (next) {
      case encodedSeparatorChar:
        const currentPiece = path.substring(start, end);
        let segment;
        if (segmentBuilder.length === 0) {
          // Avoid copying for the common case of a segment that excludes \0
          // and \001
          segment = currentPiece;
        } else {
          segmentBuilder += currentPiece;
          segment = segmentBuilder;
          segmentBuilder = '';
        }
        segments.push(segment);
        break;
      case encodedNul:
        segmentBuilder += path.substring(start, end);
        segmentBuilder += '\0';
        break;
      case encodedEscape:
        // The escape character can be used in the output to encode itself.
        segmentBuilder += path.substring(start, end + 1);
        break;
      default:
        fail('Invalid encoded resource path: "' + path + '"');
    }

    start = end + 2;
  }

  return new ResourcePath(segments);
}
