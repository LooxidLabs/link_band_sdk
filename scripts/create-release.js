#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPO_OWNER = 'Brian-Chae';
const REPO_NAME = 'link_band_sdk';
const VERSION = process.argv[2] || 'v1.0.0';

if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    process.exit(1);
}

const API_BASE = 'https://api.github.com';

// Helper function to make GitHub API requests
function githubRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: endpoint,
            method: method,
            headers: {
                'User-Agent': 'Link-Band-SDK-Release-Script',
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            const jsonData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }

        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`GitHub API error: ${res.statusCode} - ${parsed.message || responseData}`));
                    }
                } catch (e) {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(responseData);
                    } else {
                        reject(new Error(`Failed to parse response: ${responseData}`));
                    }
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Upload file to release
function uploadReleaseAsset(uploadUrl, filePath, fileName, contentType) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            reject(new Error(`File not found: ${filePath}`));
            return;
        }

        const fileSize = fs.statSync(filePath).size;
        const fileStream = fs.createReadStream(filePath);

        // Parse upload URL and replace {?name,label} template
        const baseUploadUrl = uploadUrl.replace(/\{.*\}/, '');
        const url = new URL(`${baseUploadUrl}?name=${encodeURIComponent(fileName)}`);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'User-Agent': 'Link-Band-SDK-Release-Script',
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': contentType,
                'Content-Length': fileSize
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`Upload failed: ${res.statusCode} - ${parsed.message || responseData}`));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse upload response: ${responseData}`));
                }
            });
        });

        req.on('error', reject);

        fileStream.pipe(req);
    });
}

async function main() {
    try {
        console.log(`🚀 Creating release ${VERSION} for ${REPO_OWNER}/${REPO_NAME}`);

        // Check if release already exists
        try {
            const existingRelease = await githubRequest('GET', `/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${VERSION}`);
            console.log(`ℹ️  Release ${VERSION} already exists, deleting it first...`);
            await githubRequest('DELETE', `/repos/${REPO_OWNER}/${REPO_NAME}/releases/${existingRelease.id}`);
        } catch (e) {
            // Release doesn't exist, which is fine
        }

        // Create release
        const releaseData = {
            tag_name: VERSION,
            target_commitish: 'main',
            name: `Link Band SDK ${VERSION}`,
            body: `## Link Band SDK ${VERSION}

### Download Links

**Windows:**
- Windows 64-bit: Download the \`.exe\` file below

**macOS:**
- Intel Mac: Download the regular \`.dmg\` file
- Apple Silicon Mac: Download the \`-arm64.dmg\` file

**Linux:**
- Linux 64-bit: Download the \`.AppImage\` file
- Linux ARM64: Download the \`-arm64.AppImage\` file

### Installation

1. **Easy Installation**: Use the installer scripts from the \`installers/\` folder
2. **Manual Installation**: Download the appropriate file for your platform

### What's New
- Korean to English translation complete
- Enhanced session management
- Improved Python server integration
- Comprehensive installation system

### System Requirements
- Python 3.9 or later
- Windows 10+, macOS 10.15+, or modern Linux distribution

For detailed installation instructions, visit: https://github.com/${REPO_OWNER}/${REPO_NAME}/tree/main/installers`,
            draft: false,
            prerelease: false
        };

        const release = await githubRequest('POST', `/repos/${REPO_OWNER}/${REPO_NAME}/releases`, releaseData);
        console.log(`✅ Release created: ${release.html_url}`);

        // Find and upload build files
        const releaseDir = path.join(__dirname, '..', 'electron-app', 'release');
        
        if (!fs.existsSync(releaseDir)) {
            console.log('❌ Release directory not found. Please build the application first.');
            console.log('Run: cd electron-app && npm run electron:build');
            process.exit(1);
        }

        const files = fs.readdirSync(releaseDir);
        const uploadPromises = [];

        for (const file of files) {
            const filePath = path.join(releaseDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isFile()) {
                let contentType = 'application/octet-stream';
                let assetName = file;

                // Determine content type and standardize filename
                if (file.endsWith('.exe')) {
                    contentType = 'application/x-msdownload';
                    assetName = `Link-Band-SDK-Setup-${VERSION}.exe`;
                } else if (file.endsWith('.dmg')) {
                    contentType = 'application/x-apple-diskimage';
                    if (file.includes('arm64')) {
                        assetName = `Link-Band-SDK-${VERSION}-arm64.dmg`;
                    } else {
                        assetName = `Link-Band-SDK-${VERSION}.dmg`;
                    }
                } else if (file.endsWith('.AppImage')) {
                    contentType = 'application/x-executable';
                    if (file.includes('arm64')) {
                        assetName = `Link-Band-SDK-${VERSION}-arm64.AppImage`;
                    } else {
                        assetName = `Link-Band-SDK-${VERSION}.AppImage`;
                    }
                } else {
                    // Skip non-installer files
                    continue;
                }

                console.log(`📤 Uploading ${file} as ${assetName}...`);
                
                uploadPromises.push(
                    uploadReleaseAsset(release.upload_url, filePath, assetName, contentType)
                        .then(() => console.log(`✅ Uploaded ${assetName}`))
                        .catch(err => console.error(`❌ Failed to upload ${assetName}:`, err.message))
                );
            }
        }

        if (uploadPromises.length === 0) {
            console.log('⚠️  No installer files found to upload');
            console.log('Available files:', files);
        } else {
            await Promise.all(uploadPromises);
        }

        console.log(`🎉 Release ${VERSION} created successfully!`);
        console.log(`🔗 Release URL: ${release.html_url}`);

    } catch (error) {
        console.error('❌ Error creating release:', error.message);
        process.exit(1);
    }
}

// Run the script
main(); 