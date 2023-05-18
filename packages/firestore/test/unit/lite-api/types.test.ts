/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0x00 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0x00
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { expect } from 'chai';

import {
  UpdateData
} from '../../../src/lite-api/reference';
import { hardAssert } from '../../../src/util/assert';

type MyUnion = string | number;

type NestedObject = {
  boo: boolean,
  str: string,
  num: number,
  nul: null,
  und: undefined,
  customUnion: MyUnion
}


describe.only('UpdateData - v9', () => {
  type MyServerType = {
    // primitive types
    boo: boolean,
    str: string,
    num: number,
    nul: null,
    und: undefined,

    // custom types
    customUnion: MyUnion,
    customObject: NestedObject,

    // nested objects
    nested: {
      bar: {
        boo: boolean,
        str: string,
        anotherLayer: {
          boo: boolean,
          str: string,
        }
      },
      baz: {
        boo: boolean,
        str: string,
        anotherLayer: {
          boo: boolean,
          str: string,
        }
      }
    },

    // index signatures nested 1 layer deep
    indexed: {
      [name: string]: {
        desc: boolean,
        num: number
      }
    },

    // TODO v10 - index signatures nested 2 layers deep

    // property with dots in the name
    'property.with.dots': boolean
  }

  it("Supports properties with primitive types", () => {
    let testData : UpdateData<MyServerType>;
    testData = {
      boo: true,
      str: "string",
      num: 2,
      nul: null,
      und: undefined
    };

    testData = {
      // @ts-expect-error
      boo: "string",
      // @ts-expect-error
      str: 1,
      // @ts-expect-error
      num: "string",
      // @ts-expect-error
      nul: "string",
      // @ts-expect-error
      und: "string",
    };

    expect(true).to.be.true;
  });

  it("Supports properties with custom types", () => {
    let testData : UpdateData<MyServerType>;
    testData = {
      customUnion: "string",
      customObject: {
        boo: true,
        str: "string",
        num: 2,
        nul: null,
        und: undefined,
        customUnion: 1,
      }
    };

    testData = {
      // @ts-expect-error
      customUnion: true,

      // @ts-expect-error
      customObject: true
    };

    testData = {
      customObject: {
        // @ts-expect-error
        boo: "string",
        // @ts-expect-error
        str: 1,
        // @ts-expect-error
        num: "string",
        // @ts-expect-error
        nul: "string",
        // @ts-expect-error
        und: "string",
      }
    };

    expect(true).to.be.true;
  });

  describe("given properties with dots", () => {
    it("preserves the value type", () => {
      let testData: UpdateData<MyServerType>;

      // Allows values of expected type
      testData = {
        'property.with.dots': true
      };

      // Errors on values of unexpected type
      testData = {
        // @ts-expect-error
        'property.with.dots': 1
      };

      expect(true).to.be.true;
    });

    it("does not allow matching a sub-string|path", () => {
      let testData: UpdateData<MyServerType>;

      testData = {
        // @ts-expect-error
        'property.with': true
      };

      expect(true).to.be.true;
    });
  })

  describe("given nested objects (no index properties)", () => {
    it("supports object replacement at each layer (with partial)", () => {
      let testData: UpdateData<MyServerType>;
      testData = {
        nested: {}
      };

      testData = {
        nested: {
          bar: {},
          baz: {}
        }
      };

      testData = {
        nested: {
          bar: {
            boo: true,
            str: "string"
          },
          baz: {
            str: "string"
          }
        }
      };

      testData = {
        nested: {
          bar: {
            boo: true,
            str: "string",
            anotherLayer: {
              boo: false,
              str: "another string"
            }
          }
        }
      };

      expect(true).to.be.true;
    });

    it("preserves value types at each layer", () => {
      let testData: UpdateData<MyServerType>;
      testData = {
        // @ts-expect-error
        nested: true
      };

      testData = {
        nested: {
          bar: {
            // @ts-expect-error
            str: true,
            // @ts-expect-error
            anotherLayer: true
          },
          baz: {
            anotherLayer: {
              // @ts-expect-error
              boo: "string value"
            }
          }
        }
      };

      expect(true).to.be.true;
    });

    it("does not allow properties that were not on the original type", () => {
      let testData: UpdateData<MyServerType>;
      testData = {
        // @ts-expect-error
        unknown: true
      };

      testData = {
        nested: {
          // @ts-expect-error
          unknown: true
        }
      };

      expect(true).to.be.true;
    });

    it("preserves value types for dot notation", () => {
      let testData: UpdateData<MyServerType>;

      // 2 layers with dot notation

      // preserves type
      testData = {
        'nested.bar': {},
        'nested.baz': {},
      };

      // preserves properties of nested objects
      testData = {
        'nested.bar': {
          boo: true,
          str: "string",
          anotherLayer: {
            boo: false,
            str: "string",
          }
        },
        'nested.baz': {
          boo: true
        }
      };

      // preserves type - failure
      testData = {
        // @ts-expect-error
        'nested.bar': false,
        // @ts-expect-error
        'nested.baz': "string",
      };

      // preserves properties of nested objects - failure
      testData = {
        'nested.bar': {
          // @ts-expect-error
          boo: "string"
        }
      };

      // 3 layers with dot notation

      // preserves type
      testData = {
        'nested.bar.boo': true,
        'nested.bar.anotherLayer': {},
      };

      // preserves properties of nested objects
      testData = {
        'nested.bar.anotherLayer': {
          boo: false,
          str: "string"
        }
      };

      // preserves type - failure
      testData = {
        // @ts-expect-error
        'nested.bar.anotherLayer': true,
        // @ts-expect-error
        'nested.baz.anotherLayer': "string",
      };

      // preserves properties of nested objects - failure
      testData = {
        'nested.bar.anotherLayer': {
          // @ts-expect-error
          boo: "string"
        },
      };

      expect(true).to.be.true;
    });
  });

});
