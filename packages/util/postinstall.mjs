import { writeFile } from "fs/promises";

let firebaseConfig = {};
if (process.env.FIREBASE_CONFIG?.startsWith("{")) {
    // TODO probably want a more robust yaml parse
    firebaseConfig = Object.fromEntries(process.env.FIREBASE_CONFIG.match(/[^(\:\{\},)]+\:[^(,})]+/g).map(it => {
        const parts = it.split(":");
        return [parts[0], parts.slice(1).join(":")]
    }));
}

const projectId = firebaseConfig.projectId;
const appId = firebaseConfig.appId;
const apiKey = firebaseConfig.apiKey;

const config = projectId && appId && apiKey && await (await fetch(
    `https://firebase.googleapis.com/v1alpha/projects/${projectId}/apps/${appId}/webConfig`,
    { headers: { "x-goog-api-key": apiKey } }
)).json();

if (config) {
    config.apiKey = apiKey;
}

let emulatorHosts = {
    firestore: process.env.FIRESTORE_EMULATOR_HOST,
    database: process.env.FIREBASE_DATABASE_EMULATOR_HOST,
    storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
    auth: process.env.FIREBASE_AUTH_EMULATOR_HOST,
};

if (!Object.values(emulatorHosts).filter(it => it).length) {
    emulatorHosts = undefined;
}

const defaults = (config || emulatorHosts) && { config, emulatorHosts };

await Promise.all([
    writeFile("./defaults.js", `module.exports = ${JSON.stringify(defaults)}`),
    writeFile("./defaults.mjs", `export default ${JSON.stringify(defaults)}`),
]);
