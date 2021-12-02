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
import { deepEqual } from '../src/obj';

describe('deepEqual()', () => {
  it('returns true for comparing empty objects', () => {
    expect(deepEqual({}, {})).to.be.true;
  });

  it('returns true for comparing the same object', () => {
    const obj = {
      field1: 1
    };

    expect(deepEqual(obj, obj)).to.be.true;
  });

  it('returns true for comparing shallow identical objects', () => {
    const obj1 = {
      field1: 1,
      field2: {
        nested1: 1
      }
    };

    const obj2 = {
      ...obj1
    };

    expect(deepEqual(obj1, obj2)).to.be.true;
  });

  it('returns true for deeply nested identical objects', () => {
    const obj1 = {
      field1: 1,
      field2: {
        nested1: {
          nested2: 2,
          nested3: 3,
          nested4: {
            nested5: 5
          }
        }
      },
      field3: {
        nested1: {
          nested2: 2,
          nested3: 3,
          nested4: {
            nested5: 5
          }
        }
      }
    };

    const obj2 = {
      field1: 1,
      field2: {
        nested1: {
          nested2: 2,
          nested3: 3,
          nested4: {
            nested5: 5
          }
        }
      },
      field3: {
        nested1: {
          nested2: 2,
          nested3: 3,
          nested4: {
            nested5: 5
          }
        }
      }
    };

    expect(deepEqual(obj1, obj2)).to.be.true;
  });

  it('returns true for comparing identical arrays', () => {
    const arr1 = [1, 2, 3, 4];
    const arr2 = [1, 2, 3, 4];

    expect(deepEqual(arr1, arr2)).to.be.true;
  });

  it('returns true for comparing arrays with nested objects', () => {
    const arr1 = [
      1,
      2,
      {
        field1: 1,
        field2: {
          nested1: {
            nested2: 2,
            nested3: 3,
            nested4: {
              nested5: 5
            }
          }
        },
        field3: {
          nested1: {
            nested2: 2,
            nested3: 3,
            nested4: {
              nested5: 5
            }
          }
        }
      }
    ];

    const arr2 = [
      1,
      2,
      {
        field1: 1,
        field2: {
          nested1: {
            nested2: 2,
            nested3: 3,
            nested4: {
              nested5: 5
            }
          }
        },
        field3: {
          nested1: {
            nested2: 2,
            nested3: 3,
            nested4: {
              nested5: 5
            }
          }
        }
      }
    ];

    expect(deepEqual(arr1, arr2)).to.be.true;
  });

  it('returns false for shallowly different objects', () => {
    const obj1 = {
      field1: 1,
      field2: 2
    };

    const obj2 = {
      field1: 1,
      field2: '2'
    };

    expect(deepEqual(obj1, obj2)).to.be.false;
  });

  it('returns false for different objects with nesting', () => {
    const obj1 = {
      field1: 1,
      field2: {
        nested1: {
          nested2: 2,
          nested3: 3,
          nested4: {
            nested5: 5
          }
        }
      },
      field3: {
        nested1: {
          nested2: 2,
          nested3: 3,
          nested4: {
            nested5: 5
          }
        }
      }
    };

    const obj2 = {
      field1: 1,
      field2: {
        nested1: {
          nested2: 2,
          nested3: 3,
          nested4: {
            nested5: '5'
          }
        }
      },
      field3: {
        nested1: {
          nested2: '2',
          nested3: 3,
          nested4: {
            nested5: 5
          }
        }
      }
    };

    expect(deepEqual(obj1, obj2)).to.be.false;
  });

  it('handles undefined & null properties correctly', () => {
    const obj1 = {
      field1: undefined,
      field2: null
    };
    const obj2 = {
      field1: undefined,
      field2: null
    };
    expect(deepEqual(obj1, obj2)).to.be.true;

    const obj3 = {
      field1: undefined
    };
    const obj4 = {
      field1: null
    };
    expect(deepEqual(obj3, obj4)).to.be.false;

    const obj5 = {
      field1: undefined
    };
    const obj6 = {};
    expect(deepEqual(obj5, obj6)).to.be.false;
  });
});
