import { expect } from 'chai';
import { TransportOptions, areTransportOptionsEqual, connectDataConnectEmulator, getDataConnect} from '../../src/api/DataConnect';
import { app } from '../util';
import { queryRef } from '../../src';
describe.only('Transport Options', () => {
    it('should return false if transport options are not equal', () => {
        const transportOptions1: TransportOptions = {
            host: 'h',
            port: 1,
            sslEnabled: false
        };
        const transportOptions2: TransportOptions = {
            host: 'h2',
            port: 2,
            sslEnabled: false
        };
        expect(areTransportOptionsEqual(transportOptions1, transportOptions2)).to.eq(false);
    });
    it('should return true if transport options are equal', () => {
        const transportOptions1: TransportOptions = {
            host: 'h',
            port: 1,
            sslEnabled: false
        };
        const transportOptions2: TransportOptions = {
            host: 'h',
            port: 1,
            sslEnabled: false
        };
        expect(areTransportOptionsEqual(transportOptions1, transportOptions2)).to.eq(true);
    });
    it.only('should throw if emulator is connected to with new transport options', () => {
        const dc = getDataConnect(app, {
            connector: 'c',
            location: 'l',
            service: 's'
        });
        expect(() => connectDataConnectEmulator(dc, 'h', 80, false)).to.not.throw();
        queryRef(dc, 'query');
        expect(() => connectDataConnectEmulator(dc, 'h2', 80, false)).to.throw('DataConnect instance already initialized!');
    });
    it.only('should not throw if emulator is connected to with the same transport options', () => {
        const dc = getDataConnect(app, {
            connector: 'c',
            location: 'l',
            service: 's'
        });
        expect(() => connectDataConnectEmulator(dc, 'h', 80, false)).to.not.throw();
        queryRef(dc, 'query');
        expect(() => connectDataConnectEmulator(dc, 'h', 80, false)).to.not.throw();
    });
});