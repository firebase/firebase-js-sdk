/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * @license
 * Copyright 2020 Google LLC
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

// Fix for IE8 when developer's console is not opened.
if (!window.console) {
  window.console = {
    log() {},
    error() {}
  };
}

/**
 * Logs the message in the console and on the log window in the app
 * using the level given.
 * @param {?Object} message Object or message to log.
 * @param {string} level The level of log (log, error, debug).
 * @private
 */
export function logAtLevel_(message, level) {
  if (message != null) {
    const messageDiv = $('<div></div>');
    messageDiv.addClass(level);
    if (typeof message === 'object') {
      messageDiv.text(JSON.stringify(message, null, '  '));
    } else {
      messageDiv.text(message);
    }
    $('.logs').append(messageDiv);
  }
  console[level](message);
}

/**
 * Logs info level.
 * @param {string} message Object or message to log.
 */
export function log(message) {
  logAtLevel_(message, 'log');
}

/**
 * Clear the logs.
 */
export function clearLogs() {
  $('.logs').text('');
}

/**
 * Displays for a few seconds a box with a specific message and then fades
 * it out.
 * @param {string} message Small message to display.
 * @param {string} cssClass The class(s) to give the alert box.
 * @private
 */
function alertMessage_(message, cssClass) {
  const alertBox = $('<div></div>')
    .addClass(cssClass)
    .css('display', 'none')
    .text(message);
  // When modals are visible, display the alert in the modal layer above the
  // grey background.
  const visibleModal = $('.modal.in');
  if (visibleModal.size() > 0) {
    // Check first if the model has an overlaying-alert. If not, append the
    // overlaying-alert container.
    if (visibleModal.find('.overlaying-alert').size() === 0) {
      const $overlayingAlert = $(
        '<div class="container-fluid overlaying-alert"></div>'
      );
      visibleModal.append($overlayingAlert);
    }
    visibleModal.find('.overlaying-alert').prepend(alertBox);
  } else {
    $('#alert-messages').prepend(alertBox);
  }
  alertBox.fadeIn({
    complete() {
      setTimeout(() => {
        alertBox.slideUp(400, () => {
          // On completion, remove the alert element from the DOM.
          alertBox.remove();
        });
      }, 3000);
    }
  });
}

/**
 * Alerts a small success message in a overlaying alert box.
 * @param {string} message Small message to display.
 */
export function alertSuccess(message) {
  alertMessage_(message, 'alert alert-success');
}

/**
 * Alerts a small error message in a overlaying alert box.
 * @param {string} message Small message to display.
 */
export function alertError(message) {
  alertMessage_(message, 'alert alert-danger');
}

export function alertNotImplemented() {
  alertError('Method not yet implemented in the new SDK');
}
