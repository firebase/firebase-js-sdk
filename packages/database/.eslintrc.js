module.exports = {
  extends: '../../config/.eslintrc.js',
  parserOptions: {
    project: 'tsconfig.json',
    // to make vscode-eslint work with monorepo
    // https://github.com/typescript-eslint/typescript-eslint/issues/251#issuecomment-463943250
    tsconfigRootDir: __dirname
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'off'
    ],
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    'no-restricted-properties': 'off',
    'no-restricted-globals': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-throw-literal': 'off',
    'id-blacklist': 'off'
  }
};
