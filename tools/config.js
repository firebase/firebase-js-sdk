const firebaseTools = require('firebase-tools');
const inquirer = require('inquirer');
const fs = require('mz/fs');
const path = require('path');

firebaseTools.login
  .ci()
  // Log in to firebase-tools
  .then(authData => {
    const { tokens: { access_token: token } } = authData;

    return firebaseTools
      .list({ token })
      .then(projects =>
        inquirer.prompt([
          {
            type: 'list',
            name: 'projectId',
            message: 'Which project would you like to use to test?',
            choices: projects.map(project => ({
              name: `${project.name} (${project.id})`,
              value: project
            }))
          }
        ])
      )
      .then(response => {
        // Capture project id
        const { projectId: { id: project } } = response;

        // Write config to top-level config directory
        const writeConfig = firebaseTools.setup
          .web({ project, token })
          .then(config =>
            fs.writeFile(
              path.resolve(__dirname, '../config/project.json'),
              JSON.stringify(config, null, 2)
            )
          );

        const config = {
          database: {
            rules: {
              '.read': true,
              '.write': true
            }
          }
        };

        // Deploy database rules
        const deployRules = firebaseTools.deploy({
          project,
          token,
          cwd: path.resolve(__dirname, '../config')
        });

        return Promise.all([writeConfig, deployRules]);
      });
  })
  .then(() => {
    console.log('Success! Exiting...');
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
