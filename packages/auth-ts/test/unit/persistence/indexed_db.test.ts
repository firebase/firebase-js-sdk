import { Persistence } from '../../../src/core/persistence';
import { expect } from 'chai';
import { indexedDBLocalPersistence } from '../../../src/core/persistence/indexed_db';

describe('IndexedDBLocalersistence', () => {
  it('should work', async () => {
    const persistence: Persistence = indexedDBLocalPersistence;
    const key = 'my-super-special-key';
    const value = 'my-super-special-value';
    debugger;
    expect(await persistence.get(key)).to.be.null;
    await persistence.set(key, value);
    debugger;
    expect(await persistence.get(key)).to.be.eq(value);
    expect(await persistence.get('other-key')).to.be.null;
    await persistence.remove(key);
    debugger;
    expect(await persistence.get(key)).to.be.null;
  });
});
