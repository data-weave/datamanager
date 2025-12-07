import tseslint from 'typescript-eslint'

/** @type {import('eslint').Linter.Config[]} */
export default [
    ...tseslint.configs.recommended,
    {
        ignores: ['**/version.js', '**/node_modules/**/*', '**/lib/**/*'],
    },
    {
        files: ['**/*.{js,ts,mjs,cjs}'],
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
            ]
        },
    },
]
