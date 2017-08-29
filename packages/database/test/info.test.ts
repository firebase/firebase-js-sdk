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
import {
  getFreshRepo,
  getRootNode,
  getRandomNode,
  getPath
} from './helpers/util';
import { Reference } from '../src/api/Reference';
import { EventAccumulator } from './helpers/EventAccumulator';

/**
 * We have a test that depends on leveraging two properly
 * configured Firebase instances. we are skiping the test
 * but I want to leave the test here for when we can refactor
 * to remove the prod firebase dependency.
 */
declare const runs;
declare const waitsFor;
declare const TEST_ALT_NAMESPACE;
declare const TEST_NAMESPACE;

describe('.info Tests', function() {
  this.timeout(3000);
  it('Can get a reference to .info nodes.', function() {
    const f = getRootNode() as Reference;
    expect(getPath(f.child('.info'))).to.equal('/.info');
    expect(getPath(f.child('.info/foo'))).to.equal('/.info/foo');
  });

  it("Can't write to .info", function() {
    const f = (getRootNode() as Reference).child('.info');
    expect(function() {
      f.set('hi');
    }).to.throw;
    expect(function() {
      f.setWithPriority('hi', 5);
    }).to.throw;
    expect(function() {
      f.setPriority('hi');
    }).to.throw;
    expect(function() {
      f.transaction(function() {});
    }).to.throw;
    expect(function() {
      f.push();
    }).to.throw;
    expect(function() {
      f.remove();
    }).to.throw;

    expect(function() {
      f.child('test').set('hi');
    }).to.throw;
    const f2 = f.child('foo/baz');
    expect(function() {
      f2.set('hi');
    }).to.throw;
  });

  it('Can watch .info/connected.', function() {
    return new Promise(resolve => {
      const f = (getRandomNode() as Reference).root;
      f.child('.info/connected').on('value', function(snap) {
        if (snap.val() === true) resolve();
      });
    });
  });

  it('.info/connected correctly goes to false when disconnected.', async function() {
    const f = (getRandomNode() as Reference).root;
    let everConnected = false;
    let connectHistory = '';

    const ea = new EventAccumulator(() => everConnected);
    f.child('.info/connected').on('value', function(snap) {
      if (snap.val() === true) everConnected = true;

      if (everConnected) connectHistory += snap.val() + ',';
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
  it.skip('.info/serverTimeOffset', async function() {
    const ref = getRootNode() as Reference;

    // make sure push works
    const child = ref.push();

    const offsets = [];

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

  it.skip(
    'database.goOffline() / database.goOnline() connection management',
    function() {
      const ref = getFreshRepo(TEST_NAMESPACE);
      const refAlt = getFreshRepo(TEST_ALT_NAMESPACE);
      let ready;

      // Wait until we're connected to both Firebases
      runs(function() {
        ready = 0;
        const eventHandler = function(snap) {
          if (snap.val() === true) {
            snap.ref.off();
            ready += 1;
          }
        };
        ref.child('.info/connected').on('value', eventHandler);
        refAlt.child('.info/connected').on('value', eventHandler);
      });
      waitsFor(function() {
        return ready == 2;
      });

      runs(function() {
        ref.database.goOffline();
        refAlt.database.goOffline();
      });

      // Ensure we're disconnected from both Firebases
      runs(function() {
        ready = 0;
        const eventHandler = function(snap) {
          expect(snap.val() === false);
          ready += 1;
        };
        ref.child('.info/connected').once('value', eventHandler);
        refAlt.child('.info/connected').once('value', eventHandler);
      });
      waitsFor(function() {
        return ready == 2;
      });

      // Ensure that we don't automatically reconnect upon Reference creation
      runs(function() {
        ready = 0;
        const refDup = ref.database.ref();
        refDup.child('.info/connected').on('value', function(snap) {
          ready = snap.val() === true || ready;
        });
        setTimeout(function() {
          expect(ready).to.equal(0);
          refDup.child('.info/connected').off();
          ready = -1;
        }, 500);
      });
      waitsFor(function() {
        return ready == -1;
      });

      runs(function() {
        ref.database.goOnline();
        refAlt.database.goOnline();
      });

      // Ensure we're connected to both Firebases
      runs(function() {
        ready = 0;
        const eventHandler = function(snap) {
          if (snap.val() === true) {
            snap.ref.off();
            ready += 1;
          }
        };
        ref.child('.info/connected').on('value', eventHandler);
        refAlt.child('.info/connected').on('value', eventHandler);
      });

      waitsFor(function() {
        return ready == 2;
      });
    }
  );
});
