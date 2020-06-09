// Fix for IE8 when developer's console is not opened.
if (!window.console) {
  window.console = {
    log: function() {},
    error: function() {}
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
    if (visibleModal.find('.overlaying-alert').size() == 0) {
      const $overlayingAlert =
          $('<div class="container-fluid overlaying-alert"></div>');
      visibleModal.append($overlayingAlert);
    }
    visibleModal.find('.overlaying-alert').prepend(alertBox);
  } else {
    $('#alert-messages').prepend(alertBox);
  }
  alertBox.fadeIn({
    complete: function() {
      setTimeout(function() {
        alertBox.slideUp(400, function() {
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