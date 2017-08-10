const seleniumAssistant = require('selenium-assistant');

console.log('Starting browser download - this may take some time.');
Promise.all([
  seleniumAssistant.downloadLocalBrowser('chrome', 'stable', 48),
  seleniumAssistant.downloadLocalBrowser('chrome', 'beta', 48),
  seleniumAssistant.downloadLocalBrowser('chrome', 'unstable', 48),
  seleniumAssistant.downloadLocalBrowser('firefox', 'stable', 48),
  seleniumAssistant.downloadLocalBrowser('firefox', 'beta', 48),
  seleniumAssistant.downloadLocalBrowser('firefox', 'unstable', 48),
])
.then(() => {
  console.log('Browser download complete.');
})
.catch((err) => {
  console.error('Browser download failed.');
});
