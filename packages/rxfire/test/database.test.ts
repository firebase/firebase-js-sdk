import { expect } from 'chai';
import { initializeApp, database, app } from 'firebase';
import { fromRef } from '../database/fromRef';

let ref: (path: string) => database.Reference;
let batch = () => {
  let batch = {};
  const items = [{ name: 'one' }, { name: 'two' }, { name: 'three' }]
    .map(item => ( { key: createId(), ...item } ));
  Object.keys(items).forEach(function (key) {
    const itemValue = items[key];
    batch[itemValue.key] = itemValue;
  });
  // make batch immutable to preserve integrity
  return Object.freeze(batch);
}

const createId = () =>
  Math.random()
    .toString(36)
    .substring(5);

describe('RxFire Database', () => {
  let app: app.App = null;
  let database: database.Database = null;
  let ref = (path: string) => { 
    app.database().goOffline(); 
    return app.database().ref(path); 
  };

  /**
   * Each test runs inside it's own app instance and the app
   * is deleted after the test runs.
   *
   * Database tests run "offline" to reduce "flakeyness".
   *
   * Each test is responsible for seeding and removing data. Helper
   * functions are useful if the process becomes brittle or tedious.
   * Note that removing is less necessary since the tests are run
   * offline.
   * 
   * Note: Database tests do not run exactly the same offline as
   * they do online. Querying can act differently, tests must
   * account for this.
   */
  beforeEach(() => {
    app = initializeApp({ 
      projectId: 'rxfire-test-db',
      databaseURL: "https://rxfire-test.firebaseio.com",
    });
    database = app.database();
    database.goOffline();
  });

  afterEach((done: MochaDone) => {
    app.delete().then(() => done());
  });

  describe('fromRef', () => {

    it('should complete using a once', (done) => {
      const itemRef = ref(createId());
      itemRef.set(batch());
      const obs = fromRef(itemRef, 'value', 'once');
      obs.subscribe(_ => {}, () => {}, done);
    });

  });

  
});
