# MyCluster v0.0.1 - Initial Release

**Release Date:** February 21, 2026

## 🎉 Welcome to MyCluster!

This is the **first public release** of MyCluster - a distributed compute cluster system that coordinates APIs and batch jobs across multiple machines.

## ✨ What's Included

### Core Features
- 🖥️ **LAN Computer Discovery** - Auto-detect computers by ping scanning IP ranges (192.168.1.100-160)
- 🔍 **Service Detection** - Auto-detect Ollama and other services with model enumeration
- 📝 **Job Queue System** - Priority-based job scheduling with retry logic
- 🤖 **Python Agent** - Remote execution of Python scripts with result capture
- 📊 **Real-time Updates** - WebSocket-based live progress updates
- 💾 **Flexible Storage** - YAML (simple) or SQLite (scalable) storage backends
- 🚀 **Headless Server** - Run on Raspberry Pi or any server without GUI

### Desktop Application
- Modern dark theme UI
- Cluster metrics dashboard
- Real-time job queue monitoring
- LAN computer management
- Service auto-detection display
- WebSocket connection status

### Packages
- `@mycluster/core` - Core orchestration engine
- `@mycluster/storage-yaml` - YAML file storage
- `@mycluster/storage-sqlite` - SQLite storage with migrations
- `@mycluster/agent` - Remote job executor
- `@mycluster/server` - Standalone HTTP server with WebSocket
- `@mycluster/desktop` - Electron desktop application

## 📥 Installation

### Windows Installer
Download and run **`MyCluster Setup 0.0.1.exe`**

### Windows Portable
Download **`MyCluster 0.0.1.exe`** - no installation required, just run!

## 🚀 Quick Start

### Desktop App
1. Install or run the portable executable
2. On first launch, select Server or Client mode
3. Navigate to Settings → LAN Computers to scan your network
4. Add computers and detect services automatically
5. Submit Python jobs from the Jobs tab

### Headless Server
```bash
# Install Node.js 18+ first
npm install
npm run start -w @mycluster/server -- --port 3000 --storage sqlite
```

### Agent (Worker Node)
```bash
npm install
npm run start -w @mycluster/agent -- --server http://YOUR_SERVER_IP:3000 --name "worker-1"
```

## 📚 Documentation

Full documentation is available in the `Docs/` folder:
- [Complete Guide](./Docs/COMPLETE_GUIDE.md) - Full documentation (500+ lines)
- [Quick Commands](./Docs/QUICK_COMMANDS.md) - Command reference
- [Architecture](./Docs/ARCHITECTURE.md) - System design
- [API Reference](./Docs/API_REFERENCE.md) - REST + WebSocket API

Or view online: [GitHub Pages Documentation](https://your-username.github.io/mycluster/)

## 🧪 Testing

```bash
# Run unit tests
npm run test -w @mycluster/core

# With coverage
npm run test:coverage -w @mycluster/core
```

## 🐛 Known Issues

1. **Service Removal Test** - One test is skipped in MemoryStorage (known quirk, doesn't affect production)
2. **No Application Icon** - Using default Electron icon (custom icon coming in next release)
3. **Windows Only** - macOS and Linux builds need additional testing

## 🔧 Technical Details

### System Requirements
- **OS:** Windows 10/11 (x64)
- **RAM:** 512MB minimum, 2GB recommended
- **Disk:** 200MB for application
- **Node.js:** 18.0.0 or higher (for server/agent)

### Built With
- Electron 34.2.0
- React 19.0.0
- TypeScript 5.7.3
- Vite 6.2.0
- Express 4.21.2
- SQLite (via sql.js)

## 📝 Changelog

### Added
- Initial monorepo architecture (R1-R7 complete)
- Core orchestration engine
- Job queue with priority scheduling
- Python agent for remote execution
- YAML and SQLite storage providers
- Standalone HTTP server with WebSocket
- Real-time GUI updates
- Unit tests (21 passing)
- Comprehensive documentation

### Changed
- Nothing (this is the first release!)

### Fixed
- YAML parser handles timestamps with colons correctly
- Scan progress shows live IP being pinged
- Clicking online IP stops scan immediately

## 🔜 Coming in v0.0.2

- [ ] Custom application icon
- [ ] macOS and Linux builds
- [ ] Drag-drop script upload
- [ ] Batch job configuration
- [ ] Results gallery (images/video thumbnails)
- [ ] Integration tests
- [ ] System resource monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - See LICENSE file for details.

## 🙏 Acknowledgments

- Electron team for the amazing framework
- All open-source contributors
- You for using MyCluster!

---

**Full Changelog:** https://github.com/your-username/mycluster/compare/v0.0.0...v0.0.1

**Download:** 
- [MyCluster Setup 0.0.1.exe](https://github.com/your-username/mycluster/releases/download/v0.0.1/MyCluster.Setup.0.0.1.exe) - Installer (recommended)
- [MyCluster 0.0.1.exe](https://github.com/your-username/mycluster/releases/download/v0.0.1/MyCluster.0.0.1.exe) - Portable
