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

import { ChildrenNode } from '../src/core/snap/ChildrenNode';
import { nodeFromJSON } from '../src/core/snap/nodeFromJSON';
import {
  newSparseSnapshotTree,
  sparseSnapshotTreeFind,
  sparseSnapshotTreeForEachChild,
  sparseSnapshotTreeForEachTree,
  sparseSnapshotTreeForget,
  sparseSnapshotTreeRemember
} from '../src/core/SparseSnapshotTree';
import { newEmptyPath, Path } from '../src/core/util/Path';

describe('SparseSnapshotTree Tests', () => {
  it('Basic remember and find.', () => {
    const st = newSparseSnapshotTree();
    const path = new Path('a/b');
    const node = nodeFromJSON('sdfsd');

    sparseSnapshotTreeRemember(st, path, node);
    expect(sparseSnapshotTreeFind(st, new Path('a/b')).isEmpty()).toBe(false);
    expect(sparseSnapshotTreeFind(st, new Path('a'))).toBe(null);
  });

  it('Find inside an existing snapshot', () => {
    const st = newSparseSnapshotTree();
    const path = new Path('t/tt');
    let node = nodeFromJSON({ a: 'sdfsd', x: 5, '999i': true });
    node = node.updateImmediateChild('apples', nodeFromJSON({ goats: 88 }));
    sparseSnapshotTreeRemember(st, path, node);

    expect(sparseSnapshotTreeFind(st, new Path('t/tt')).isEmpty()).toBe(false);
    expect(sparseSnapshotTreeFind(st, new Path('t/tt/a')).val()).toBe('sdfsd');
    expect(sparseSnapshotTreeFind(st, new Path('t/tt/999i')).val()).toBe(true);
    expect(sparseSnapshotTreeFind(st, new Path('t/tt/apples')).isEmpty()).toBe(
      false
    );
    expect(
      sparseSnapshotTreeFind(st, new Path('t/tt/apples/goats')).val()
    ).toBe(88);
  });

  it('Write a snapshot inside a snapshot.', () => {
    const st = newSparseSnapshotTree();
    sparseSnapshotTreeRemember(
      st,
      new Path('t'),
      nodeFromJSON({ a: { b: 'v' } })
    );
    sparseSnapshotTreeRemember(st, new Path('t/a/rr'), nodeFromJSON(19));
    expect(sparseSnapshotTreeFind(st, new Path('t/a/b')).val()).toBe('v');
    expect(sparseSnapshotTreeFind(st, new Path('t/a/rr')).val()).toBe(19);
  });

  it('Write a null value and confirm it is remembered.', () => {
    const st = newSparseSnapshotTree();
    sparseSnapshotTreeRemember(st, new Path('awq/fff'), nodeFromJSON(null));
    expect(sparseSnapshotTreeFind(st, new Path('awq/fff'))).toBe(
      ChildrenNode.EMPTY_NODE
    );
    expect(sparseSnapshotTreeFind(st, new Path('awq/sdf'))).toBe(null);
    expect(sparseSnapshotTreeFind(st, new Path('awq/fff/jjj'))).toBe(
      ChildrenNode.EMPTY_NODE
    );
    expect(sparseSnapshotTreeFind(st, new Path('awq/sdf/sdf/q'))).toBe(null);
  });

  it('Overwrite with null and confirm it is remembered.', () => {
    const st = newSparseSnapshotTree();
    sparseSnapshotTreeRemember(
      st,
      new Path('t'),
      nodeFromJSON({ a: { b: 'v' } })
    );
    expect(sparseSnapshotTreeFind(st, new Path('t')).isEmpty()).toBe(false);
    sparseSnapshotTreeRemember(st, new Path('t'), ChildrenNode.EMPTY_NODE);
    expect(sparseSnapshotTreeFind(st, new Path('t')).isEmpty()).toBe(true);
  });

  it('Simple remember and forget.', () => {
    const st = newSparseSnapshotTree();
    sparseSnapshotTreeRemember(
      st,
      new Path('t'),
      nodeFromJSON({ a: { b: 'v' } })
    );
    expect(sparseSnapshotTreeFind(st, new Path('t')).isEmpty()).toBe(false);
    sparseSnapshotTreeForget(st, new Path('t'));
    expect(sparseSnapshotTreeFind(st, new Path('t'))).toBe(null);
  });

  it('Forget the root.', () => {
    const st = newSparseSnapshotTree();
    sparseSnapshotTreeRemember(
      st,
      new Path('t'),
      nodeFromJSON({ a: { b: 'v' } })
    );
    expect(sparseSnapshotTreeFind(st, new Path('t')).isEmpty()).toBe(false);
    sparseSnapshotTreeForget(st, newEmptyPath());
    expect(sparseSnapshotTreeFind(st, new Path('t'))).toBe(null);
  });

  it('Forget snapshot inside snapshot.', () => {
    const st = newSparseSnapshotTree();
    sparseSnapshotTreeRemember(
      st,
      new Path('t'),
      nodeFromJSON({ a: { b: 'v', c: 9, art: false } })
    );
    expect(sparseSnapshotTreeFind(st, new Path('t/a/c')).isEmpty()).toBe(false);
    expect(sparseSnapshotTreeFind(st, new Path('t')).isEmpty()).toBe(false);

    sparseSnapshotTreeForget(st, new Path('t/a/c'));
    expect(sparseSnapshotTreeFind(st, new Path('t'))).toBe(null);
    expect(sparseSnapshotTreeFind(st, new Path('t/a'))).toBe(null);
    expect(sparseSnapshotTreeFind(st, new Path('t/a/b')).val()).toBe('v');
    expect(sparseSnapshotTreeFind(st, new Path('t/a/c'))).toBe(null);
    expect(sparseSnapshotTreeFind(st, new Path('t/a/art')).val()).toBe(false);
  });

  it('Forget path shallower than snapshots.', () => {
    const st = newSparseSnapshotTree();
    sparseSnapshotTreeRemember(st, new Path('t/x1'), nodeFromJSON(false));
    sparseSnapshotTreeRemember(st, new Path('t/x2'), nodeFromJSON(true));
    sparseSnapshotTreeForget(st, new Path('t'));
    expect(sparseSnapshotTreeFind(st, new Path('t'))).toBe(null);
  });

  it('Iterate children.', () => {
    const st = newSparseSnapshotTree();
    sparseSnapshotTreeRemember(
      st,
      new Path('t'),
      nodeFromJSON({ b: 'v', c: 9, art: false })
    );
    sparseSnapshotTreeRemember(st, new Path('q'), ChildrenNode.EMPTY_NODE);

    let num = 0,
      gotT = false,
      gotQ = false;
    sparseSnapshotTreeForEachChild(st, (key, child) => {
      num += 1;
      if (key === 't') {
        gotT = true;
      } else if (key === 'q') {
        gotQ = true;
      } else {
        expect(false).toBe(true);
      }
    });

    expect(gotT).toBe(true);
    expect(gotQ).toBe(true);
    expect(num).toBe(2);
  });

  it('Iterate trees.', () => {
    const st = newSparseSnapshotTree();

    let count = 0;
    sparseSnapshotTreeForEachTree(st, newEmptyPath(), (path, tree) => {
      count += 1;
    });
    expect(count).toBe(0);

    sparseSnapshotTreeRemember(st, new Path('t'), nodeFromJSON(1));
    sparseSnapshotTreeRemember(st, new Path('a/b'), nodeFromJSON(2));
    sparseSnapshotTreeRemember(st, new Path('a/x/g'), nodeFromJSON(3));
    sparseSnapshotTreeRemember(st, new Path('a/x/null'), nodeFromJSON(null));

    let num = 0,
      got1 = false,
      got2 = false,
      got3 = false,
      got4 = false;
    sparseSnapshotTreeForEachTree(st, new Path('q'), (path, node) => {
      num += 1;
      const pathString = path.toString();
      if (pathString === '/q/t') {
        got1 = true;
        expect(node.val()).toBe(1);
      } else if (pathString === '/q/a/b') {
        got2 = true;
        expect(node.val()).toBe(2);
      } else if (pathString === '/q/a/x/g') {
        got3 = true;
        expect(node.val()).toBe(3);
      } else if (pathString === '/q/a/x/null') {
        got4 = true;
        expect(node.val()).toBe(null);
      } else {
        expect(false).toBe(true);
      }
    });

    expect(got1).toBe(true);
    expect(got2).toBe(true);
    expect(got3).toBe(true);
    expect(got4).toBe(true);
    expect(num).toBe(4);
  });

  it('Set leaf, then forget deeper path', () => {
    const st = newSparseSnapshotTree();

    sparseSnapshotTreeRemember(st, new Path('foo'), nodeFromJSON('bar'));
    const safeToRemove = sparseSnapshotTreeForget(st, new Path('foo/baz'));
    // it's not safe to remove this node
    expect(safeToRemove).toBe(false);
  });
});
