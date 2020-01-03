import { expect } from 'chai';
import '../../test/setup';
import { FirebaseAppImplNext } from './firebaseApp';
import { ComponentContainer } from '@firebase/component';
import { FirebaseAppInternalNext } from './types';

describe('FirebaseAppNext', () => {
  it('has various accessors', () => {
    const options = {
      apiKey: 'APIKEY'
    };
    const app = new FirebaseAppImplNext(
      options,
      { name: 'test', automaticDataCollectionEnabled: false },
      new ComponentContainer('test')
    );

    expect(app.automaticDataCollectionEnabled).to.be.false;
    expect(app.name).to.equal('test');
    expect(app.options).to.deep.equal(options);
  });

  it('deep-copies options', () => {
    const options = {
      apiKey: 'APIKEY'
    };
    const app = new FirebaseAppImplNext(
      options,
      { name: 'test', automaticDataCollectionEnabled: false },
      new ComponentContainer('test')
    );

    expect(app.options).to.not.equal(options);
    expect(app.options).to.deep.equal(options);
  });

  it('sets automaticDataCollectionEnabled', () => {
    const app = new FirebaseAppImplNext(
      {},
      { name: 'test', automaticDataCollectionEnabled: false },
      new ComponentContainer('test')
    );

    expect(app.automaticDataCollectionEnabled).to.be.false;
    app.automaticDataCollectionEnabled = true;
    expect(app.automaticDataCollectionEnabled).to.be.true;
  });

  it('throws accessing any property after being deleted', () => {
    const app = new FirebaseAppImplNext(
      {},
      { name: 'test', automaticDataCollectionEnabled: false },
      new ComponentContainer('test')
    );

    expect(() => app.name).to.not.throw();
    ((app as unknown) as FirebaseAppInternalNext).isDeleted = true;

    expect(() => {
      app.name;
    }).throws("Firebase App named 'test' already deleted");
    expect(() => app.options).throws(
      "Firebase App named 'test' already deleted"
    );
    expect(() => app.automaticDataCollectionEnabled).throws(
      "Firebase App named 'test' already deleted"
    );
  });
});
