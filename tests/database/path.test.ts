import { expect } from "chai";
import { Path } from "../../src/database/core/util/Path";

describe('Path Tests', function () {
  var expectGreater = function(left, right) {
    expect(Path.comparePaths(new Path(left), new Path(right))).to.equal(1)
    expect(Path.comparePaths(new Path(right), new Path(left))).to.equal(-1)
  };

  var expectEqual = function(left, right) {
    expect(Path.comparePaths(new Path(left), new Path(right))).to.equal(0)
  };

  it('contains() contains the path and any child path.', function () {
    expect(new Path('/').contains(new Path('/a/b/c'))).to.equal(true);
    expect(new Path('/a').contains(new Path('/a/b/c'))).to.equal(true);
    expect(new Path('/a/b').contains(new Path('/a/b/c'))).to.equal(true);
    expect(new Path('/a/b/c').contains(new Path('/a/b/c'))).to.equal(true);

    expect(new Path('/a/b/c').contains(new Path('/a/b'))).to.equal(false);
    expect(new Path('/a/b/c').contains(new Path('/a'))).to.equal(false);
    expect(new Path('/a/b/c').contains(new Path('/'))).to.equal(false);

    expect(new Path('/a/b/c').popFront().contains(new Path('/b/c'))).to.equal(true);
    expect(new Path('/a/b/c').popFront().contains(new Path('/b/c/d'))).to.equal(true);

    expect(new Path('/a/b/c').contains(new Path('/b/c'))).to.equal(false);
    expect(new Path('/a/b/c').contains(new Path('/a/c/b'))).to.equal(false);

    expect(new Path('/a/b/c').popFront().contains(new Path('/a/b/c'))).to.equal(false);
    expect(new Path('/a/b/c').popFront().contains(new Path('/b/c'))).to.equal(true);
    expect(new Path('/a/b/c').popFront().contains(new Path('/b/c/d'))).to.equal(true);
  });

  it('popFront() returns the parent', function() {
    expect(new Path('/a/b/c').popFront().toString()).to.equal('/b/c')
    expect(new Path('/a/b/c').popFront().popFront().toString()).to.equal('/c');
    expect(new Path('/a/b/c').popFront().popFront().popFront().toString()).to.equal('/');
    expect(new Path('/a/b/c').popFront().popFront().popFront().popFront().toString()).to.equal('/');
  });

  it('parent() returns the parent', function() {
    expect(new Path('/a/b/c').parent().toString()).to.equal('/a/b');
    expect(new Path('/a/b/c').parent().parent().toString()).to.equal('/a');
    expect(new Path('/a/b/c').parent().parent().parent().toString()).to.equal('/');
    expect(new Path('/a/b/c').parent().parent().parent().parent()).to.equal(null);
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
