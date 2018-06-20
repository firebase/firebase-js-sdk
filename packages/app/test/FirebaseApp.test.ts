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

  it('Should have a default value for `name` param', () => {
    const app = new FirebaseApp({});
    expect(app.name).to.equal('[DEFAULT]');
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
});