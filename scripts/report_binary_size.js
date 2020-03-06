const { resolve } = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const repoRoot = resolve(__dirname, '..');

const commitHash = process.env.GITHUB_SHA || execSync('git rev-parse HEAD').toString();
const runId = process.env.GITHUB_RUN_ID || 'local-run-id';

// CDN scripts
function generateReportForCDNScripts() {
    const reports = [];
    const firebaseRoot = resolve(__dirname, '../packages/firebase');
    const pkgJson = require(`${firebaseRoot}/package.json`);
    
    const special_files = [
        'firebase-performance-standalone.es2017.js',
        'firebase-performance-standalone.js',
        'firebase.js'
    ];
    
    const files = [
        ...special_files.map(file => `${firebaseRoot}/${file}`), 
        ...pkgJson.components.map(component => `${firebaseRoot}/firebase-${component}.js`)
    ];
    
    for (const file of files) {
        const { size } = fs.statSync(file);
        const fileName = file.split('/').slice(-1)[0]
        reports.push(makeReportObject('firebase', fileName, size))
    }

    return reports;
}

// @firebase/*
function generateReportForNPMPacakges() {
    const reports = [];
    const fields = [
        'main',
        'module',
        'esm2017',
        'browser',
        'react-native',
        'lite',
        'lite-esm2017'
    ];

    const packageInfo = JSON.parse(
        execSync('npx lerna ls --json --scope @firebase/*', { cwd: repoRoot }).toString()
    );

    for (const package of packageInfo) {
        const packageJson = require(`${package.location}/package.json`);

        for (const field of fields) {
            if (packageJson[field]) {
                const filePath = `${package.location}/${packageJson[field]}`;
                const { size } = fs.statSync(filePath);
                reports.push(makeReportObject(packageJson.name, field, size));
            }
        }
    }

    return reports;
}

function makeReportObject(sdk, type, value) {
    return {
        sdk,
        type,
        value
    };
}

function generateSizeReport() {
    const reports = [
        ...generateReportForCDNScripts(),
        ...generateReportForNPMPacakges()
    ];

    for (const r of reports) {
        console.log(r.sdk, r.type, r.value);
    }

    return {
        log: "https://www.goog.com",
        metric: "BinarySize",
        results: reports
    };
}

generateSizeReport();
