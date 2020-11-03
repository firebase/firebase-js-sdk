/**
 * @license
 * Copyright 2017 Google LLC
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
import { deepCopy, deepExtend } from '../src/deepCopy';

describe('deepCopy()', () => {
  it('Scalars', () => {
    expect(deepCopy(true)).to.equal(true);
    expect(deepCopy(123)).to.equal(123);
    expect(deepCopy('abc')).to.equal('abc');
  });

  it('Date', () => {
    const d = new Date();
    expect(deepCopy(d)).to.deep.equal(d);
  });

  it('Object', () => {
    expect(deepCopy({})).to.deep.equal({});
    expect(deepCopy({ a: 123 })).to.deep.equal({ a: 123 });
    expect(deepCopy({ a: { b: 123 } })).to.deep.equal({ a: { b: 123 } });
  });

  it('Array', () => {
    expect(deepCopy([])).to.deep.equal([]);
    expect(deepCopy([123, 456])).to.deep.equal([123, 456]);
    expect(deepCopy([123, [456]])).to.deep.equal([123, [456]]);
  });
});

describe('deepExtend', () => {
  it('Scalars', () => {
    expect(deepExtend(1, true)).to.equal(true);
    expect(deepExtend(undefined, 123)).to.equal(123);
    expect(deepExtend('was', 'abc')).to.equal('abc');
  });

  it('Date', () => {
    const d = new Date();
    expect(deepExtend(new Date(), d)).to.deep.equal(d);
  });

  it('Object', () => {
    expect(deepExtend({ old: 123 }, {})).to.deep.equal({ old: 123 });
    expect(deepExtend({ old: 123 }, { s: 'hello' })).to.deep.equal({
      old: 123,
      s: 'hello'
    });
    expect(
      deepExtend({ old: 123, a: { c: 'in-old' } }, { a: { b: 123 } })
    ).to.deep.equal({ old: 123, a: { b: 123, c: 'in-old' } });
  });

  it('Array', () => {
    expect(deepExtend([1], [])).to.deep.equal([]);
    expect(deepExtend([1], [123, 456])).to.deep.equal([123, 456]);
    expect(deepExtend([1], [123, [456]])).to.deep.equal([123, [456]]);
  });

  it('Array is copied - not referenced', () => {
    const o1 = { a: [1] };
    const o2 = { a: [2] };

    expect(deepExtend(o1, o2)).to.deep.equal({ a: [2] });
    o2.a.push(3);
    expect(o1).to.deep.equal({ a: [2] });
  });

  it('Array with undefined elements', () => {
    const a: any = [];
    a[3] = '3';
    const b = deepExtend(undefined, a);
    expect(b).to.deep.equal([, , , '3']);
  });

  it('Function', () => {
    const source: any = (): void => {
      /*_*/
    };
    const target: any = deepExtend(
      {
        a: () => {
          /*_*/
        }
      },
      { a: source }
    );
    expect({ a: source }).to.deep.equal(target);
    expect(source).to.equal(target.a);
  });

  it('does not extend property __proto__', () => {
    const src = JSON.parse('{ "__proto__": { "polluted": "polluted" } }');
    const a: Record<string, unknown> = {};
    deepExtend(a, src);

    expect(a.__proto__).to.equal(Object.prototype);
    expect(a.polluted).to.be.undefined;
  });
});
