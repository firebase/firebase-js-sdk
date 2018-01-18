const glob = require('glob');
const { root } = require('./constants');
const { workspaces: rawWorkspaces } = require(`${root}/package.json`);
const workspaces = rawWorkspaces.map(workspace => `${root}/${workspace}`);
const { DepGraph } = require('dependency-graph');
const { getUpdatedPackages } = require('./lerna');
const { promisify } = require('util');
const { writeFile: _writeFile, existsSync } = require('fs');
const writeFile = promisify(_writeFile);
const clone = require('clone');

function filterObjectByKey(raw, filter) {
  return Object.keys(raw)
    .filter(filter)
    .reduce((obj, key) => {
      obj[key] = raw[key];
      return obj;
    }, {});
}

function mapWorkspaceToPackages(workspaces) {
  return Promise.all(workspaces.map(workspace => new Promise(resolve => {
    glob(workspace, (err, paths) => {
      if (err) throw err;
      resolve(paths)
    });
  }))).then(paths => paths.reduce((arr, val) => arr.concat(val), []));
}

function mapPackagestoPkgJson(packagePaths) {
  return packagePaths.map(path => {
    try {
      return require(`${path}/package.json`);
    } catch (err) {
      return null;
    }
  }).filter(Boolean);
}

function mapPackagesToDepGraph(packagePaths) {
  const graph = new DepGraph();
  const packages = mapPackagestoPkgJson(packagePaths);

  packages.forEach(pkg => graph.addNode(pkg.name));
  packages.forEach(({ name, dependencies, peerDependencies, devDependencies }) => {
    const allDeps = Object.assign({}, dependencies, peerDependencies, devDependencies);
    Object.keys(allDeps)
      .filter(dep => graph.hasNode(dep))
      .forEach(dep => graph.addDependency(name, dep));
  });
  return graph;
}

exports.mapPkgNameToPkgPath = async pkgName => {
  const packages = await mapWorkspaceToPackages(workspaces);
  return packages.filter(path => {
    try {
      const json = require(`${path}/package.json`);
      return json.name === pkgName;
    } catch (err) {
      return null;
    }
  }).reduce(val => val);
}

exports.getOrderedUpdates = async () => {
  const packages = await mapWorkspaceToPackages(workspaces);
  const dependencies = mapPackagesToDepGraph(packages);
  const processingOrder = dependencies.overallOrder();
  const updated = await getUpdatedPackages();

  return processingOrder.filter(pkg => updated.includes(pkg));
};

exports.mapPkgNameToPkgJson = async packageName => {
  const packages = await mapWorkspaceToPackages(workspaces);
  return mapPackagestoPkgJson(packages).filter(pkg => pkg.name === packageName).reduce(val => val);
};

exports.updateWorkspaceVersions = async newVersionObj => {
  try {
    let packages = await mapWorkspaceToPackages(workspaces);
    packages = packages.filter(package => existsSync(`${package}/package.json`));
    
    const pkgJsons = mapPackagestoPkgJson(packages);

    pkgJsons.forEach((rawPkg, idx) => {
      let pkg = clone(rawPkg);
      const pkgJsonPath = `${packages[idx]}/package.json`;

      Object.keys(newVersionObj)
        .forEach(updatedPkg => {
          /**
           * If the current package has been updated, bump the version property
           */
          if (pkg.name === updatedPkg) {
            pkg = Object.assign({}, pkg, {
              version: newVersionObj[updatedPkg]
            });
          }

          /**
           * If the packages dependencies, peerDependencies, or devDependencies have
           * been updated, update that version here
           */
          const depKeys = ['dependencies', 'peerDependencies', 'devDependencies'];
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
