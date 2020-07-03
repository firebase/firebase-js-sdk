import { projectRoot } from '../../scripts/utils';

export function retrieveTestModuleDtsFile(): string {
    const moduleLocation = `${projectRoot}/repo-scripts/size-analysis`;
    const packageJson = require(`${moduleLocation}/package.json`);
    const TYPINGS: string = 'typings';

    return `${moduleLocation}/${packageJson[TYPINGS]}`;
}

