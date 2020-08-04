/**
 * @license
 * Copyright 2019 Google LLC
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

import { assert } from 'chai';
import {
  isValidAppIdFormat,
  isValidApiKeyFormat
} from '../util/precondition-checks';

describe('precondition checks', () => {
  it('returns true if App ID is valid', () => {
    assert.isTrue(isValidAppIdFormat('1:123456789:android:abcdef'));
    assert.isTrue(
      isValidAppIdFormat('1:515438998704:android:e78ec19738058349')
    );
    assert.isTrue(
      isValidAppIdFormat('1:208472424340:android:a243f98a00873753')
    );
    assert.isTrue(isValidAppIdFormat('1:755541669657:ios:4d6d5a5ce71e9d30'));
    assert.isTrue(isValidAppIdFormat('1:1086610230652:ios:852c7f6ee799ff89'));
    assert.isTrue(isValidAppIdFormat('1:35006771263:web:32b6f4a5b95acd2c'));
  });

  it('retruns false if App ID is invalid', () => {
    assert.isFalse(isValidAppIdFormat('abc.abc.abc'));

    assert.isFalse(
      isValidAppIdFormat('com.google.firebase.samples.messaging.advanced')
    ); // using package name as App ID
  });

  it('returns true if Api key is valid', () => {
    assert.isTrue(
      isValidApiKeyFormat('AIzaSyabcdefghijklmnopqrstuvwxyz1234567')
    );

    assert.isTrue(
      isValidApiKeyFormat('AIzaSyA4UrcGxgwQFTfaI3no3t7Lt1sjmdnP5sQ')
    );

    assert.isTrue(
      isValidApiKeyFormat('AIzaSyA5_iVawFQ8ABuTZNUdcwERLJv_a_p4wtM')
    );

    assert.isTrue(
      isValidApiKeyFormat('AIzaSyANUvH9H9BsUccjsu2pCmEkOPjjaXeDQgY')
    );

    assert.isTrue(
      isValidApiKeyFormat('AIzaSyASWm6HmTMdYWpgMnjRBjxcQ9CKctWmLd4')
    );

    assert.isTrue(
      isValidApiKeyFormat('AIzaSyAdOS2zB6NCsk1pCdZ4-P6GBdi_UUPwX7c')
    );

    assert.isTrue(
      isValidApiKeyFormat('AIzaSyAnLA7NfeLquW1tJFpx_eQCxoX-oo6YyIs')
    );
  });

  it('retruns false if Api key is invalid', () => {
    assert.isFalse(
      isValidApiKeyFormat('BIzaSyabcdefghijklmnopqrstuvwxyz1234567')
    );

    assert.isFalse(isValidApiKeyFormat('AIzaSyabcdefghijklmnopqrstuvwxyz')); // wrong length

    assert.isFalse(
      isValidApiKeyFormat('AIzaSyabcdefghijklmno:qrstuvwxyzabcdefg')
    ); // wrong char

    assert.isFalse(
      isValidApiKeyFormat('AIzaSyabcdefghijklmno qrstuvwxyzabcdefg')
    ); // wrong char

    assert.isFalse(
      isValidApiKeyFormat(
        'AAAAdpB7anM:APA91bFFK03DIT8y3l5uymwbKcUDJdYqTRSP9Qcxg8SU5kKPalEpObdx0C0xv8gQttdWlL' +
          'W4hLvvHA0JoDKA6Lrvbi-edUjFCPY_WJkuvHxFwGWXjnj4yI4sPQ27mXuSVIyAbgX4aTK0QY' +
          'pIKq2j1NBi7ZU75gunQg'
      )
    ); // using FCM server key as API key.
  });
});
