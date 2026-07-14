import * as fs from 'fs';
import { ESLint } from 'eslint';
import { pruneDts } from './pipeline';

export { pruneDts };

const ESLINT_CONFIG: ESLint.Options = {
  overrideConfig: {
    parser: '@typescript-eslint/parser',
    plugins: ['unused-imports'],
    rules: {
      'unused-imports/no-unused-imports': 'error'
    }
  },
  useEslintrc: false,
  fix: true
};

/**
 * Removes unused imports from declaration files.
 */
export async function removeUnusedImports(fileLocation: string): Promise<void> {
  const eslint = new ESLint(ESLINT_CONFIG);
  const results = await eslint.lintFiles([fileLocation]);
  await ESLint.outputFixes(results);
}

/**
 * Formats declaration files with blank lines between members and interfaces.
 */
export async function addBlankLines(fileLocation: string): Promise<void> {
  const content = fs.readFileSync(fileLocation, 'utf-8');
  let result = content.replace(/}/g, '}\n');
  result = result.replace(/;/g, ';\n');
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
  fs.writeFileSync(fileLocation, result, 'utf-8');
}
