const glob = require('glob');
const { exec, spawn } = require('child_process');

const { workspaces: rawWorkspaces } = require(`./package.json`);
const workspaces = rawWorkspaces.map(workspace => `./${workspace}`);

function mapWorkspaceToPackages(workspaces) {
  return Promise.all(
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

mapWorkspaceToPackages(workspaces).then(paths => {
  for (const path of paths) {
    const handle = spawn('ncu', ['-u', '--packageFile', 'package.json'], {
      cwd: path
    });

    handle.stdout.on('data', data => {
      console.log(`stdout: ${data}`);
    });

    handle.stderr.on('data', data => {
      console.log(`stderr: ${data}`);
    });

    handle.on('close', code => {
      console.log(`child process exited with code ${code}`);
    });
  }
});
