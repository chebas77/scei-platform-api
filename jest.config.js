/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  transform: {
    'node_modules/content-disposition/.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs', target: 'es2022' }, diagnostics: false }],
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: { ignoreCodes: [151001] } }] },
  moduleNameMapper: { '^@fastify/static$': '<rootDir>/node_modules/@fastify/static/index.js', '^@shared/(.*)$': '<rootDir>/src/shared/$1', '^@modules/(.*)$': '<rootDir>/src/modules/$1' },
  // Algunas dependencias (content-disposition) se publican como ESM: se transforman para Jest.
  transformIgnorePatterns: ['/node_modules/(?!content-disposition/)'],
  testRegex: '(src/.*\\.spec\\.ts|test/.*\\.e2e-spec\\.ts)$',
  globalSetup: '<rootDir>/test/global-setup.ts',
  setupFiles: ['<rootDir>/test/env.ts'],
  testTimeout: 60000,
};
