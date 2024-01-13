import { foo } from 'subproj';

console.log("mocha_init.ts starting");
const fooResult = foo("hello from mocha_init.ts");
console.log("foo() returned", fooResult);
console.log("mocha_init.ts done");
