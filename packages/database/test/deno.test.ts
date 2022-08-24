import { expect, use } from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { setTimeoutNonBlocking } from '../src/core/util/util';
use(sinonChai);
describe('Deno tests', () => {
    let oldSetTimeout;
    beforeEach(() => {
        oldSetTimeout = globalThis.setTimeout;
    });
    afterEach(() => {
        globalThis.setTimeout = oldSetTimeout;
    });
    it('should call the deno unrefTimer() if in Deno', () => {
        // @ts-ignore override nodejs behavior
        global.Deno = {
            unrefTimer: sinon.spy()
        };
        // @ts-ignore override nodejs behavior
        global.setTimeout = () => 1;
        setTimeoutNonBlocking(() => {}, 0);
        expect(globalThis.Deno.unrefTimer).to.have.been.called;
    });
    it('should not call the deno unrefTimer() if not in Deno', () => {
        // @ts-ignore override nodejs behavior
        global.Deno2 = {
            unrefTimer: sinon.spy()
        };
        // @ts-ignore override node.js behavior
        global.setTimeout = () => 1;
        setTimeoutNonBlocking(() => {}, 0);
        expect(globalThis.Deno2.unrefTimer).to.not.have.been.called;
    });
});