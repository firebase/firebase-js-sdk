/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import glob from 'glob';
import { projectRoot as root } from '../../utils';

import { DepGraph } from 'dependency-graph';
import { getUpdatedPackages } from './lerna';
import { promisify } from 'util';
import { writeFile as _writeFile, existsSync } from 'fs';
import clone from 'clone';

const writeFile = promisify(_writeFile);

const {
  workspaces: rawWorkspaces
}: { workspaces: string[] } = require(`${root}/package.json`);
const workspaces = rawWorkspaces.map(workspace => `${root}/${workspace}`);

export function mapWorkspaceToPackages(
  workspaces: string[]
): Promise<string[]> {
  return Promise.all<string[]>(
    workspaces.map(
      workspace =>
        new Promise(resolve => {
          glob(workspace, (err, paths) => {
            if (err) throw err;
            resolve(paths);
          });
        })
    )
  ).then(paths => paths.reduce((arr, val) => arr.concat(val), []));
}

function mapPackagestoPkgJson(packagePaths: string[]) {
  return packagePaths
    .map(path => {
      try {
        return require(`${path}/package.json`);
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean);
}

function mapPackagesToDepGraph(packagePaths: string[]) {
  const graph = new DepGraph();
  const packages = mapPackagestoPkgJson(packagePaths);

  packages.forEach(pkg => graph.addNode(pkg.name));
  packages.forEach(({ name, dependencies, devDependencies }) => {
    const allDeps = Object.assign({}, dependencies, devDependencies);
    Object.keys(allDeps)
      .filter(dep => graph.hasNode(dep))
      .forEach(dep => graph.addDependency(name, dep));
  });
  return graph;
}

export async function mapPkgNameToPkgPath(pkgName: string) {
  const packages = await mapWorkspaceToPackages(workspaces);
  return packages
    .filter(path => {
      try {
        const json = require(`${path}/package.json`);
        return json.name === pkgName;
      } catch (err) {
        return null;
      }
    })
    .reduce(val => val);
}

export async function getAllPackages() {
  const packages = await mapWorkspaceToPackages(workspaces);
  const dependencies = mapPackagesToDepGraph(packages);
  return dependencies.overallOrder();
}

export async function getOrderedUpdates() {
  const packages = await mapWorkspaceToPackages(workspaces);
  const dependencies = mapPackagesToDepGraph(packages);
  const processingOrder = dependencies.overallOrder();
  const updated = await getUpdatedPackages();

  return processingOrder.filter(pkg => updated.includes(pkg));
}

export async function mapPkgNameToPkgJson(packageName: string) {
  const packages = await mapWorkspaceToPackages(workspaces);
  return mapPackagestoPkgJson(packages)
    .filter(pkg => pkg.name === packageName)
    .reduce(val => val);
}

export async function updateWorkspaceVersions(
  newVersionObj: { [pkgName: string]: string },
  includePeerDeps: boolean
) {
  try {
    let packages = await mapWorkspaceToPackages(workspaces);
    packages = packages.filter(pkg => existsSync(`${pkg}/package.json`));

    const pkgJsons = mapPackagestoPkgJson(packages);

    pkgJsons.forEach((rawPkg, idx) => {
      let pkg = clone(rawPkg);
      const pkgJsonPath = `${packages[idx]}/package.json`;

      Object.keys(newVersionObj).forEach(updatedPkg => {
        /**
         * If the current package has been updated, bump the version property
         */
        if (pkg.name === updatedPkg) {
          pkg = Object.assign({}, pkg, {
            version: newVersionObj[updatedPkg]
          });
        }

        /**
         * If the packages dependencies, or devDependencies have
         * been updated, update that version here
         */
        let depKeys = ['dependencies', 'devDependencies'];
        if (includePeerDeps) {
          depKeys = [...depKeys, 'peerDependencies'];
        }

        depKeys.forEach(dep => {
          const deps = pkg[dep];

          if (deps && deps[updatedPkg]) {
            pkg = Object.assign({}, pkg, {
              [dep]: Object.assign({}, pkg[dep], {
                [updatedPkg]: newVersionObj[updatedPkg]
              })
            });
          }
        });
      });

      writeFile(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
    });
  } catch (err) {
    console.log(err);
  }
}
