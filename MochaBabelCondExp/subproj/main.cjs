console.log("subproj main.cjs loading");

function foo(name) {
  return `name=${name} subproj main.cjs`;
}

exports.foo = foo;
