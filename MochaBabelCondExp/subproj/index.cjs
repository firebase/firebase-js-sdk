console.log("subproj index.cjs loading");

function foo(name) {
  return `name=${name} subproj index.cjs`;
}

exports.foo = foo;
