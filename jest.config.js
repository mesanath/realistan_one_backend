module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./src/tests/setup/env.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 15000,
  collectCoverageFrom: ['src/**/*.js', 'modules/**/*.js'],
  coverageDirectory: 'coverage',
  verbose: false,
  forceExit: true,
  clearMocks: true,
};
