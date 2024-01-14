import { foo } from 'subproj';

console.log("mocha_init.mjs starting");
const fooResult = foo("hello from mocha_init.mjs");
console.log("foo() returned", fooResult);
console.log("mocha_init.mjs done");
