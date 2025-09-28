/** @type {import('ts-jest').JestConfigWithTsJest} **/
// eslint-disable-next-line no-undef
module.exports = {
    testTimeout: 10000,
    testEnvironment: 'node',
    testMatch: ['**/packages/**/__tests__/**/*.test.ts'],
    transform: {
        '\\.(ts|tsx)$': ['ts-jest', {}],
    },
    moduleNameMapper: {
        '^@data-weave/([^/]+)$': '<rootDir>/packages/$1/lib',
        '^@data-weave/(.*)$': '<rootDir>/packages/$1',
    },
    setupFilesAfterEnv: ['<rootDir>/packages/datamanager-firestore-mobx/__tests__/setup.ts'],
    transformIgnorePatterns: ['node_modules/(?!(uuid))'],
}
