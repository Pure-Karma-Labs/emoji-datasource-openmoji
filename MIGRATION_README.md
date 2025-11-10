# Publishing emoji-datasource-openmoji to npm

This guide walks through publishing this package as a standalone npm package.

## Prerequisites

1. **npm account**: Create account at https://www.npmjs.com/signup
2. **npm CLI logged in**: Run `npm login`
3. **GitHub repository**: Create `emoji-datasource-openmoji` repo under your account

## Step 1: Create New Repository

```bash
# Create a new repository on GitHub
gh repo create emoji-datasource-openmoji --public --description "OpenMoji sprite sheets compatible with emoji-datasource"

# Or via web: https://github.com/new
```

## Step 2: Initialize Git Repository

```bash
cd openmoji-package

# Initialize git
git init
git add .
git commit -m "Initial commit: OpenMoji sprite sheets for emoji-datasource"

# Add remote (update with your username)
git remote add origin https://github.com/alexg-g/emoji-datasource-openmoji.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Add License

Copy the OpenMoji CC-BY-SA 4.0 license:

```bash
curl https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/LICENSE.txt -o LICENSE
git add LICENSE
git commit -m "Add CC-BY-SA 4.0 license"
git push
```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Test Build Locally

```bash
# Test the build script
npm run build

# Verify sprite sheets were generated
ls -lh img/sheets/
```

## Step 6: Verify Package Contents

```bash
# See what will be published
npm pack --dry-run

# This should include:
# - package.json
# - README.md
# - LICENSE
# - img/sheets/*.webp
# - scripts/build.js
```

## Step 7: Publish to npm

```bash
# First publish (creates the package)
npm publish

# The package will be available at:
# https://www.npmjs.com/package/emoji-datasource-openmoji
```

## Step 8: Verify Installation

Test in a separate directory:

```bash
mkdir test-package
cd test-package
npm init -y
npm install emoji-datasource-openmoji

# Verify files
ls node_modules/emoji-datasource-openmoji/img/sheets/
```

## Updating the Package

When making changes:

```bash
# Update version in package.json (follow semver)
# - Patch: 1.0.0 -> 1.0.1 (bug fixes)
# - Minor: 1.0.0 -> 1.1.0 (new features)
# - Major: 1.0.0 -> 2.0.0 (breaking changes)

npm version patch  # or minor, or major

# Publish update
npm publish

# Push version tag to GitHub
git push --tags
```

## GitHub Actions (Optional)

Create `.github/workflows/publish.yml` to automate publishing:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Package Naming Considerations

- ✅ **emoji-datasource-openmoji** - Clear, follows convention
- Alternative: **@yourusername/emoji-datasource-openmoji** - Scoped package

## Marketing the Package

1. **Add to OpenMoji README**: Submit PR to link from https://github.com/hfg-gmuend/openmoji
2. **Reddit**: Post to r/webdev, r/javascript
3. **Twitter**: Tweet with #OpenMoji hashtag
4. **Product Hunt**: List as a developer tool
5. **GitHub topic tags**: Add topics like `emoji`, `sprite-sheets`, `openmoji`

## Checklist

- [ ] Create GitHub repository
- [ ] Initialize git and push
- [ ] Add LICENSE file
- [ ] Test build locally
- [ ] Verify package contents with `npm pack --dry-run`
- [ ] Create npm account and login
- [ ] Publish to npm with `npm publish`
- [ ] Test installation in clean directory
- [ ] Add GitHub topics/tags
- [ ] Update OpenMoji README (optional PR)
- [ ] Share on social media (optional)

## Support

For issues with the package:
- GitHub: https://github.com/alexg-g/emoji-datasource-openmoji/issues
- npm: https://www.npmjs.com/package/emoji-datasource-openmoji

## Resources

- [npm documentation](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [OpenMoji](https://openmoji.org)
- [emoji-datasource](https://github.com/iamcal/emoji-data)
