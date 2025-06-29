/** @type {import('ts-jest').JestConfigWithTsJest} **/
// eslint-disable-next-line no-undef
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/packages/**/__tests__/**/*.test.ts'],
    transform: {
        '\\.(ts|tsx)$': ['ts-jest', {}],
    },
    moduleNameMapper: {
        '^@js-state-reactivity-models/(.*)$': '<rootDir>/packages/$1/lib',
    },
    transformIgnorePatterns: ['node_modules/(?!(uuid))'],
}
