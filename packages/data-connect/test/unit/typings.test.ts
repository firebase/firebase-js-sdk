/**
 * @license
 * Copyright 2025 Google LLC
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

import { DataConnect, QueryRef, queryRef } from '../../src/api';
describe('Typings', () => {
  it('should properly infer the type', () => {
    interface MyData {
      extraField: boolean;
    }
    const extendedType = Object.assign(
      queryRef<MyData, undefined>({} as DataConnect, '', undefined),
      {
        __abc: true
      }
    );
    function myFn<Data, Variables>(queryRef: QueryRef<Data, Variables>) {
      const data = {} as Data;
      return { data };
    }
    myFn(extendedType).data.extraField;
  });
});
