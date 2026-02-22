# MyCluster v0.0.2 Release Guide

## Release Status: READY FOR PUBLISHING 🚀

All Phase R8 features complete. Windows 11 builds configured with auto-publish to GitHub.

---

## Quick Release

### Option 1: Automated (Recommended)

```bash
# 1. Tag the release
git tag v0.0.2

# 2. Push tag to GitHub
git push origin v0.0.2

# 3. GitHub Actions will:
#    - Build Windows installer (NSIS)
#    - Build Windows portable executable
#    - Create draft GitHub release
#    - Attach build artifacts
#    - Auto-generate release notes
```

### Option 2: Manual Build

```bash
# Build locally
npm run build:publish -w @mycluster/desktop

# Artifacts created in:
# - apps/desktop/release/MyCluster Setup 0.0.2.exe (installer)
# - apps/desktop/release/MyCluster 0.0.2.exe (portable)
```

---

## What's New in v0.0.2

### Phase R8: Production Hardening - COMPLETE ✅

#### File Storage & Results (R8.1)
- Server-side file storage for job results
- Automatic cleanup (age + size based)
- Results Viewer GUI with preview
- Multipart file upload

#### Service Plugins (R8.2)
- Plugin architecture for service detection
- Ollama plugin with health checking
- Extensible for ComfyUI, SD WebUI

#### Security (R8.3)
- **Automatic** API key generation (zero config)
- Permission-based access control
- Comprehensive audit logging
- Key expiration & cleanup

#### DevOps (R8.4)
- Docker containers (server + agent)
- docker-compose orchestration
- systemd service files
- Production deployment guides

#### E2E Testing (R8.5)
- Playwright GUI tests
- API integration tests
- Performance benchmarks
- CI/CD ready

---

## Build Artifacts

### Windows 11 (x64)
| File | Size | Description |
|------|------|-------------|
| `MyCluster Setup 0.0.2.exe` | ~85 MB | NSIS installer |
| `MyCluster 0.0.2.exe` | ~85 MB | Portable executable |

### Future (v0.0.3)
- Linux AppImage
- Linux deb package
- macOS DMG (universal)

---

## GitHub Release Process

### 1. Push Tag
```bash
git tag v0.0.2
git push origin v0.0.2
```

### 2. GitHub Actions Builds
Workflow: `.github/workflows/build-release.yml`

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Build core packages
5. Build Electron app
6. Upload artifacts
7. Create draft release

### 3. Review Draft Release
- Go to: https://github.com/electriclief/mycluster/releases
- Review auto-generated release notes
- Add screenshots (optional)
- Publish release

---

## Release Notes (Auto-Generated)

Run locally:
```bash
node scripts/generate-release-notes.js v0.0.2
```

Output: `scripts/RELEASE_NOTES.md`

GitHub Actions auto-generates using:
```yaml
generate_release_notes: true
```

---

## Testing Before Release

### Local Build Test
```bash
# Build everything
npm run build

# Test installer locally
./apps/desktop/release/MyCluster\ Setup\ 0.0.2.exe

# Test portable
./apps/desktop/release/MyCluster\ 0.0.2.exe
```

### E2E Tests
```bash
# Run all tests
npm run test:all

# Run E2E only
npm run test:e2e -w @mycluster/e2e

# Run benchmarks
npm run test:benchmark -w @mycluster/e2e
```

---

## Post-Release Checklist

- [ ] Verify GitHub release created
- [ ] Download and test installer
- [ ] Download and test portable
- [ ] Update documentation site
- [ ] Announce on GitHub Discussions
- [ ] Update README with new version
- [ ] Create release branch if needed

---

## Rollback Procedure

If release has issues:

```bash
# 1. Delete tag
git tag -d v0.0.2
git push origin :refs/tags/v0.0.2

# 2. Delete GitHub release
# Go to releases and delete

# 3. Fix issues
# ... make commits ...

# 4. Create new tag
git tag v0.0.2-hotfix
git push origin v0.0.2-hotfix
```

---

## Version Numbering

Using semantic versioning: `MAJOR.MINOR.PATCH`

- **v0.0.1**: Initial release (R1-R7 complete)
- **v0.0.2**: Phase R8 complete (this release)
- **v0.1.0**: Future - Linux/macOS support
- **v1.0.0**: Future - Production stable

---

## Build Configuration

### electron-builder Settings

```json
{
  "appId": "com.mycluster.app",
  "productName": "MyCluster",
  "version": "0.0.2",
  "win": {
    "target": ["nsis", "portable"],
    "arch": ["x64"]
  },
  "publish": {
    "provider": "github",
    "releaseType": "draft"
  }
}
```

### No Code Signing

As requested, code signing is disabled:
```json
"win": {
  "sign": null
}
```

Artifacts will show "Unknown publisher" on Windows SmartScreen.

---

## Environment Variables

For GitHub Actions auto-publish:
- `GH_TOKEN`: Automatically provided by GitHub Actions
- `GITHUB_TOKEN`: Required for release creation

For local build with publish:
```bash
$env:GH_TOKEN="your_github_token"
npm run build:publish -w @mycluster/desktop
```

---

## Troubleshooting

### Build Fails
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### Publish Fails
- Verify GitHub token has `repo` scope
- Check branch protection rules
- Ensure tag doesn't already exist

### Artifacts Missing
- Check GitHub Actions logs
- Verify `apps/desktop/release/` directory
- Re-run failed jobs

---

## Next Release: v0.0.3

Planned features:
- Linux builds (AppImage + deb)
- macOS builds (DMG, universal)
- Additional service plugins
- Enhanced security features
- Performance improvements

---

## Contact

- **GitHub**: https://github.com/electriclief/mycluster
- **Discussions**: https://github.com/electriclief/mycluster/discussions
- **Issues**: https://github.com/electriclief/mycluster/issues
