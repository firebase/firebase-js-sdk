module.exports = (path, options) => {
  if (/firebase/.test(path)) {
    return options.defaultResolver(path, {
      ...options,
      conditions: ['browser', 'require']
    });
  }
  return options.defaultResolver(path, options);
};
