const repl = require('repl');
const firebase = require('../packages/firebase');

function clearTerminal() {
  return process.stdout.write('\033c');
}

function giveContext() {
  console.log(`Welcome to the firebase REPL!

The current firebase build is has been assigned to the \`firebase\` variable.

Utility Commands Available:

.clear - Resets the current REPL
.exit - exits the REPL
.help - prints this message
`);
}

function addFirebaseToContext(repl) {
  Object.defineProperty(repl.context, 'firebase', {
    configurable: false,
    enumerable: true,
    value: firebase
  });
}

clearTerminal();
giveContext();

const replInst = repl.start('> ');
replInst.on('reset', () => {
  clearTerminal();
  giveContext();
  addFirebaseToContext(replInst);
});

addFirebaseToContext(replInst);

replInst.defineCommand('help', () => {
  giveContext();
  replInst.displayPrompt();
});
