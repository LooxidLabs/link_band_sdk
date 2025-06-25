# Build and Release Scripts

This directory contains scripts for building and releasing the Link Band SDK.

## Quick Start

### 1. Set up GitHub Token

First, set your GitHub Personal Access Token:

```bash
export GITHUB_TOKEN=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
```

Or add it to your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
echo 'export GITHUB_TOKEN=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' >> ~/.zshrc
source ~/.zshrc
```

### 2. Build and Release

To build and create a new release:

```bash
./scripts/build-and-release.sh v1.0.1
```

This will:
1. ✅ Check all requirements
2. 📦 Install dependencies
3. 🔨 Build the application
4. 🚀 Create GitHub release
5. 📝 Update installer scripts

## Individual Scripts

### create-release.js

Creates a GitHub release and uploads build artifacts.

```bash
# Make sure GITHUB_TOKEN is set
export GITHUB_TOKEN=your_token_here

# Create release (requires existing build files)
node scripts/create-release.js v1.0.1
```

### build-and-release.sh

Complete build and release pipeline.

```bash
# Build and release with version
./scripts/build-and-release.sh v1.0.1

# Build and release with default version (v1.0.0)
./scripts/build-and-release.sh
```

## Manual Build Process

If you prefer to build manually:

### 1. Install Dependencies

```bash
# Python dependencies
cd python_core
pip3 install -r requirements.txt

# Node.js dependencies
cd ../electron-app
npm ci
```

### 2. Build Application

```bash
cd electron-app

# Build for current platform
npm run electron:build

# Or build for specific platforms
npm run electron:build:mac    # macOS
npm run electron:build:win    # Windows
npm run electron:build:linux  # Linux
```

### 3. Create Release

```bash
# Set GitHub token
export GITHUB_TOKEN=your_token_here

# Create release
node scripts/create-release.js v1.0.1
```

## GitHub Actions (Automated)

For automated builds on GitHub:

1. **Push a tag** to trigger the build:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

2. **Manual trigger** from GitHub Actions tab:
   - Go to Actions → Build and Release
   - Click "Run workflow"
   - Enter version (e.g., v1.0.1)

## File Structure

```
scripts/
├── README.md                 # This file
├── build-and-release.sh      # Complete build & release pipeline
├── create-release.js         # GitHub release creation
└── ...
```

## Requirements

- **Node.js** 18+ with npm
- **Python** 3.9+ with pip
- **GitHub Personal Access Token** with repo permissions
- **Platform-specific build tools**:
  - macOS: Xcode Command Line Tools
  - Windows: Visual Studio Build Tools
  - Linux: build-essential

## Token Permissions

Your GitHub Personal Access Token needs these permissions:
- ✅ `repo` (Full control of private repositories)
- ✅ `write:packages` (Upload packages to GitHub Package Registry)

## Troubleshooting

### Build Errors

**Error: `electron-builder` fails**
```bash
# Clear npm cache and reinstall
cd electron-app
rm -rf node_modules package-lock.json
npm install
```

**Error: Python dependencies fail**
```bash
# Upgrade pip and reinstall
pip3 install --upgrade pip
pip3 install -r python_core/requirements.txt
```

### Release Errors

**Error: `GitHub API error: 401`**
- Check your GitHub token is valid
- Ensure token has `repo` permissions

**Error: `Release already exists`**
- The script will automatically delete existing releases with the same tag
- Or manually delete from GitHub releases page

**Error: `File not found`**
- Make sure to build the application first
- Check that `electron-app/release/` contains installer files

### Platform-Specific Issues

**macOS: Code signing issues**
- For development builds, code signing is disabled
- For distribution, set up proper certificates in `electron-builder.json`

**Windows: Antivirus blocking**
- Some antivirus software may block the build process
- Add project directory to antivirus exceptions

**Linux: Missing dependencies**
```bash
# Ubuntu/Debian
sudo apt-get install libnss3-dev libatk-bridge2.0-dev libdrm2-dev libxcomposite-dev libxdamage-dev libxrandr-dev libgbm-dev libxss-dev libasound2-dev

# Fedora
sudo dnf groupinstall "Development Tools"
sudo dnf install libX11-devel libXScrnSaver-devel
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | ✅ Yes |
| `NODE_ENV` | Node.js environment | ❌ No |
| `ELECTRON_IS_DEV` | Electron development mode | ❌ No |

## Examples

### Release v1.0.1
```bash
export GITHUB_TOKEN=your_token_here
./scripts/build-and-release.sh v1.0.1
```

### Test Build (No Release)
```bash
cd electron-app
npm run electron:build
```

### Create Release from Existing Build
```bash
export GITHUB_TOKEN=your_token_here
node scripts/create-release.js v1.0.1
```

## Support

For issues with the build scripts:
1. Check the error messages carefully
2. Review the troubleshooting section above
3. Create an issue at: https://github.com/LooxidLabs/link_band_sdk/issues 