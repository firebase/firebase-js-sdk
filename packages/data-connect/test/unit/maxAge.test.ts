import { expect } from "chai";

import { getMaxAgeFromExtensions } from "../../src/core/query/QueryManager";

describe('maxAge', () => {
    it('should update maxAge when server returns a different maxAge', async () => {
      const maxAge = getMaxAgeFromExtensions([
        {
          path: [],
          maxAge: '100s',
        }
      ]);
      expect(maxAge).to.equal(100);
    });

    it('should return undefined when an invalid maxAge is returned', async () => {
      const maxAge = getMaxAgeFromExtensions([
        {
          path: [],
          maxAge: 'abc'
        }
      ]);
      expect(maxAge).to.equal(undefined);
    });
});