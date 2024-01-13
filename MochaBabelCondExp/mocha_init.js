const subproj = require('subproj');

console.log("mocha_init.ts starting");
const fooResult = subproj.foo("hello from mocha_init.ts");
console.log("foo() returned", fooResult);
console.log("mocha_init.ts done");
