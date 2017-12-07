module.exports = async webdriver => {
  await webdriver.wait(() => {
    return webdriver.executeScript(() => {
      return window.__test.messages.length > 0;
    });
  });

  return webdriver.executeScript(() => {
    return window.__test.messages;
  });
};
