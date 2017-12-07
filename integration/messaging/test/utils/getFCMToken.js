module.exports = async (webdriver) => {
  await webdriver.wait(() => {
    return webdriver.executeScript(() => {
      return !!window.__test.token;
    });
  });

  return webdriver.executeScript(() => {
    return window.__test.token;
  });
};
