#! node

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a file path as an argument.');
  process.exit(1);
}

const absolutePath = path.resolve(filePath);

try {
  let fileContent = fs.readFileSync(absolutePath, 'utf8');

  const tsDocRegex = /(\s*\/\*\*\s*)((?:\n\s*\*[^\n]*)*)(\n\s*\*\s+```[^`]*```)((?:\n\s*\*[^\n]*)*)(\n\s*\*[\/])/g;

  fileContent = fileContent.replace(tsDocRegex, (match, p1, p2, example, p4, p5) => {
    console.log("Found match")
    if (match.includes('@example')) {
        return match;
    } else {
      console.log('p1')
      console.log(p1)
      console.log('p2')
      console.log(p2)
        return `${p1}${p2}\n * @example${example}${p4}${p5}`;
    }
  });

  fs.writeFileSync(absolutePath, fileContent, 'utf8');

  console.log('File processed successfully.');

} catch (error) {
  console.error(`Error processing file: ${error.message}`);
  process.exit(1);
}
