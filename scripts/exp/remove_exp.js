/**
 * Take a dir as input and replace "-exp" with "" in all files
 */
const { argv } = require('yargs');
const path = require('path');
const { 
    readdirSync, 
    statSync, 
    readFileSync,
    writeFileSync
} = require('fs');

const dir = path.resolve(argv._[0]);

for (const file of readdirSync(dir)) {
    const filePath = `${dir}/${file}`;
    if (statSync(filePath).isFile()) {
        const content = readFileSync(filePath, 'utf-8');

        // replace -exp with empty string
        const modified = content.replace(/-exp/g, '');

        writeFileSync(filePath, modified, 'utf-8');
    }
}
