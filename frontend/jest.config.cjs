// Jest config (CommonJS, since package.json has type: module)
module.exports = {
  testEnvironment: 'jsdom',
  // Loaded once per test file, after the test framework is installed
  setupFilesAfterEach: ['<rootDir>/src/test/setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testMatch: ['<rootDir>/src/**/*.test.(js|jsx)'],
};
