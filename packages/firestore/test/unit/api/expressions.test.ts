/**
 * @license
 * Copyright 2026 Google LLC
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

import { ParseContext } from '../../../src/api/parse_context';
import { UserDataSource } from '../../../src/lite-api/user_data_reader';
import { constant, FunctionExpression } from '../../lite/pipeline_export';
import { testUserDataReader } from '../../util/helpers';

describe('expressions', () => {
  describe('serialization', () => {
    let context: ParseContext | undefined;
    beforeEach(async () => {
      context = testUserDataReader(false).createContext(
        UserDataSource.Argument,
        'beforeEach'
      );
    });

    // TODO(search) enable with backend support
    // it('serializes snippet expression without options', async () => {
    //   const snippetExpression = field('foo').snippet('bar');
    //   snippetExpression._readUserData(context!);
    //
    //   const proto = snippetExpression._toProto(context!.serializer);
    //
    //   expect(proto).to.deep.equal({
    //     functionValue: {
    //       name: 'snippet',
    //       args: [
    //         {
    //           'fieldReferenceValue': 'foo'
    //         },
    //         {
    //           stringValue: 'bar'
    //         }
    //       ],
    //       options: {}
    //     }
    //   });
    // });

    // TODO(search) enable with backend support
    // it('serializes snippet expression with options', async () => {
    //   const snippetExpression = field('foo').snippet({
    //     rquery: 'bar',
    //     maxSnippetWidth: 123,
    //     maxSnippets: 321,
    //     separator: '...'
    //   });
    //   snippetExpression._readUserData(context!);
    //
    //   const proto = snippetExpression._toProto(context!.serializer);
    //
    //   expect(proto).to.deep.equal({
    //     functionValue: {
    //       name: 'snippet',
    //       args: [
    //         {
    //           'fieldReferenceValue': 'foo'
    //         },
    //         {
    //           stringValue: 'bar'
    //         }
    //       ],
    //       options: {
    //         'max_snippet_width': {
    //           integerValue: '123'
    //         },
    //         'max_snippets': {
    //           integerValue: '321'
    //         },
    //         separator: {
    //           stringValue: '...'
    //         }
    //       }
    //     }
    //   });
    // });

    it('serializes generic FunctionExpression without options', async () => {
      const snippetExpression = new FunctionExpression('name', [constant(1)]);
      snippetExpression._readUserData(context!);

      const proto = snippetExpression._toProto(context!.serializer);

      expect(proto).to.deep.equal({
        functionValue: {
          name: 'name',
          args: [
            {
              integerValue: '1'
            }
          ]
        }
      });
    });
  });
});
