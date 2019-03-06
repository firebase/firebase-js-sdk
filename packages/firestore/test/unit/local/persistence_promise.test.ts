/**
 * @license
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

import { expect } from 'chai';
import { PersistencePromise } from '../../../src/local/persistence_promise';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe('PersistencePromise', () => {
  function async<R>(value: R): PersistencePromise<R> {
    return new PersistencePromise<R>((resolve, reject) => {
      setTimeout(() => resolve(value), 0);
    });
  }

  function sync<R>(value: R): PersistencePromise<R> {
    return new PersistencePromise<R>((resolve, reject) => {
      resolve(value);
    });
  }

  const error = new Error('error');

  it('Can chain synchronous functions', () => {
    return sync(1)
      .next(x => x + 1)
      .next(x => sync(x + 1))
      .next(x => x + 1)
      .next(x => sync(x + 1))
      .next(x => {
        expect(x).to.equal(5);
      })
      .toPromise();
  });

  it('Can chain asynchronous functions', () => {
    return async(1)
      .next(x => x + 1)
      .next(x => async(x + 1))
      .next(x => x + 1)
      .next(x => async(x + 1))
      .next(x => {
        expect(x).to.equal(5);
      })
      .toPromise();
  });

  it('Can catch synchronous functions', () => {
    return sync('good')
      .next(() => {
        throw error;
      })
      .catch(x => x)
      .next(x => {
        expect(x).to.equal(error);
      })
      .toPromise();
  });

  it('Can catch asynchronous functions', () => {
    return async('good')
      .next(() => {
        throw error;
      })
      .catch(x => x)
      .next(x => {
        expect(x).to.equal(error);
      })
      .toPromise();
  });

  it('ignores catches without errors', () => {
    let catchClause: Error | undefined = undefined;
    return sync(1)
      .next(x => x + 1)
      .catch(x => {
        catchClause = x;
      })
      .next(x => {
        expect(x).to.equal(2);
        expect(catchClause).to.be.undefined;
      })
      .toPromise();
  });

  it('ignores catches without errors async', () => {
    let catchClause: Error | undefined = undefined;
    return async(1)
      .next(x => x + 1)
      .catch(x => {
        catchClause = x;
      })
      .next(x => {
        expect(x).to.equal(2);
        expect(catchClause).to.be.undefined;
      })
      .toPromise();
  });

  it('can catch errors twice sync', () => {
    return sync(1)
      .next(() => {
        throw new Error('one');
      })
      .catch(x => {
        throw new Error('two');
      })
      .catch(x => {
        return 1;
      })
      .next(x => {
        expect(x).to.equal(1);
      })
      .toPromise();
  });

  it('can catch errors twice async', () => {
    return async(1)
      .next(() => {
        throw new Error('one');
      })
      .catch(x => {
        throw new Error('two');
      })
      .catch(x => {
        return 1;
      })
      .next(x => {
        expect(x).to.equal(1);
      })
      .toPromise();
  });

  it('can return undefined sync', () => {
    return sync(1)
      .next(() => {})
      .toPromise();
  });

  it('can return undefined async', () => {
    return async(1)
      .next(() => {})
      .toPromise();
  });

  it('can waitFor sync', () => {
    let counter = 0;
    const updates: Array<PersistencePromise<void>> = [];
    for (let i = 0; i < 5; i++) {
      updates.push(
        sync(1).next(x => {
          counter = counter + x;
        })
      );
    }
    return PersistencePromise.waitFor(updates)
      .next(() => {
        expect(counter).to.equal(5);
      })
      .toPromise();
  });

  it('can waitFor async', () => {
    let counter = 0;
    const updates: Array<PersistencePromise<void>> = [];
    for (let i = 0; i < 5; i++) {
      updates.push(
        async(1).next(x => {
          counter = counter + x;
          return async<void>(undefined);
        })
      );
    }
    return PersistencePromise.waitFor(updates)
      .next(() => {
        expect(counter).to.equal(5);
      })
      .toPromise();
  });

  it('can waitFor async error', () => {
    let counter = 0;
    const updates: Array<PersistencePromise<void>> = [];
    updates.push(
      async(1).next(x => {
        counter = counter + x;
      })
    );
    updates.push(
      async(1).next<void>(x => {
        throw error;
      })
    );

    return PersistencePromise.waitFor(updates)
      .next(() => {
        expect.fail('Promise should fail');
      })
      .catch(error => {
        expect(counter).to.equal(1);
        expect(error).to.equal(error);
      })
      .toPromise();
  });

  it('propagates error for waitFor()', () => {
    const resolved = PersistencePromise.resolve('resolved');
    const rejected: PersistencePromise<string> = PersistencePromise.reject(
      new Error('rejected')
    );

    const p = PersistencePromise.waitFor([resolved, rejected]).toPromise();

    return expect(p).to.be.eventually.rejectedWith('rejected');
  });

  it('propagates error for forEach()', () => {
    const p = PersistencePromise.forEach([true, false], success => {
      if (success) {
        return PersistencePromise.resolve();
      } else {
        return PersistencePromise.reject<void>(new Error('rejected'));
      }
    }).toPromise();

    return expect(p).to.be.eventually.rejectedWith('rejected');
  });
});
