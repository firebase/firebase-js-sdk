/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const FB_CONFIG_PLACEHOLDER = `{
  apiKey: ...,
  authDomain: ...,
  databaseURL: ...,
  projectId: ...,
  storageBucket: ...,
  messagingSenderId: ...,
  appId: ...
}`;
const DEFAULTS_PLACEHOLDER = `{
  key1: 'value1',
  key2: 'value2',
  ...
}`;
const SETTINGS_PLACEHOLDER = `{
  minimumFetchIntervalMillis: 43200000,
  fetchTimeoutMillis: 5000
}`;
const SUCCESS_MESSAGE = 'Done <span class="done-checkmark"> &#10004;</span>';

let remoteConfig;
const outputBox = document.getElementById('output-box');

window.onload = function () {
  document.querySelector(
    '#firebase-config'
  ).placeholder = FB_CONFIG_PLACEHOLDER;
  document.querySelector('#rc-defaults').placeholder = DEFAULTS_PLACEHOLDER;
  document.querySelector('#rc-settings').placeholder = SETTINGS_PLACEHOLDER;
};

function initializeFirebase() {
  const val = document.querySelector('#firebase-config').value;
  firebase.initializeApp(parseObjFromStr(val));
  remoteConfig = firebase.remoteConfig();
  return Promise.resolve();
}

function setDefaults() {
  remoteConfig.defaultConfig = parseObjFromStr(
    document.querySelector('#rc-defaults').value
  );
  return SUCCESS_MESSAGE;
}

function setSettings() {
  const newSettings = parseObjFromStr(
    document.querySelector('#rc-settings').value,
    true
  );
  const currentSettings = remoteConfig.settings;
  remoteConfig.settings = Object.assign({}, currentSettings, newSettings);
  return SUCCESS_MESSAGE;
}

function setLogLevel() {
  const newLogLevel = document.querySelector('#log-level-input').value;
  remoteConfig.setLogLevel(newLogLevel);
  return SUCCESS_MESSAGE;
}

function activate() {
  return remoteConfig.activate();
}

function ensureInitialized() {
  return remoteConfig.ensureInitialized();
}

// Prefixed to avoid clobbering the browser's fetch function.
function rcFetch() {
  return remoteConfig.fetch();
}

function fetchAndActivate() {
  return remoteConfig.fetchAndActivate();
}

function getString() {
  return remoteConfig.getString(getKey());
}

function getBoolean() {
  return remoteConfig.getBoolean(getKey());
}

function getNumber() {
  return remoteConfig.getNumber(getKey());
}

function getValue() {
  return remoteConfig.getValue(getKey());
}

function getAll() {
  return remoteConfig.getAll();
}

function getFetchTimeMillis() {
  return remoteConfig.fetchTimeMillis;
}

function getLastFetchStatus() {
  return remoteConfig.lastFetchStatus;
}

function getSettings() {
  return remoteConfig.settings;
}

// Helper functions
function getKey() {
  return document.querySelector('#key-input').value;
}

function handlerWrapper(handler) {
  try {
    clearOutput();
    var returnValue = handler();
    if (returnValue instanceof Promise) {
      handlePromise(returnValue);
    } else if (returnValue instanceof Array) {
      handleArray(returnValue);
    } else if (returnValue instanceof Object) {
      handleObject(returnValue);
    } else {
      displayOutput(returnValue);
    }
  } catch (error) {
    displayOutputError(error);
  }
}

function clearOutput() {
  outputBox.innerHTML = '';
}

function appendOutput(text) {
  outputBox.innerHTML = outputBox.innerHTML + text;
}

function displayOutput(text) {
  outputBox.innerHTML = text;
}

function displayOutputError(error) {
  outputBox.innerHTML = `<span class="error">${error.message || error}<span>`;
}

function handlePromise(prom) {
  const timerId = setInterval(() => appendOutput('.'), 400);
  prom
    .then(res => {
      clearInterval(timerId);
      appendOutput(SUCCESS_MESSAGE);
      if (res != undefined) {
        appendOutput('<br/>');
        appendOutput('return value: ' + res);
      }
    })
    .catch(e => {
      clearInterval(timerId);
      appendOutput(`<span class="error">${e}</span>`);
    });
}

function handleArray(ar) {
  displayOutput(ar.toString());
}

function handleObject(obj) {
  appendOutput('{');
  for (const key in obj) {
    if (obj[key] instanceof Function) {
      appendOutput(`<br/>  ${key}: ${obj[key]()},`);
    } else if (obj[key] instanceof Object) {
      appendOutput(key + ': ');
      handleObject(obj[key]);
      appendOutput(',');
    } else {
      appendOutput(`<br/>  ${key}: ${obj[key]},`);
    }
  }
  appendOutput('<br/>}');
}

/**
 * Parses string received from input elements into objects. These strings are not JSON
 * compatible.
 */
function parseObjFromStr(str, valueIsNumber = false) {
  const obj = {};
  str
    .substring(str.indexOf('{') + 1, str.indexOf('}'))
    .replace(/["']/g, '') // Get rid of curly braces and quotes
    .trim()
    .split(/[,]/g) // Results in a string of key value separated by a colon
    .map(str => str.trim())
    .forEach(keyValue => {
      const colIndex = keyValue.indexOf(':');
      const key = keyValue.substring(0, colIndex);
      const val = keyValue.substring(colIndex + 1).trim();
      const value = valueIsNumber ? Number(val) : val;
      obj[key] = value;
    });
  return obj;
}
