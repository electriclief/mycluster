# GitHub Release Guide - MyCluster v0.0.1

## ✅ Pre-Release Checklist

- [x] Version updated in package.json (0.0.1)
- [x] Windows build completed successfully
- [x] Release notes created (RELEASE_NOTES.md)
- [x] Git tag created (v0.0.1)
- [x] All changes committed

## 📦 Release Artifacts

Located in: `apps/desktop/release/`

| File | Size | Description |
|------|------|-------------|
| `MyCluster Setup 0.0.1.exe` | ~70MB | **Recommended** - NSIS installer |
| `MyCluster 0.0.1.exe` | ~70MB | Portable executable (no install) |

## 🚀 Upload to GitHub Releases

### Step 1: Go to Releases Page
1. Navigate to your GitHub repository
2. Click on **"Releases"** in the top menu
3. Click **"Draft a new release"**

### Step 2: Create Release from Tag
1. **Tag version:** Select `v0.0.1` from dropdown (or type it)
2. **Target:** `feat/monorepo-architecture` (or main branch)
3. **Release title:** `MyCluster v0.0.1 - Initial Release`

### Step 3: Add Release Notes
Copy and paste the content from `RELEASE_NOTES.md`:

```markdown
# MyCluster v0.0.1 - Initial Release

**Release Date:** February 21, 2026

## 🎉 Welcome to MyCluster!

This is the **first public release** of MyCluster...
[rest of RELEASE_NOTES.md]
```

### Step 4: Upload Binaries
Drag and drop these files:
1. `apps/desktop/release/MyCluster Setup 0.0.1.exe`
2. `apps/desktop/release/MyCluster 0.0.1.exe`

### Step 5: Release Options
- [ ] **Set as latest release** (check this)
- [ ] **Set as pre-release** (optional - uncheck for stable)

### Step 6: Publish
Click **"Publish release"** 🎉

## 📋 Post-Release Tasks

### Update GitHub Pages Documentation
1. Go to Settings → Pages
2. Source: Deploy from branch
3. Branch: `feat/monorepo-architecture` 
4. Folder: `/Docs`
5. Save

### Announce Release
- [ ] Post to social media
- [ ] Share in relevant communities
- [ ] Update README with release badge

### Verify Download Links
After publishing, the download URLs will be:
```
https://github.com/YOUR_USERNAME/mycluster/releases/download/v0.0.1/MyCluster.Setup.0.0.1.exe
https://github.com/YOUR_USERNAME/mycluster/releases/download/v0.0.1/MyCluster.0.0.1.exe
```

## 🔧 Troubleshooting

### Build Failed
If the build failed, check:
1. Node.js version (18+ required)
2. Run `npm install` first
3. Check error logs in terminal

### Tag Already Exists
```bash
# Delete local tag
git tag -d v0.0.1

# Delete remote tag (if pushed)
git push origin :refs/tags/v0.0.1

# Recreate tag
git tag -a v0.0.1 -m "..."
```

### Need to Rebuild
```bash
# Clean build artifacts
rm -rf apps/desktop/release

# Rebuild
npm run build -w @mycluster/desktop
```

## 📊 Release Stats

- **Total Commits:** 10+
- **Files Changed:** 50+
- **Lines of Code:** 5000+
- **Documentation Pages:** 7
- **Unit Tests:** 21 passing
- **Packages:** 6

---

**Ready to release!** 🚀
