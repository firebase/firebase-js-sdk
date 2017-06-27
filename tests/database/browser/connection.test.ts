import { expect } from "chai";
import { TEST_PROJECT, testRepoInfo } from "../helpers/util";
import { Connection } from "../../../src/database/realtime/Connection";

describe('Connection', function() {
  it('return the session id', function(done) {
    new Connection('1',
        testRepoInfo(TEST_PROJECT.databaseURL),
        message => {},
        (timestamp, sessionId) => {
          expect(sessionId).not.to.be.null;
          expect(sessionId).not.to.equal('');
          done();
        },
        () => {},
        reason => {});
  });

  // TODO - Flakey Test.  When Dev Tools is closed on my Mac, this test
  // fails about 20% of the time (open - it never fails).  In the failing
  // case a long-poll is opened first.
  // https://app.asana.com/0/58926111402292/101921715724749
  it.skip('disconnect old session on new connection', function(done) {
    const info = testRepoInfo(TEST_PROJECT.databaseURL);
    new Connection('1', info,
        message => {},
        (timestamp, sessionId) => {
          new Connection('2', info,
              message => {},
              (timestamp, sessionId) => {},
              () => {},
              reason => {},
              sessionId);
        },
        () => {
          done(); // first connection was disconnected
        },
        reason => {});
  });
});
