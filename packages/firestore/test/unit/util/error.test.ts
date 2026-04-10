import { expect } from 'chai';
import { Code, FirestoreError } from '../../../src/util/error';
import { ErrorAuthInfo, enableContextualErrors, throwContextualError } from '@firebase/util';

describe('enrichFirestoreError', () => {
  beforeEach(() => {
    enableContextualErrors(true);
  });

  afterEach(() => {
    enableContextualErrors(false);
  });

  it('returns a FirestoreError', () => {
    const err = new FirestoreError(Code.UNKNOWN, 'original message');
    expect(err).to.be.instanceOf(FirestoreError);
  });

  it('formats message with customData', () => {
    const err = new FirestoreError(Code.UNKNOWN, 'original message', { foo: 'bar' });
    const enriched = throwContextualError(err, null);
    expect(enriched.message).to.contain('original message {"foo":"bar"}');
  });

  it('formats message with authInfo', () => {
    const err = new FirestoreError(Code.UNKNOWN, 'original message');
    const authInfo: ErrorAuthInfo = {
      userId: 'uid123',
      email: 'user@example.com',
      emailVerified: true,
      isAnonymous: false
    };
    const enriched = throwContextualError(err, authInfo);
    expect(enriched.message).to.contain('original message');
    expect(enriched.message).to.contain('"userId":"uid123"');
  });

  it('preserves data in customData', () => {
    const err = new FirestoreError(Code.UNKNOWN, 'original message', { foo: 'bar' });
    const authInfo: ErrorAuthInfo = {
      userId: 'uid123',
      email: 'user@example.com',
      emailVerified: true,
      isAnonymous: false
    };
    const enriched = throwContextualError(err, authInfo);
    expect(enriched.customData).to.deep.include({ foo: 'bar' });
    expect((enriched.customData as any).authInfo).to.deep.equal(authInfo);
  });

  it('does not enrich message when disabled', () => {
    enableContextualErrors(false);
    const err = new FirestoreError(Code.UNKNOWN, 'original message', { foo: 'bar' });
    const enriched = throwContextualError(err, null);
    expect(enriched.message).to.equal('original message');
    expect(enriched).to.equal(err);
  });
});
