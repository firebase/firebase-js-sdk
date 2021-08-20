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


import { DataSnapshot as ExpDataSnapshot } from '@firebase/database';
import { expect } from 'chai';

import { PRIORITY_INDEX } from '../../database/src/core/snap/indexes/PriorityIndex';
import { nodeFromJSON } from '../../database/src/core/snap/nodeFromJSON';
import { DataSnapshot, Reference } from '../src/api/Reference';

import { getRandomNode } from './helpers/util';

describe('DataSnapshot Tests', () => {
  /** @returns {!DataSnapshot} */
  const snapshotForJSON = function (json) {
    const dummyRef = getRandomNode() as Reference;
    return new DataSnapshot(
      dummyRef.database,
      new ExpDataSnapshot(
        nodeFromJSON(json),
        dummyRef._delegate,
        PRIORITY_INDEX
      )
    );
  };

  it('DataSnapshot.hasChildren() works.', () => {
    let snap = snapshotForJSON({});
    expect(snap.hasChildren()).to.equal(false);

    snap = snapshotForJSON(5);
    expect(snap.hasChildren()).to.equal(false);

    snap = snapshotForJSON({ x: 5 });
    expect(snap.hasChildren()).to.equal(true);
  });

  it('DataSnapshot.exists() works.', () => {
    let snap = snapshotForJSON({});
    expect(snap.exists()).to.equal(false);

    snap = snapshotForJSON({ '.priority': 1 });
    expect(snap.exists()).to.equal(false);

    snap = snapshotForJSON(null);
    expect(snap.exists()).to.equal(false);

    snap = snapshotForJSON(true);
    expect(snap.exists()).to.equal(true);

    snap = snapshotForJSON(5);
    expect(snap.exists()).to.equal(true);

    snap = snapshotForJSON({ x: 5 });
    expect(snap.exists()).to.equal(true);
  });

  it('DataSnapshot.val() works.', () => {
    let snap = snapshotForJSON(5);
    expect(snap.val()).to.equal(5);

    snap = snapshotForJSON({});
    expect(snap.val()).to.equal(null);

    const json = {
      x: 5,
      y: {
        ya: 1,
        yb: 2,
        yc: { yca: 3 }
      }
    };
    snap = snapshotForJSON(json);
    expect(snap.val()).to.deep.equal(json);
  });

  it('DataSnapshot.child() works.', () => {
    const snap = snapshotForJSON({ x: 5, y: { yy: 3, yz: 4 } });
    expect(snap.child('x').val()).to.equal(5);
    expect(snap.child('y').val()).to.deep.equal({ yy: 3, yz: 4 });
    expect(snap.child('y').child('yy').val()).to.equal(3);
    expect(snap.child('y/yz').val()).to.equal(4);
    expect(snap.child('z').val()).to.equal(null);
    expect(snap.child('x/y').val()).to.equal(null);
    expect(snap.child('x').child('y').val()).to.equal(null);
  });

  it('DataSnapshot.hasChild() works.', () => {
    const snap = snapshotForJSON({ x: 5, y: { yy: 3, yz: 4 } });
    expect(snap.hasChild('x')).to.equal(true);
    expect(snap.hasChild('y/yy')).to.equal(true);
    expect(snap.hasChild('dinosaur')).to.equal(false);
    expect(snap.child('x').hasChild('anything')).to.equal(false);
    expect(snap.hasChild('x/anything/at/all')).to.equal(false);
  });

  it('DataSnapshot.key works.', () => {
    const snap = snapshotForJSON({ a: { b: { c: 5 } } });
    expect(snap.child('a').key).to.equal('a');
    expect(snap.child('a/b/c').key).to.equal('c');
    expect(snap.child('/a/b/c/').key).to.equal('c');
    expect(snap.child('////a////b/c///').key).to.equal('c');
    expect(snap.child('///').key).to.equal(snap.key);

    // Should also work for nonexistent paths.
    expect(snap.child('/z/q/r/v/m').key).to.equal('m');
  });

  it('DataSnapshot.forEach() works: no priorities.', () => {
    const snap = snapshotForJSON({
      a: 1,
      z: 26,
      m: 13,
      n: 14,
      c: 3,
      b: 2,
      e: 5
    });
    let out = '';
    snap.forEach(child => {
      out = out + child.key + ':' + child.val() + ':';
    });

    expect(out).to.equal('a:1:b:2:c:3:e:5:m:13:n:14:z:26:');
  });

  it('DataSnapshot.forEach() works: numeric priorities.', () => {
    const snap = snapshotForJSON({
      a: { '.value': 1, '.priority': 26 },
      z: { '.value': 26, '.priority': 1 },
      m: { '.value': 13, '.priority': 14 },
      n: { '.value': 14, '.priority': 12 },
      c: { '.value': 3, '.priority': 24 },
      b: { '.value': 2, '.priority': 25 },
      e: { '.value': 5, '.priority': 22 }
    });

    let out = '';
    snap.forEach(child => {
      out = out + child.key + ':' + child.val() + ':';
    });

    expect(out).to.equal('z:26:n:14:m:13:e:5:c:3:b:2:a:1:');
  });

  it('DataSnapshot.forEach() works: numeric priorities as strings.', () => {
    const snap = snapshotForJSON({
      a: { '.value': 1, '.priority': '26' },
      z: { '.value': 26, '.priority': '1' },
      m: { '.value': 13, '.priority': '14' },
      n: { '.value': 14, '.priority': '12' },
      c: { '.value': 3, '.priority': '24' },
      b: { '.value': 2, '.priority': '25' },
      e: { '.value': 5, '.priority': '22' }
    });

    let out = '';
    snap.forEach(child => {
      out = out + child.key + ':' + child.val() + ':';
    });

    expect(out).to.equal('z:26:n:14:m:13:e:5:c:3:b:2:a:1:');
  });

  it('DataSnapshot.forEach() works: alpha priorities.', () => {
    const snap = snapshotForJSON({
      a: { '.value': 1, '.priority': 'first' },
      z: { '.value': 26, '.priority': 'second' },
      m: { '.value': 13, '.priority': 'third' },
      n: { '.value': 14, '.priority': 'fourth' },
      c: { '.value': 3, '.priority': 'fifth' },
      b: { '.value': 2, '.priority': 'sixth' },
      e: { '.value': 5, '.priority': 'seventh' }
    });

    let out = '';
    snap.forEach(child => {
      out = out + child.key + ':' + child.val() + ':';
    });

    expect(out).to.equal('c:3:a:1:n:14:z:26:e:5:b:2:m:13:');
  });

  it('DataSnapshot.foreach() works: mixed alpha and numeric priorities', () => {
    const json = {
      alpha42: { '.value': 1, '.priority': 'zed' },
      noPriorityC: { '.value': 1, '.priority': null },
      num41: { '.value': 1, '.priority': 500 },
      noPriorityB: { '.value': 1, '.priority': null },
      num80: { '.value': 1, '.priority': 4000.1 },
      num50: { '.value': 1, '.priority': 4000 },
      num10: { '.value': 1, '.priority': 24 },
      alpha41: { '.value': 1, '.priority': 'zed' },
      alpha20: { '.value': 1, '.priority': 'horse' },
      num20: { '.value': 1, '.priority': 123 },
      num70: { '.value': 1, '.priority': 4000.01 },
      noPriorityA: { '.value': 1, '.priority': null },
      alpha30: { '.value': 1, '.priority': 'tree' },
      num30: { '.value': 1, '.priority': 300 },
      num60: { '.value': 1, '.priority': 4000.001 },
      alpha10: { '.value': 1, '.priority': '0horse' },
      num42: { '.value': 1, '.priority': 500 },
      alpha40: { '.value': 1, '.priority': 'zed' },
      num40: { '.value': 1, '.priority': 500 }
    };

    const snap = snapshotForJSON(json);
    let out = '';
    snap.forEach(child => {
      out = out + child.key + ', ';
    });

    expect(out).to.equal(
      'noPriorityA, noPriorityB, noPriorityC, num10, num20, num30, num40, num41, num42, num50, num60, num70, num80, alpha10, alpha20, alpha30, alpha40, alpha41, alpha42, '
    );
  });

  it('.val() exports array-like data as arrays.', () => {
    const array = ['bob', 'and', 'becky', 'seem', 'really', 'nice', 'yeah?'];
    const snap = snapshotForJSON(array);
    const snapVal = snap.val();
    expect(snapVal).to.deep.equal(array);
    expect(snapVal instanceof Array).to.equal(true); // to.equal doesn't verify type.
  });

  it('DataSnapshot can be JSON serialized', () => {
    const json = {
      foo: 'bar',
      '.priority': 1
    };
    const snap = snapshotForJSON(json);
    expect(JSON.parse(JSON.stringify(snap))).to.deep.equal(json);
  });
});
