# @payce/datamanager

A data management library for JavaScript applications.

## Installation

```bash
npm install @js-state-reactivity-models/datamanager
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run start:dev

# Run tests
npm test
```

## Publishing to npm

This package is automatically published to npm via GitHub Actions when changes are pushed to the master branch.

### Manual Publishing

To publish manually:

1. Bump the version (choose one):

    ```bash
    npm run version:patch  # For bug fixes
    npm run version:minor  # For new features
    npm run version:major  # For breaking changes
    ```

2. Push changes including the new version tag:
    ```bash
    git push --follow-tags
    ```

## GitHub Actions Setup

For automated publishing, you need to add an NPM_TOKEN secret to your GitHub repository:

1. Generate an npm access token:

    - Go to npmjs.com
    - Navigate to your profile → Access Tokens
    - Create a new token with publish access

2. Add the token to GitHub:
    - Go to your GitHub repository
    - Navigate to Settings → Secrets and variables → Actions
    - Create a new repository secret named `NPM_TOKEN` with your npm token value
