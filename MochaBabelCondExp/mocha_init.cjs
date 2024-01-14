const subproj = require('subproj');

console.log("mocha_init.cjs starting");
const fooResult = subproj.foo("hello from mocha_init.cjs");
console.log("foo() returned", fooResult);
console.log("mocha_init.cjs done");
