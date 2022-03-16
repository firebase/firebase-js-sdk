// const fc = require('fast-check');
import {
  assert,
  property,
  string,
  array,
  integer,
  configureGlobal,
  unicodeString
} from 'fast-check';
import { expect } from 'chai';
import { arrayEquals } from '../../../src/util/misc';

configureGlobal({ numRuns: 1 });

// Code under test
const contains = (text: string, pattern: string) => text.indexOf(pattern) >= 0;

// Properties
describe('properties basics', () => {
  // string text always contains itself
  it('should always contain itself', () => {
    assert(
      property(unicodeString(), (text: string) => {
        console.log(`Testing "${text}" ... `);
        return contains(text, text);
      })
    );
  });
  // string a + b + c always contains b, whatever the values of a, b and c
  it('should always contain its substrings', () => {
    assert(
      property(
        string(),
        string(),
        string(),
        (a: string, b: string, c: string) => {
          // Alternatively: no return statement and direct usage of expect or assert
          return contains(a + b + c, b);
        }
      )
    );
  });
});

const sortInternal = <T>(
  tab: T[],
  start: number,
  end: number,
  cmp: (a: T, b: T) => boolean
): T[] => {
  if (end - start < 2) return tab;

  let pivot = start;
  for (let idx = start + 1; idx < end; ++idx) {
    if (!cmp(tab[start], tab[idx])) {
      let prev = tab[++pivot];
      tab[pivot] = tab[idx];
      tab[idx] = prev;
    }
  }
  let prev = tab[pivot];
  tab[pivot] = tab[start];
  tab[start] = prev;

  sortInternal(tab, start, pivot, cmp);
  // Correct
  // sortInternal(tab, pivot + 1, end, cmp);
  // Wrong!
  sortInternal(tab, pivot, end, cmp);
  return tab;
};

export const sort = <T>(tab: T[], compare?: (a: T, b: T) => boolean): T[] => {
  return sortInternal([...tab], 0, tab.length, compare || ((a, b) => a < b));
};

describe('sorting property covering reproducing and shrinking', () => {
  it('manual testing might work', () => {
    const data: number[] = [1, 0];
    const expected: number[] = [0, 1];
    expect(arrayEquals(sort(data), expected, (l, r) => l === r)).to.be.true;
  });

  it('should have the same length as source (reproducing)', () => {
    assert(
      property(array(integer()), (data: number[]) => {
        console.log(`Testing ${data} ... `);
        expect(sort(data)).to.have.lengthOf(data.length);
      }),
      {
        seed: 532154161,
        path: '3:2:3:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2:2',
        endOnFailure: true
      }
    );
  });

  it('should produce an ordered array (verbose/shrink)', () => {
    assert(
      property(array(integer()), (data: number[]) => {
        console.log(`Testing ${data} ... `);
        const sorted = sort(data);
        for (let idx = 1; idx < sorted.length; ++idx) {
          expect(sorted[idx - 1]).to.be.lessThanOrEqual(sorted[idx]);
        }
      }),
      { verbose: true }
    );
  });
});
