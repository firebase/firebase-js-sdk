/**
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

import { expect } from 'chai';
import { Timestamp } from '../../../src/core/timestamp';
import { addEqualityMatcher } from '../../util/equality_matcher';

describe('Timestamp', () => {
  addEqualityMatcher();

  it('fromDate', () => {
    expect(Timestamp.fromDate(new Date(1488872578916))).to.deep.equal({
      seconds: 1488872578,
      nanos: 916000000
    });

    expect(Timestamp.fromDate(new Date(-1250))).to.deep.equal({
      seconds: -2,
      nanos: 750000000
    });
  });

  it('fromISOString', () => {
    expect(
      Timestamp.fromISOString('2017-03-07T07:42:58.916123456Z')
    ).to.deep.equal({
      seconds: 1488872578,
      nanos: 916123456
    });

    expect(
      Timestamp.fromISOString('2017-03-07T07:42:58.916123Z')
    ).to.deep.equal({
      seconds: 1488872578,
      nanos: 916123000
    });

    expect(Timestamp.fromISOString('2017-03-07T07:42:58.916Z')).to.deep.equal({
      seconds: 1488872578,
      nanos: 916000000
    });

    expect(Timestamp.fromISOString('2017-03-07T07:42:58Z')).to.deep.equal({
      seconds: 1488872578,
      nanos: 0
    });
  });
});
