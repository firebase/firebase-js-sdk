/**
 * @license
 * Copyright 2019 Google Inc.
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
import { stub } from 'sinon';
import { ComponentContainer } from './component_container';
import '../test/setup';
import { Provider } from './provider';
import { InstantiationMode } from './types';
import { DEFAULT_ENTRY_NAME } from './contants';
import { getFakeComponent } from '../test/util';


describe('Component Container', () => {
  let container: ComponentContainer;
  beforeEach(() => {
    container = new ComponentContainer(DEFAULT_ENTRY_NAME);
  });

  it('returns a service provider given a name', () => {
    expect(container.getProvider('rocket')).to.be.an.instanceof(Provider);
  });

  it('returns the same provider instance for the same name', () => {
    const provider1 = container.getProvider('ship');
    const provider2 = container.getProvider('ship');

    expect(provider1).to.eq(provider2);
  });

  it('calls setComponent() on provider with the same name when registering a component', () => {
    const provider = container.getProvider('fireball');
    const setComponentStub = stub(provider, 'setComponent').callThrough();
    const component = getFakeComponent('fireball', ()=>({}), true, InstantiationMode.EAGER);
    container.addComponent(component);

    expect(setComponentStub).has.been.calledWith(component);
  });

  it('throws when registering multiple components with the same name', () => {
    const component1 = getFakeComponent('fireball', ()=>({}), true, InstantiationMode.EAGER);
    const component2 = getFakeComponent('fireball', ()=>({ test: true }), false, InstantiationMode.LAZY);

    expect(() => container.addComponent(component1)).to.not.throw();
    expect(() => container.addComponent(component2)).to.throw(/Component fireball has already been registered with/);

  });
});
