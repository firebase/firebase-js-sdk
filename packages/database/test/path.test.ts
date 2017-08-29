/**
* Copyright 2017 Google Inc.
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
import { Path } from '../src/core/util/Path';

describe('Path Tests', function() {
  const expectGreater = function(left, right) {
    expect(Path.comparePaths(new Path(left), new Path(right))).to.equal(1);
    expect(Path.comparePaths(new Path(right), new Path(left))).to.equal(-1);
  };

  const expectEqual = function(left, right) {
    expect(Path.comparePaths(new Path(left), new Path(right))).to.equal(0);
  };

  it('contains() contains the path and any child path.', function() {
    expect(new Path('/').contains(new Path('/a/b/c'))).to.equal(true);
    expect(new Path('/a').contains(new Path('/a/b/c'))).to.equal(true);
    expect(new Path('/a/b').contains(new Path('/a/b/c'))).to.equal(true);
    expect(new Path('/a/b/c').contains(new Path('/a/b/c'))).to.equal(true);

    expect(new Path('/a/b/c').contains(new Path('/a/b'))).to.equal(false);
    expect(new Path('/a/b/c').contains(new Path('/a'))).to.equal(false);
    expect(new Path('/a/b/c').contains(new Path('/'))).to.equal(false);

    expect(new Path('/a/b/c').popFront().contains(new Path('/b/c'))).to.equal(
      true
    );
    expect(new Path('/a/b/c').popFront().contains(new Path('/b/c/d'))).to.equal(
      true
    );

    expect(new Path('/a/b/c').contains(new Path('/b/c'))).to.equal(false);
    expect(new Path('/a/b/c').contains(new Path('/a/c/b'))).to.equal(false);

    expect(new Path('/a/b/c').popFront().contains(new Path('/a/b/c'))).to.equal(
      false
    );
    expect(new Path('/a/b/c').popFront().contains(new Path('/b/c'))).to.equal(
      true
    );
    expect(new Path('/a/b/c').popFront().contains(new Path('/b/c/d'))).to.equal(
      true
    );
  });

  it('popFront() returns the parent', function() {
    expect(new Path('/a/b/c').popFront().toString()).to.equal('/b/c');
    expect(new Path('/a/b/c').popFront().popFront().toString()).to.equal('/c');
    expect(
      new Path('/a/b/c').popFront().popFront().popFront().toString()
    ).to.equal('/');
    expect(
      new Path('/a/b/c').popFront().popFront().popFront().popFront().toString()
    ).to.equal('/');
  });

  it('parent() returns the parent', function() {
    expect(new Path('/a/b/c').parent().toString()).to.equal('/a/b');
    expect(new Path('/a/b/c').parent().parent().toString()).to.equal('/a');
    expect(new Path('/a/b/c').parent().parent().parent().toString()).to.equal(
      '/'
    );
    expect(new Path('/a/b/c').parent().parent().parent().parent()).to.equal(
      null
    );
  });

  it('comparePaths() works as expected', function() {
    expectEqual('/', '');
    expectEqual('/a', '/a');
    expectEqual('/a', '/a//');
    expectEqual('/a///b/b//', '/a/b/b');
    expectGreater('/b', '/a');
    expectGreater('/ab', '/a');
    expectGreater('/a/b', '/a');
    expectGreater('/a/b', '/a//');
  });
});
