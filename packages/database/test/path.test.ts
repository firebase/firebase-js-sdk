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

import {
  Path,
  pathCompare,
  pathContains,
  pathParent,
  pathPopFront
} from '../src/core/util/Path';

describe('Path Tests', () => {
  const expectGreater = function (left, right) {
    expect(pathCompare(new Path(left), new Path(right))).to.be.greaterThan(0);
    expect(pathCompare(new Path(right), new Path(left))).to.be.lessThan(0);
  };

  const expectEqual = function (left, right) {
    expect(pathCompare(new Path(left), new Path(right))).to.equal(0);
  };

  it('contains() contains the path and any child path.', () => {
    expect(pathContains(new Path('/'), new Path('/a/b/c'))).to.equal(true);
    expect(pathContains(new Path('/a'), new Path('/a/b/c'))).to.equal(true);
    expect(pathContains(new Path('/a/b'), new Path('/a/b/c'))).to.equal(true);
    expect(pathContains(new Path('/a/b/c'), new Path('/a/b/c'))).to.equal(true);

    expect(pathContains(new Path('/a/b/c'), new Path('/a/b'))).to.equal(false);
    expect(pathContains(new Path('/a/b/c'), new Path('/a'))).to.equal(false);
    expect(pathContains(new Path('/a/b/c'), new Path('/'))).to.equal(false);

    expect(
      pathContains(pathPopFront(new Path('/a/b/c')), new Path('/b/c'))
    ).to.equal(true);
    expect(
      pathContains(pathPopFront(new Path('/a/b/c')), new Path('/b/c/d'))
    ).to.equal(true);

    expect(pathContains(new Path('/a/b/c'), new Path('/b/c'))).to.equal(false);
    expect(pathContains(new Path('/a/b/c'), new Path('/a/c/b'))).to.equal(
      false
    );

    expect(
      pathContains(pathPopFront(new Path('/a/b/c')), new Path('/a/b/c'))
    ).to.equal(false);
    expect(
      pathContains(pathPopFront(new Path('/a/b/c')), new Path('/b/c'))
    ).to.equal(true);
    expect(
      pathContains(pathPopFront(new Path('/a/b/c')), new Path('/b/c/d'))
    ).to.equal(true);
  });

  it('popFront() returns the parent', () => {
    expect(pathPopFront(new Path('/a/b/c')).toString()).to.equal('/b/c');
    expect(pathPopFront(pathPopFront(new Path('/a/b/c'))).toString()).to.equal(
      '/c'
    );
    expect(
      pathPopFront(pathPopFront(pathPopFront(new Path('/a/b/c')))).toString()
    ).to.equal('/');
    expect(
      pathPopFront(
        pathPopFront(pathPopFront(pathPopFront(new Path('/a/b/c'))))
      ).toString()
    ).to.equal('/');
  });

  it('parent() returns the parent', () => {
    expect(pathParent(new Path('/a/b/c')).toString()).to.equal('/a/b');
    expect(pathParent(pathParent(new Path('/a/b/c'))).toString()).to.equal(
      '/a'
    );
    expect(
      pathParent(pathParent(pathParent(new Path('/a/b/c')))).toString()
    ).to.equal('/');
    expect(
      pathParent(pathParent(pathParent(pathParent(new Path('/a/b/c')))))
    ).to.equal(null);
  });

  it('comparePaths() works as expected', () => {
    expectEqual('/', '');
    expectEqual('/a', '/a');
    expectEqual('/a', '/a//');
    expectEqual('/a///b/b//', '/a/b/b');
    expectGreater('/b', '/a');
    expectGreater('/ab', '/a');
    expectGreater('/a/b', '/a');
    expectGreater('/a/b', '/a//');
    expectGreater('/a/0971500000', '/a/00403311635');
    expectGreater('/a/0971500000', '/a/971500000');
  });
});
