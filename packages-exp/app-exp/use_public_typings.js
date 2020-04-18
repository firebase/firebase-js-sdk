const { writeFile } = require('fs');

// point typings field to the public d.ts file in package.json
const packageJson = require('./package.json');
packageJson.typings = './dist/app-exp-public.d.ts';

writeFile(
    './package.json',
    `${JSON.stringify(packageJson, null, 2)}\n`,
    { encoding: 'utf-8' }
);