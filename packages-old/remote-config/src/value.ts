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

import { Value as ValueType, ValueSource } from '@firebase/remote-config-types';

const DEFAULT_VALUE_FOR_BOOLEAN = false;
const DEFAULT_VALUE_FOR_STRING = '';
const DEFAULT_VALUE_FOR_NUMBER = 0;

const BOOLEAN_TRUTHY_VALUES = ['1', 'true', 't', 'yes', 'y', 'on'];

export class Value implements ValueType {
  constructor(
    private readonly _source: ValueSource,
    private readonly _value: string = DEFAULT_VALUE_FOR_STRING
  ) {}

  asString(): string {
    return this._value;
  }

  asBoolean(): boolean {
    if (this._source === 'static') {
      return DEFAULT_VALUE_FOR_BOOLEAN;
    }
    return BOOLEAN_TRUTHY_VALUES.indexOf(this._value.toLowerCase()) >= 0;
  }

  asNumber(): number {
    if (this._source === 'static') {
      return DEFAULT_VALUE_FOR_NUMBER;
    }
    let num = Number(this._value);
    if (isNaN(num)) {
      num = DEFAULT_VALUE_FOR_NUMBER;
    }
    return num;
  }

  getSource(): ValueSource {
    return this._source;
  }
}
