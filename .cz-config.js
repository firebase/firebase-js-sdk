module.exports = {
  types: [
    {value: 'feat',     name: 'feat:     A new feature'},
    {value: 'fix',      name: 'fix:      A bug fix'},
    {value: 'docs',     name: 'docs:     Documentation only changes'},
    {value: 'style',    name: 'style:    Changes that deal with code style as opposed to functionality\n            (white-space, formatting, missing semi-colons, etc)'},
    {value: 'refactor', name: 'refactor: A code change that neither fixes a bug nor adds a feature'},
    {value: 'perf',     name: 'perf:     A code change that improves performance'},
    {value: 'test',     name: 'test:     Adding missing tests'},
    {value: 'chore',    name: 'chore:    Changes to the build process, auxiliary tools\n           or other processes such as documentation generation'},
    {value: 'revert',   name: 'revert:   Revert to a commit'},
    {value: 'WIP',      name: 'WIP:      Work in progress'}
  ],
  scopes: [
    {name: 'auth'},
    {name: 'storage'},
    {name: 'messaging'},    
    {name: 'database'},
    {name: 'app'},
    {name: '* (All of the above, or general package concerns)', value: '*'},
  ],
  allowCustomScopes: true,
  allowBreakingChanges: ['feat', 'fix']
};