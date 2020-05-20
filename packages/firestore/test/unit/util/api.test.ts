/**
 * @license
 * Copyright 2017 Google LLC
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
import { makeConstructorPrivate } from '../../../src/api/public_wrappers';

describe('makeConstructorPrivate', () => {
  class PrivateClass {
    x = 'x-value';
    private _y = 'y-value';

    getY(): string {
      return this._y;
    }

    setY(newValue: string): void {
      this._y = newValue;
    }

    static foobar(): string {
      return 'foobar-value';
    }

    static make(): PrivateClass {
      return new PrivateClass();
    }
  }

  // tslint:disable-next-line:variable-name We're treating this as a class name.
  const PublicClass = makeConstructorPrivate(PrivateClass);

  it('throws on instantiation', () => {
    expect(() => new PublicClass()).to.throw();
  });

  it('still exposes static methods', () => {
    expect(PublicClass.foobar()).to.equal('foobar-value');
  });

  it('still works with instanceof methods', () => {
    const x = PublicClass.make();
    const y = new PrivateClass();
    expect(x instanceof PublicClass).to.equal(true);
    expect(x instanceof PrivateClass).to.equal(true);
    expect(y instanceof PublicClass).to.equal(true);
    expect(y instanceof PrivateClass).to.equal(true);
  });

  it('still works with class members', () => {
    const instance = PublicClass.make();
    expect(instance.x).to.equal('x-value');
    expect(instance.getY()).to.equal('y-value');
    instance.x = 'new-x-value';
    instance.setY('new-y-value');
    expect(instance.x).to.equal('new-x-value');
    expect(instance.getY()).to.equal('new-y-value');
  });
});
