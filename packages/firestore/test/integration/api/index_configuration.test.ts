/**
 * @license
 * Copyright 2021 Google LLC
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

import { setIndexConfiguration } from '../util/firebase_export';
import { apiDescribe, withTestDb } from '../util/helpers';

apiDescribe('Index Configuration:', persistence => {
  it('supports JSON', () => {
    return withTestDb(persistence, async db => {
      return setIndexConfiguration(
        db,
        '{\n' +
          '  "indexes": [\n' +
          '    {\n' +
          '      "collectionGroup": "restaurants",\n' +
          '      "queryScope": "COLLECTION",\n' +
          '      "fields": [\n' +
          '        {\n' +
          '          "fieldPath": "price",\n' +
          '          "order": "ASCENDING"\n' +
          '        },\n' +
          '        {\n' +
          '          "fieldPath": "avgRating",\n' +
          '          "order": "DESCENDING"\n' +
          '        }\n' +
          '      ]\n' +
          '    },\n' +
          '    {\n' +
          '      "collectionGroup": "restaurants",\n' +
          '      "queryScope": "COLLECTION",\n' +
          '      "fields": [\n' +
          '        {\n' +
          '          "fieldPath": "price",\n' +
          '          "order": "ASCENDING"\n' +
          '        }' +
          '      ]\n' +
          '    }\n' +
          '  ],\n' +
          '  "fieldOverrides": []\n' +
          '}'
      );
    });
  });

  it('supports schema', () => {
    return withTestDb(persistence, async db => {
      return setIndexConfiguration(db, {
        indexes: [
          {
            collectionGroup: 'restaurants',
            queryScope: 'COLLECTION',
            fields: [
              {
                fieldPath: 'price',
                order: 'ASCENDING'
              }
            ]
          }
        ]
      });
    });
  });

  it('bad JSON does not crash client', () => {
    return withTestDb(persistence, async db => {
      const action = (): Promise<void> => setIndexConfiguration(db, '{,}');
      if (persistence.storage === 'indexeddb') {
        expect(action).to.throw(/Failed to parse JSON/);
      } else {
        // Silently do nothing. Parsing is not done and therefore no error is thrown.
        await action();
      }
    });
  });

  it('bad index does not crash client', () => {
    return withTestDb(persistence, async db => {
      return setIndexConfiguration(
        db,
        '{\n' +
          '  "indexes": [\n' +
          '    {\n' +
          '      "collectionGroup": "restaurants",\n' +
          '      "queryScope": "COLLECTION",\n' +
          '      "fields": [\n' +
          '        {\n' +
          '          "fieldPath": "price",\n' +
          '          "order": "INVALID"\n' +
          '        }\n' +
          '      ]\n' +
          '    }\n' +
          '  ],\n' +
          '  "fieldOverrides": []\n' +
          '}'
      );
    });
  });
});
