import type { Config } from 'jest';
const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/helpers/test-env.cjs'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageThreshold: { global: { branches: 80, functions: 80, lines: 80, statements: 80 } },
};
export default config;
