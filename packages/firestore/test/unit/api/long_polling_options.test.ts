/**
 * @license
 * Copyright 2023 Google LLC
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

import {
  ExperimentalLongPollingOptions,
  longPollingOptionsEqual,
  cloneLongPollingOptions
} from '../../../src/api/long_polling_options';

describe('long_polling_options', () => {
  it('longPollingOptionsEqual() should return true for empty objects', () => {
    expect(longPollingOptionsEqual({}, {})).to.be.true;
  });

  it('longPollingOptionsEqual() should return true if both objects have the same timeoutSeconds', () => {
    const options1: ExperimentalLongPollingOptions = { timeoutSeconds: 123 };
    const options2: ExperimentalLongPollingOptions = { timeoutSeconds: 123 };
    expect(longPollingOptionsEqual(options1, options2)).to.be.true;
  });

  it('longPollingOptionsEqual() should return false if the objects have different timeoutSeconds', () => {
    const options1: ExperimentalLongPollingOptions = { timeoutSeconds: 123 };
    const options2: ExperimentalLongPollingOptions = { timeoutSeconds: 321 };
    expect(longPollingOptionsEqual(options1, options2)).to.be.false;
  });

  it('longPollingOptionsEqual() should ignore properties not defined in ExperimentalLongPollingOptions', () => {
    const options1 = {
      timeoutSeconds: 123,
      someOtherProperty: 42
    } as ExperimentalLongPollingOptions;
    const options2 = {
      timeoutSeconds: 123,
      someOtherProperty: 24
    } as ExperimentalLongPollingOptions;
    expect(longPollingOptionsEqual(options1, options2)).to.be.true;
  });

  it('cloneLongPollingOptions() with an empty object should return an empty object', () => {
    expect(cloneLongPollingOptions({})).to.deep.equal({});
  });

  it('cloneLongPollingOptions() should copy timeoutSeconds', () => {
    expect(cloneLongPollingOptions({ timeoutSeconds: 1234 })).to.deep.equal({
      timeoutSeconds: 1234
    });
  });

  it('cloneLongPollingOptions() should not copy properties not defined in ExperimentalLongPollingOptions', () => {
    const options = {
      timeoutSeconds: 1234,
      someOtherProperty: 42
    } as ExperimentalLongPollingOptions;
    expect(cloneLongPollingOptions(options)).to.deep.equal({
      timeoutSeconds: 1234
    });
  });
});
