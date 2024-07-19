import { deleteApp, initializeApp } from "@firebase/app";
import { ConnectorConfig, getDataConnect } from "../../src";
import { expect } from "chai";

describe('Data Connect Test', () => {
    it('should throw an error if `projectId` is not provided', () => {
        const app = initializeApp({});
        expect(() => getDataConnect({ connector: 'c', location: 'l', service: 's'})).to.throw('Project ID must be provided. Did you pass in a proper projectId to initializeApp?');
        deleteApp(app);
    });
    it('should not throw an error if `projectId` is provided', () => {
        const projectId = 'p';
        initializeApp({ projectId});
        expect(() => getDataConnect({ connector: 'c', location: 'l', service: 's'})).to.not.throw('Project ID must be provided. Did you pass in a proper projectId to initializeApp?');
        const dc = getDataConnect({ connector: 'c', location: 'l', service: 's'});
        expect(dc.app.options.projectId).to.eq(projectId);
    });
    it('should throw an error if `connectorConfig` is not provided', () => {
        const projectId = 'p';
        initializeApp({ projectId});
        expect(() => getDataConnect({ } as ConnectorConfig)).to.throw('DC Option Required');
        const dc = getDataConnect({ connector: 'c', location: 'l', service: 's'});
        expect(dc.app.options.projectId).to.eq(projectId);
    });
});