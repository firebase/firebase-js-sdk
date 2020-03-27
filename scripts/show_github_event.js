const fs = require("fs");

console.log("Testing with GitHub Actions ...");

console.log();
console.log();

console.log("Home:", process.env.HOME);
console.log("GITHUB_WORKFLOW:", process.env.GITHUB_WORKFLOW);
console.log("GITHUB_RUN_ID:", process.env.GITHUB_RUN_ID);
console.log("GITHUB_RUN_NUMBER:", process.env.GITHUB_RUN_NUMBER);
console.log("GITHUB_ACTION:", process.env.GITHUB_ACTION);
console.log("GITHUB_ACTIONS:", process.env.GITHUB_ACTIONS);
console.log("GITHUB_ACTOR:", process.env.GITHUB_ACTOR);
console.log("GITHUB_REPOSITORY:", process.env.GITHUB_REPOSITORY);
console.log("GITHUB_EVENT_NAME:", process.env.GITHUB_EVENT_NAME);
console.log("GITHUB_EVENT_PATH:", process.env.GITHUB_EVENT_PATH);
console.log("GITHUB_WORKSPACE:", process.env.GITHUB_WORKSPACE);
console.log("GITHUB_SHA:", process.env.GITHUB_SHA);
console.log("GITHUB_REF:", process.env.GITHUB_REF);
console.log("GITHUB_HEAD_REF:", process.env.GITHUB_HEAD_REF);
console.log("GITHUB_BASE_REF:", process.env.GITHUB_BASE_REF);

fs.readFile(process.env.GITHUB_EVENT_PATH, 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});
