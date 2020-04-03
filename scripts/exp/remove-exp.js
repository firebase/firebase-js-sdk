/**
 * Replace "-exp" with "" in all files within the directory
 */
const { argv } = require('yargs');
const path = require('path');
const { 
    readdirSync, 
    statSync, 
    readFileSync,
    writeFileSync
} = require('fs');

// can be used in command line
if (argv._[0]) {
    const dir = path.resolve(argv._[0]);
    removeExpSuffix(dir);
}

function removeExpSuffix(dir) {
    for (const file of readdirSync(dir)) {
        const filePath = `${dir}/${file}`;
        if (statSync(filePath).isFile()) {
            const content = readFileSync(filePath, 'utf-8');
    
            // replace -exp with empty string
            const modified = content.replace(/-exp/g, '');
    
            writeFileSync(filePath, modified, 'utf-8');
        }
    }
}

exports.removeExpSuffix = removeExpSuffix;
