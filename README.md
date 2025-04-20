# @js-state-reactivity-models/datamanager

A data management library for JavaScript applications.

## Installation

```bash
# Configure npm to use GitHub Packages
echo "@js-state-reactivity-models:registry=https://npm.pkg.github.com" >> .npmrc

# Install the package
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

## Publishing to GitHub Packages

This package is automatically published to GitHub Packages via GitHub Actions when changes are pushed to the master branch.

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

For automated publishing, the workflow uses the built-in `GITHUB_TOKEN` which is automatically available in GitHub Actions. No manual setup of tokens is required.

To consume this package in another project, you may need to authenticate with GitHub. Create a personal access token with the appropriate scopes (`read:packages`) and add it to your project's `.npmrc` file:

```
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
@js-state-reactivity-models:registry=https://npm.pkg.github.com
```
