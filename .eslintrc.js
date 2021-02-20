module.exports = {
    root: true,
    env: { node: true },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    overrides: [],
    rules: {
        quotes: ["error", "single"]
    },
    ignorePatterns: ['**/node_modules/**', 'dist/**'],
}
