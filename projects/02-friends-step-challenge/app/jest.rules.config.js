module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['**/tests/rules/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/functions/'],
};
