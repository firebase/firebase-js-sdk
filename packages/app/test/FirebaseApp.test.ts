import { FirebaseApp } from "../src/FirebaseApp";
import { expect, use } from "chai";
import chaiAsPromised = require("chai-as-promised");

use(chaiAsPromised);

describe('FirebaseApp Tests', () => {
  it('Should copy the options object before exposing it', () => {
    const options = { hello: 'world' };
    const app = new FirebaseApp(options);

    // Value comparison
    expect(app.options).to.deep.equal(options);
    
    // Ensure that app.options isn't using the original `options` object ref
    expect(app.options).to.not.equal(options);
  });

  it('Should properly pass along `name` param if passed', () => {
    const app = new FirebaseApp({}, 'Midoriya');
    expect(app.name).to.equal('Midoriya');
  })
  it('Should have a default value for `name` param', () => {
    const app = new FirebaseApp({});
    expect(app.name).to.equal('[DEFAULT]');
  });

  it('Should throw if an invalid value for `name` is passed', () => {
    // Casting the 3 for testing purposes
    expect(() => {
      new FirebaseApp({}, 3 as any);
    }, 'Allowed a number as a valid name').to.throw();
    expect(() => {
      new FirebaseApp({}, null as any);
    }, 'Allowed null as a valid name').to.throw();
    expect(() => {
      new FirebaseApp({}, [] as any);
    }, 'Allowed an array as a valid name').to.throw();
    expect(() => {
      new FirebaseApp({}, {} as any);
    }, 'Allowed an object as a valid name').to.throw();
    expect(() => {
      new FirebaseApp({}, true as any);
    }, 'Allowed a boolean as a valid name').to.throw();
    expect(() => {
      new FirebaseApp({}, '');
    }, 'Allowed an empty string as a valid name').to.throw();
  });

  it('Should throw on property access after delete', async () => {
    const app = new FirebaseApp({});

    await app.delete();

    ['name', 'options', 'automaticDataCollectionEnabled'].forEach(prop => {
      expect(() => {
        app[prop];
      }).to.throw();
    });
  });

  it('Should throw if delete is called on deleted app', async () => {
    const app = new FirebaseApp({});

    await app.delete();

    expect(app.delete()).to.be.rejected;
  });

  it('Should fire a created event when created', done => {
    const app = new FirebaseApp({});

    app.event$.subscribe(val => {
      expect(val.type).to.equal('created');
      done();
    });
  });

  it('Should fire a deleted event when deleted', done => {
    const app = new FirebaseApp({});

    const events = ['created', 'deleted'];
    let idx = 0;

    app.event$.subscribe(val => {
      expect(val.type).to.equal(events[idx]);
      idx++;

      if (idx === events.length) {
        done();
      }
    });

    app.delete();
  });

  it('Should complete the observable after deletion', done => {
    const app = new FirebaseApp({});

    app.event$.subscribe({
      complete: () => {
        done();
      }
    });

    app.delete();
  });
});