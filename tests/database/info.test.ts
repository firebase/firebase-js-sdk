import { expect } from "chai";
import { 
  getFreshRepo,
  getRootNode,
  getRandomNode,
  getPath
} from "./helpers/util";
import { Reference } from "../../src/database/api/Reference";
import { EventAccumulator } from "./helpers/EventAccumulator";

/**
 * We have a test that depends on leveraging two properly
 * configured Firebase instances. we are skiping the test
 * but I want to leave the test here for when we can refactor
 * to remove the prod firebase dependency.
 */
declare var runs;
declare var waitsFor;
declare var TEST_ALT_NAMESPACE;
declare var TEST_NAMESPACE;

describe(".info Tests", function () {
  it("Can get a reference to .info nodes.", function() {
    var f = (getRootNode() as Reference);
    expect(getPath(f.child('.info'))).to.equal('/.info');
    expect(getPath(f.child('.info/foo'))).to.equal('/.info/foo');
  });

  it("Can't write to .info", function() {
    var f = (getRootNode() as Reference).child('.info');
    expect(function() {f.set('hi');}).to.throw;
    expect(function() {f.setWithPriority('hi', 5);}).to.throw;
    expect(function() {f.setPriority('hi');}).to.throw;
    expect(function() {f.transaction(function() { });}).to.throw;
    expect(function() {f.push();}).to.throw;
    expect(function() {f.remove();}).to.throw;

    expect(function() {f.child('test').set('hi');}).to.throw;
    var f2 = f.child('foo/baz');
    expect(function() {f2.set('hi');}).to.throw;
  });

  it("Can watch .info/connected.", function() {
    return new Promise(resolve => {
      var f = (getRandomNode() as Reference).root;
      f.child('.info/connected').on('value', function(snap) {
        if (snap.val() === true) resolve();
      });
    })
  });


  it('.info/connected correctly goes to false when disconnected.', async function() {
    var f = (getRandomNode() as Reference).root;
    var everConnected = false;
    var connectHistory = '';

    const ea = new EventAccumulator(() => everConnected);
    f.child('.info/connected').on('value', function(snap) {
      if (snap.val() === true)
        everConnected = true;

      if (everConnected)
        connectHistory += snap.val() + ',';
      ea.addEvent();
    });

    await ea.promise;

    ea.reset(() => connectHistory);
    f.database.goOffline();
    f.database.goOnline();

    return ea.promise;
  });

  // Skipping this test as it is expecting a server time diff from a
  // local Firebase
  it.skip(".info/serverTimeOffset", async function() {
    var ref = (getRootNode() as Reference);

    // make sure push works
    var child = ref.push();

    var offsets = [];

    const ea = new EventAccumulator(() => offsets.length === 1);

    ref.child('.info/serverTimeOffset').on('value', function(snap) {
      offsets.push(snap.val());
      ea.addEvent();
    });

    await ea.promise;

    expect(typeof offsets[0]).to.equal('number');
    expect(offsets[0]).not.to.be.greaterThan(0);

    // Make sure push still works
    ref.push();
    ref.child('.info/serverTimeOffset').off();
  });

  it.skip("database.goOffline() / database.goOnline() connection management", function() {
    var ref = getFreshRepo(TEST_NAMESPACE);
    var refAlt = getFreshRepo(TEST_ALT_NAMESPACE);
    var ready;

    // Wait until we're connected to both Firebases
    runs(function() {
      ready = 0;
      var eventHandler = function(snap) {
        if (snap.val() === true) {
          snap.ref.off();
          ready += 1;
        }
      };
      ref.child(".info/connected").on("value", eventHandler);
      refAlt.child(".info/connected").on("value", eventHandler);
    });
    waitsFor(function() { return (ready == 2); });

    runs(function() {
      ref.database.goOffline();
      refAlt.database.goOffline();
    });

    // Ensure we're disconnected from both Firebases
    runs(function() {
      ready = 0;
      var eventHandler = function(snap) {
        expect(snap.val() === false);
        ready += 1;
      }
      ref.child(".info/connected").once("value", eventHandler);
      refAlt.child(".info/connected").once("value", eventHandler);
    });
    waitsFor(function() { return (ready == 2); });

    // Ensure that we don't automatically reconnect upon Reference creation
    runs(function() {
      ready = 0;
      var refDup = ref.database.ref();
      refDup.child(".info/connected").on("value", function(snap) {
        ready = (snap.val() === true) || ready;
      });
      setTimeout(function() {
        expect(ready).to.equal(0);
        refDup.child(".info/connected").off();
        ready = -1;
      }, 500);
    });
    waitsFor(function() { return ready == -1; });

    runs(function() {
      ref.database.goOnline();
      refAlt.database.goOnline();
    });

    // Ensure we're connected to both Firebases
    runs(function() {
      ready = 0;
      var eventHandler = function(snap) {
        if (snap.val() === true) {
          snap.ref.off();
          ready += 1;
        }
      };
      ref.child(".info/connected").on("value", eventHandler);
      refAlt.child(".info/connected").on("value", eventHandler);
    });

    waitsFor(function() {
      return (ready == 2);
    });
  });
});
