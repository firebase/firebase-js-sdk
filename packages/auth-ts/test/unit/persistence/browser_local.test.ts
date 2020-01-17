import { Persistence } from '../../../src/core/persistence';
import { expect } from 'chai';
import { browserLocalPersistence } from '../../../src/core/persistence/browser_local';

describe('BrowserLocalPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should work', async () => {
    const persistence: Persistence = browserLocalPersistence;
    const key = 'my-super-special-key';
    const value = 'my-super-special-value';
    expect(await persistence.get(key)).to.be.null;
    await persistence.set(key, value);
    expect(await persistence.get(key)).to.be.eq(value);
    expect(await persistence.get('other-key')).to.be.null;
    await persistence.remove(key);
    expect(await persistence.get(key)).to.be.null;
  });
});
