import glob from 'glob';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { projectRoot as root } from '../utils';

const TOP_LEVEL_FIELDS = [
  'main',
  'browser',
  'module',
  'typings',
  'react-native',
  'cordova',
  'esm5',
  'webworker',
  'main-esm'
];

interface Result {
  packageName: string;
  found: boolean;
  filePath: string;
  fieldPath: string;
}
const results: Result[] = [];

function getPaths(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob('packages/*', (err, paths) => {
      if (err) reject(err);
      resolve(paths);
    });
  })
}

function checkExports(pkgName: string, pkgRoot: string, path: string = '', exports: Record<string, any>) {
  for (const key in exports) {
    if (typeof exports[key] === 'string') {
      const filePath = resolve(pkgRoot, exports[key]);
      const result = {
        packageName: pkgName,
        found: false,
        filePath,
        fieldPath: `exports${path}[${key}]`
      };
      if (existsSync(filePath)) {
        result.found = true;
      }
      results.push(result);
    } else {
      checkExports(pkgName, pkgRoot, path ? `${path}[${key}]` : `[${key}]`, exports[key]);
    }
  }
}

async function main() {
  const paths = await getPaths();
  for (const path of paths) {
    const pkgRoot = `${root}/${path}`;
    if (existsSync(`${pkgRoot}/package.json`)) {
      const pkg = require(`${pkgRoot}/package.json`);
      for (const field of TOP_LEVEL_FIELDS) {
        if (pkg[field]) {
          const filePath = resolve(pkgRoot, pkg[field]);
          const result = {
            packageName: pkg.name,
            found: false,
            filePath,
            fieldPath: field
          };
          if (existsSync(filePath)) {
            result.found = true;
          }
          results.push(result);
        }
      }
      if (pkg.exports) {
        checkExports(pkg.name, pkgRoot, '', pkg.exports);
      }
    }
  }

  let missingPaths: boolean = false;

  for (const result of results) {
    if (!result.found) {
      missingPaths = true;
      console.log(`${result.packageName}: Field "${result.fieldPath}" ` +
        `points to ${result.filePath} which is not found.`);
    }
  }

  if (missingPaths) {
    process.exit(1);
  }
}

main();