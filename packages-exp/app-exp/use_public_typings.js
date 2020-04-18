const { writeFileSync } = require('fs');

// point typings field to the public d.ts file in package.json
const PUBLIC_TYPINGS_PATH = './dist/app-exp-public.d.ts';
console.log(
  `Updating the typings field to the public d.ts file ${PUBLIC_TYPINGS_PATH}`
);

const packageJson = require('./package.json');
packageJson.typings = PUBLIC_TYPINGS_PATH;

writeFileSync('./package.json', `${JSON.stringify(packageJson, null, 2)}\n`, {
  encoding: 'utf-8'
});
