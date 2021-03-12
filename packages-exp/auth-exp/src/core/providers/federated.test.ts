import { expect } from "chai";
import { FederatedAuthProvider } from "./federated";

/** Federated provider is marked abstract; create a pass-through class */
class SimpleFederatedProvider extends FederatedAuthProvider {}

describe('core/providers/federated', () => {
  let federatedProvider: FederatedAuthProvider;

  beforeEach(() => {
    federatedProvider = new SimpleFederatedProvider('federated');
  });

  it('has the providerId', () => {
    expect(federatedProvider.providerId).to.eq('federated');
  });

  it('allows setting a default language code', () => {
    expect(federatedProvider.defaultLanguageCode).to.be.null;
    federatedProvider.setDefaultLanguage('en-US');
    expect(federatedProvider.defaultLanguageCode).to.eq('en-US');
  });

  it('can set and retrieve custom parameters', () => {
    expect(federatedProvider.getCustomParameters()).to.eql({});
    expect(federatedProvider.setCustomParameters({foo: 'bar'})).to.eq(federatedProvider);
    expect(federatedProvider.getCustomParameters()).to.eql({foo: 'bar'});
  });
});