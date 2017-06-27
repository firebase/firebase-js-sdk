import { testRepoInfo } from "./helpers/util";
import { CONSTANTS } from "../../src/database/realtime/Constants";
import { expect } from "chai";

describe('RepoInfo', function() {
  it('should return the correct URL', function() {
    var repoInfo = testRepoInfo('https://test-ns.firebaseio.com');

    var urlParams = {};
    urlParams[CONSTANTS.VERSION_PARAM] = CONSTANTS.PROTOCOL_VERSION;
    urlParams[CONSTANTS.LAST_SESSION_PARAM] = 'test';

    var websocketUrl = repoInfo.connectionURL(CONSTANTS.WEBSOCKET, urlParams);
    expect(websocketUrl).to.equal('wss://test-ns.firebaseio.com/.ws?v=5&ls=test');

    var longPollingUrl = repoInfo.connectionURL(CONSTANTS.LONG_POLLING, urlParams);
    expect(longPollingUrl).to.equal('https://test-ns.firebaseio.com/.lp?v=5&ls=test');
  });
});
