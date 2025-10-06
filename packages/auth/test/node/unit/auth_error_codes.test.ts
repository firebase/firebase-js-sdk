import { expect } from 'chai';
import { AuthErrorCodes } from '../../../src';

describe('AuthErrorCodes', () => {
  it('exports MISSING_PASSWORD', () => {
    expect(AuthErrorCodes.MISSING_PASSWORD).to.equal('auth/missing-password');
  });
});
