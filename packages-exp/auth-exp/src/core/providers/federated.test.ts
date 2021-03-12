/**
 * @license
 * Copyright 2020 Google LLC
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
import { FederatedAuthProvider } from './federated';

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
    expect(federatedProvider.setCustomParameters({ foo: 'bar' })).to.eq(
      federatedProvider
    );
    expect(federatedProvider.getCustomParameters()).to.eql({ foo: 'bar' });
  });
});
