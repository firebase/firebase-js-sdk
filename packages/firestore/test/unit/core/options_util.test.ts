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

import {expect} from "chai";

import {ParseContext} from "../../../src/api/parse_context";
import {OptionsUtil} from "../../../src/core/options_util";
import {
  UserDataSource
} from "../../../src/lite-api/user_data_reader";
import {testUserDataReader} from "../../util/helpers";

describe.only('OptionsUtil', () => {
  let context: ParseContext | undefined;
  beforeEach(async () => {
    context = testUserDataReader(false).createContext(UserDataSource.Argument, 'beforeEach');
  });

  afterEach(async () => {
    context = undefined;
  });

  it('should support known options', () => {
    const optionsUtil = new OptionsUtil({
      fooBar: {
        serverName: 'foo_bar',
      },
    });
    const proto = optionsUtil.getOptionsProto(
      context!, {
      fooBar: 'recommended',
    });

    expect(proto).deep.equal({
      'foo_bar': {
        stringValue: 'recommended',
      },
    });
  });

  it('should support unknown options', () => {
    const optionsUtil = new OptionsUtil({});
    const proto = optionsUtil.getOptionsProto(
      context!,
      {},
      {baz: 'foo'}
    );

    expect(proto).to.deep.equal({
      baz: {
        stringValue: 'foo',
      },
    });
  });

  it('should support unknown nested options', () => {
    const optionsUtil = new OptionsUtil({});
    const proto = optionsUtil.getOptionsProto(
      context!,
      {},
      {'foo.bar': 'baz'}
    );

    expect(proto).to.deep.equal({
      foo: {
        mapValue: {
          fields: {
            bar: {stringValue: 'baz'},
          },
        },
      },
    });
  });

  it('should support options override', () => {
    const optionsUtil = new OptionsUtil({
      indexMode: {
        serverName: 'index_mode',
      },
    });
    const proto = optionsUtil.getOptionsProto(
      context!,
      {
        indexMode: 'recommended',
      },
      {
        'index_mode': 'baz',
      }
    );

    expect(proto).to.deep.equal({
      'index_mode': {
        stringValue: 'baz',
      },
    });
  });

  it('should support options override of nested field', () => {
    const optionsUtil = new OptionsUtil({
      foo: {
        serverName: 'foo',
        nestedOptions: {
          bar: {
            serverName: 'bar',
          },
          waldo: {
            serverName: 'waldo',
          },
        },
      },
    });
    const proto = optionsUtil.getOptionsProto(
      context!,
      {
        foo: {bar: 'yep', waldo: 'found'},
      },
      {
        'foo.bar': 123,
        'foo.baz': true,
      }
    );

    expect(proto).to.deep.equal({
      foo: {
        mapValue: {
          fields: {
            bar: {
              integerValue: '123',
            },
            waldo: {
              stringValue: 'found',
            },
            baz: {
              booleanValue: true,
            },
          },
        },
      },
    });
  });

  it('will replace a nested object if given a new object', () => {
    const optionsUtil = new OptionsUtil({
      foo: {
        serverName: 'foo',
        nestedOptions: {
          bar: {
            serverName: 'bar',
          },
          waldo: {
            serverName: 'waldo',
          },
        },
      },
    });
    const proto = optionsUtil.getOptionsProto(
      context!,
      {
        foo: {bar: 'yep', waldo: 'found'},
      },
      {
        foo: {
          bar: 123,
        },
      }
    );

    expect(proto).to.deep.equal({
      foo: {
        mapValue: {
          fields: {
            bar: {
              integerValue: '123',
            },
          },
        },
      },
    });
  });

  it('will replace a top level property that is not an object if given a nested field with dot notation', () => {
    const optionsUtil = new OptionsUtil({
      foo: {
        serverName: 'foo',
      },
    });

    const proto = optionsUtil.getOptionsProto(
      context!,
      {
        foo: 'bar',
      },
      {
        'foo.bar': '123',
        'foo.waldo': true,
      }
    );

    expect(proto).to.deep.equal({
      foo: {
        mapValue: {
          fields: {
            bar: {
              stringValue: '123',
            },
            waldo: {
              booleanValue: true,
            },
          },
        },
      },
    });
  });
});
