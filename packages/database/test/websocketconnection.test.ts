import { expect } from "chai";

import { APPLICATION_ID_PARAM } from "../src/realtime/Constants";
import { WebSocketConnection } from "../src/realtime/WebSocketConnection";

import { testRepoInfo } from "./helpers/util";

describe('WebSocketConnection', () => {
    it('should add an applicationId to the query parameter', () => {
        const repoInfo = testRepoInfo('https://test-ns.firebaseio.com');
        const applicationId = 'myID';
        const websocketConnection = new WebSocketConnection('connId', repoInfo, applicationId);
        const searchParams = new URL(websocketConnection.connURL).searchParams;
        expect(searchParams.get(APPLICATION_ID_PARAM)).to.equal(applicationId);
    });
    it('should not add an applicationId to the query parameter if applicationId is empty', () => {
        const repoInfo = testRepoInfo('https://test-ns.firebaseio.com');
        const applicationId = '';
        const websocketConnection = new WebSocketConnection('connId', repoInfo, applicationId);
        const searchParams = new URL(websocketConnection.connURL).searchParams;
        expect(searchParams.get(APPLICATION_ID_PARAM)).to.be.null;
    });
});