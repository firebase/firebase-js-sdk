import { validateArgs } from '../../src/util/validateArgs';
import { getDataConnect } from '../../src';
import { expect } from 'chai';
describe('Utils', () => {
    it('[Vars required: true] should throw if no arguments are provided', () => {
        const connectorConfig = { connector: 'c', location: 'l', service: 's'};
        expect(() => validateArgs(connectorConfig, undefined, false, true)).to.throw('Variables required');
    });
    it('[vars required: false, vars provided: false] should return data connect instance and no variables', () => {
        const connectorConfig = { connector: 'c', location: 'l', service: 's'};
        const dc = getDataConnect(connectorConfig);
        expect(validateArgs(connectorConfig)).to.deep.eq({ dc, vars: undefined});
    });
    it('[vars required: false, vars provided: false, data connect provided: true] should return data connect instance and no variables', () => {
        const connectorConfig = { connector: 'c', location: 'l', service: 's'};
        const dc = getDataConnect(connectorConfig);
        expect(validateArgs(connectorConfig, dc)).to.deep.eq({ dc, vars: undefined});
    });
    it('[vars required: true, vars provided: true, data connect provided: true] should return data connect instance and variables', () => {
        const connectorConfig = { connector: 'c', location: 'l', service: 's'};
        const dc = getDataConnect(connectorConfig);
        const vars = { a: 1 };
        expect(validateArgs(connectorConfig, dc, vars)).to.deep.eq({  dc, vars});
    });
});