import tseslint from 'typescript-eslint'

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config({
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'prettier',
        'plugin:prettier/recommended',
    ],
    ignores: ['**/version.js', '**/node_modules/**/*'],
    rules: {
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                args: 'all',
                argsIgnorePattern: '^_',
                caughtErrors: 'all',
                caughtErrorsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                ignoreRestSiblings: true,
            },
        ],
        'no-console': 'warn',
    },
})
