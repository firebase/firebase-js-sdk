
const fs = require('mz/fs');
const path = require('path');

const repoPath = ('/Users/chholland/repos/fb-DOCS');
const sourceFile =  `${repoPath}/packages/firebase/index.d.ts`;

async function generateNodeSource() {
    const sourceText = await fs.readFile(sourceFile, 'utf8');
    const sourceLines = sourceText.split('\n');
    let nodeSourceLines = [];
    let inWebOnlyBlock = false;
    sourceLines.forEach((line, index) => {
        if (line.includes('@webonly')) {
            inWebOnlyBlock = true;
            for (let i = index; i > 0; i--) {
                if (sourceLines[i].includes('/**')) {
                    break;
                }
                nodeSourceLines.pop();
            }
        } else if (line.includes('/**') && inWebOnlyBlock) {
            inWebOnlyBlock = false;
            nodeSourceLines.push(line);
        } else if (!inWebOnlyBlock) {
            nodeSourceLines.push(line);
        }
    });
    return fs.writeFile('test.d.ts', nodeSourceLines.join('\n'));
}

generateNodeSource();