# AGENTS.md

## Testing instructions
- Before testing, create a config/project.json file. Copy config/ci.config.json if another project config is not specified by the user.
- This is a web SDK and is most commonly used in a browser environment, so if you are running unit tests, you must run browser unit tests, not just Node tests, even if the Node tests seem like they would be faster.

## Preparing code for PRs
- run `yarn format` after any changes to *.ts or *.js files, to do a formatting and license pass.
- run `yarn docgen:all` after any changes that affect the public API or that change the text of comments that are the source of public documentation