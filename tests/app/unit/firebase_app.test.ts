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
import {
  createFirebaseNamespace,
  FirebaseNamespace,
  FirebaseApp,
  FirebaseService
} from '../../../src/app/firebase_app';
import {assert} from 'chai';

describe("Firebase App Class", () => {
  let firebase: FirebaseNamespace;

  beforeEach(() => {
    firebase = createFirebaseNamespace();
  });

  it("No initial apps.", () => {
    assert.equal(firebase.apps.length, 0);
  });

  it("Can intialize DEFAULT App.", () => {
    let app = firebase.initializeApp({});
    assert.equal(firebase.apps.length, 1);
    assert.strictEqual(app, firebase.apps[0]);
    assert.equal(app.name, '[DEFAULT]');
    assert.strictEqual(firebase.app(), app);
    assert.strictEqual(firebase.app('[DEFAULT]'), app);
  });

  it("Can get options of App.", () => {
    const options = {'test': 'option'};
    let app = firebase.initializeApp(options);
    assert.deepEqual((app.options as any), (options as any));
  });

  it("Can delete App.", () => {
    let app = firebase.initializeApp({});
    assert.equal(firebase.apps.length, 1);
    return app.delete()
      .then(() => {
        assert.equal(firebase.apps.length, 0);
      });
  });

  it("Register App Hook", (done) => {
    let events = ['create', 'delete'];
    let hookEvents = 0;
    let app: FirebaseApp;;
    firebase.INTERNAL.registerService(
      'test',
      (app: FirebaseApp) => {
        return new TestService(app);
      },
      undefined,
      (event: string, app: FirebaseApp) => {
        assert.equal(event, events[hookEvents]);
        hookEvents += 1;
        if (hookEvents === events.length) {
          done();
        }
      });
    app = firebase.initializeApp({});
    // Ensure the hook is called synchronously
    assert.equal(hookEvents, 1);
    app.delete();
  });

  it("Can create named App.", () => {
    let app = firebase.initializeApp({}, 'my-app');
    assert.equal(firebase.apps.length, 1);
    assert.equal(app.name, 'my-app');
    assert.strictEqual(firebase.app('my-app'), app);
  });

  it("Can create named App and DEFAULT app.", () => {
    firebase.initializeApp({}, 'my-app');
    assert.equal(firebase.apps.length, 1);
    firebase.initializeApp({});
    assert.equal(firebase.apps.length, 2);
  });

  it("Can get app via firebase namespace.", () => {
    firebase.initializeApp({});
  });

  it("Duplicate DEFAULT initialize is an error.", () => {
    firebase.initializeApp({});
    assert.throws(() => {
      firebase.initializeApp({});
    }, /\[DEFAULT\].*exists/i);
  });

  it("Duplicate named App initialize is an error.", () => {
    firebase.initializeApp({}, 'abc');
    assert.throws(() => {
      firebase.initializeApp({}, 'abc');
    }, /'abc'.*exists/i);
  });

  it("Modifying options object does not change options.", () => {
    let options = {opt: 'original', nested: {opt: 123}};
    firebase.initializeApp(options);
    options.opt = 'changed';
    options.nested.opt = 456;
    assert.deepEqual(firebase.app().options,
                     {opt: 'original', nested: {opt: 123}});
  });

  it("Error to use app after it is deleted.", () => {
    let app = firebase.initializeApp({});
    return app.delete()
      .then(() => {
        assert.throws(() => {
          console.log(app.name);
        }, /already.*deleted/);
      });
  });

  it("OK to create same-name app after it is deleted.", () => {
    let app = firebase.initializeApp({}, 'app-name');
    return app.delete()
      .then(() => {
        let app2 = firebase.initializeApp({}, 'app-name');
        assert.ok(app !== app2, "Expect new instance.");
        // But original app id still orphaned.
        assert.throws(() => {
          console.log(app.name);
        }, /already.*deleted/);
      });
  });

  it("Only calls createService on first use (per app).", () => {
    let registrations = 0;
    firebase.INTERNAL.registerService('test', (app: FirebaseApp) => {
      registrations += 1;
      return new TestService(app);
    });
    let app = firebase.initializeApp({});
    assert.equal(registrations, 0);
    (firebase as any).test();
    assert.equal(registrations, 1);
    (firebase as any).test();
    assert.equal(registrations, 1);
    (firebase as any).test(app);
    assert.equal(registrations, 1);
    (app as any).test();
    assert.equal(registrations, 1);

    app = firebase.initializeApp({}, 'second');
    assert.equal(registrations, 1);
    (app as any).test();
    assert.equal(registrations, 2);
  });

  describe("Check for bad app names", () => {
    let tests = ["", 123, false, null];
    for (let data of tests) {
      it("where name == '" + data + "'", () => {
        assert.throws(() => {
          firebase.initializeApp({}, data as string);
        }, /Illegal app name/i);;
      });
    }
  });
});

class TestService implements FirebaseService {
  constructor(private app_: FirebaseApp) {
    // empty
  }

  // TODO(koss): Shouldn't this just be an added method on
  // the service instance?
  get app(): FirebaseApp {
    return this.app_;
  }

  delete(): Promise<void> {
    return new Promise((resolve: (v?: void) => void) => {
      setTimeout(() => resolve(), 10);
    });
  }
}
