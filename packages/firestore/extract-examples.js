const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a file path.');
  process.exit(1);
}

const absolutePath = path.resolve(filePath);

try {
  const fileContent = fs.readFileSync(absolutePath, 'utf8');

  // Regex to find all TSDoc blocks
  const tsDocRegex = /\/\*\*([\s\S]*?)\*\//g;

  // Regex to find @example tags within a TSDoc block
  const exampleRegex = /@example\s*```typescript([\s\S]*?)```/g;

  let tsDocMatch;
  let exampleCount = 0;
  while ((tsDocMatch = tsDocRegex.exec(fileContent)) !== null) {
    // Clean the TSDoc content by removing the leading " * " on each line.
    const cleanedTsDoc = tsDocMatch[1].replace(/^\s*?\* ?/gm, '');

    let exampleMatch;
    while ((exampleMatch = exampleRegex.exec(cleanedTsDoc)) !== null) {
      exampleCount++;
      console.log(`//---------- Start of Example ${exampleCount} ----------`);
      console.log(exampleMatch[1].trim());
      console.log(`//----------- End of Example ${exampleCount} -----------`);
      console.log();
    }
  }

  if (exampleCount === 0) {
    console.log('No @example tags found in the file.');
  }
} catch (error) {
  console.error(`Error reading file: ${error.message}`);
  process.exit(1);
}
