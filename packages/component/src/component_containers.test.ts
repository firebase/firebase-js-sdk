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
import {
  ComponentContainer  
} from './component_container';
import '../test/setup';
import { Component } from './component';
import { Provider } from './provider';
import { InstantiationMode } from './types';
import { DEFAULT_ENTRY_NAME } from './contants';

function getFakeComponent(
  name: string,
  instantiationMode: InstantiationMode,
  multipleInstances: boolean = false
): Component {
  return new Component(name, () => ({ fire: true }))
    .setInstantiationMode(instantiationMode)
    .setMultipleInstance(multipleInstances);
}

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

  it('calls provideFactory with eager flag set to true when registering an EAGER component', () => {
    const provider = container.getProvider('fireball');
    const provideFactoryStub = stub(provider, 'provideFactory').callThrough();
    const component = getFakeComponent('fireball', InstantiationMode.EAGER);
    container.addComponent(component);

    expect(provideFactoryStub).has.been.calledWith(
      component.serviceFactory,
      false,
      true
    );
  });

  it('calls provideFactory with eager flag set to false when registering a LAZY component', () => {
    const provider = container.getProvider('fireball');
    const provideFactoryStub = stub(provider, 'provideFactory').callThrough();
    const component = getFakeComponent('fireball', InstantiationMode.LAZY);
    container.addComponent(component);

    expect(provideFactoryStub).has.been.calledWith(
      component.serviceFactory,
      false,
      false
    );
  });

  it('injects service factory into the Provider with the correct multipleInstances flag', () => {
    const provider = container.getProvider('multiple');
    const provideFactoryStub = stub(provider, 'provideFactory').callThrough();
    const component = getFakeComponent('multiple', InstantiationMode.LAZY, true);
    container.addComponent(component);

    expect(provideFactoryStub).has.been.calledWith(
      component.serviceFactory,
      true,
      false
    );
  });
});
