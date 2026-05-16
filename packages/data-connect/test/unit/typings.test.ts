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

import { deleteApp, initializeApp } from '@firebase/app';
import { DataConnect, getDataConnect, QueryRef, queryRef } from '../../src/api';
describe('Typings', () => {
  it('should properly infer the type', async () => {
    interface MyData {
      extraField: boolean;
    }
    const app = initializeApp({ projectId: 'a' }, 'test');
    const extendedType = Object.assign(
      queryRef<MyData, undefined>(
        getDataConnect({ connector: 'c', location: 'l', service: 'n' }),
        '',
        undefined
      ),
      {
        __abc: true
      }
    );
    function myFn<Data, Variables>(
      queryRef: QueryRef<Data, Variables>
    ): { data: Data } {
      const data = {} as Data;
      return { data };
    }
    myFn(extendedType).data.extraField;
    await deleteApp(app);
  });
});
