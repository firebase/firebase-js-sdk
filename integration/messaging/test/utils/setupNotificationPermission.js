const seleniumFirefox = require('selenium-webdriver/firefox');
const seleniumChrome = require('selenium-webdriver/chrome');

module.exports = (assistantBrowser, serverAddress) => {
  switch (assistantBrowser.getId()) {
    case 'firefox': {
      const ffProfile = new seleniumFirefox.Profile();
      ffProfile.setPreference(
        'security.turn_off_all_security_so_that_' +
          'viruses_can_take_over_this_computer',
        true
      );
      ffProfile.setPreference('dom.push.testing.ignorePermission', true);
      ffProfile.setPreference('notification.prompt.testing', true);
      ffProfile.setPreference('notification.prompt.testing.allow', true);
      assistantBrowser.getSeleniumOptions().setProfile(ffProfile);
      break;
    }
    case 'chrome': {
      /* eslint-disable camelcase */
      const chromePreferences = {
        profile: {
          content_settings: {
            exceptions: {
              notifications: {}
            }
          }
        }
      };
      chromePreferences.profile.content_settings.exceptions.notifications[
        serverAddress + ',*'
      ] = {
        setting: 1
      };
      assistantBrowser
        .getSeleniumOptions()
        .setUserPreferences(chromePreferences);
      /* eslint-enable camelcase */
      break;
    }
  }

  return assistantBrowser;
};
