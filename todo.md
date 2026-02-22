# MyCluster - LAN API Control Application

## Project Overview
A dual-mode Electron application that enables control of remote APIs and clients on a local LAN. The same app functions as either a **Server** (exposes APIs) or **Client** (consumes APIs), selected during first-time setup.

**Initial Scope:** API calls only (UI/visual controls in future phase)

---

## Phase 1: Project Setup & Infrastructure

### 1.0 Git Repository Setup
- [x] Initialize git repository
- [x] Create `.gitignore` for Electron/Node.js
- [x] Create initial commit
- [x] Set up branching strategy (master/develop)
- [ ] Configure git hooks (optional: husky for pre-commit)

### 1.1 Initialize Project Structure
- [x] Create package.json with Electron dependencies
- [x] Configure build scripts (electron-builder for both platforms)
- [x] Set up directory structure
- [x] Install core dependencies (Electron, React, TypeScript, Vite, Express, Axios, Zustand)

### 1.2 TypeScript Configuration
- [x] Create tsconfig.json (main process)
- [x] Create tsconfig.renderer.json (renderer process)
- [x] Define shared types in `src/shared/types.ts`

### 1.3 ESLint & Prettier
- [ ] Configure linting rules
- [ ] Add pre-commit hooks (optional)

---

## Phase 2: Core Electron Application

### 2.1 Main Process Setup
- [x] Create main.ts (Electron entry point)
- [x] Configure BrowserWindow with security settings
- [x] Set up preload.ts with contextBridge
- [x] Implement IPC handlers for renderer ↔ main communication

### 2.2 Renderer Process (UI Framework)
- [x] Set up React with TypeScript
- [x] Create basic app shell/layout
- [x] Implement routing (react-router-dom)
- [x] Set up state management (Zustand)

### 2.3 First-Time Setup Flow
- [x] Detect first launch (check config file existence)
- [x] Create setup wizard component:
  - [x] Mode selection (Server / Client)
  - [x] Basic configuration input
  - [x] Save configuration to persistent storage
- [x] Store mode selection in electron-store

---

## Phase 3: Configuration System

### 3.1 Configuration Storage
- [x] Integrate electron-store for persistent settings
- [x] Define configuration schema (mode, port, instanceId, authToken)
- [x] Auto-generate instance ID and auth token on first launch

### 3.2 Configuration UI
- [x] Settings page component
- [x] Mode switch (with confirmation - requires restart)
- [x] Port configuration
- [x] Import/Export config functionality

---

## Phase 4: Server Mode Implementation

### 4.1 Express Server Setup
- [ ] Create server bootstrap in `src/server/`
- [ ] Configure Express with CORS for LAN access
- [ ] Implement health check endpoint (`/api/health`)
- [ ] Server lifecycle management (start/stop/restart)

### 4.2 API Endpoint Management
- [ ] Define endpoint registration system
- [ ] Create endpoint schema:
  ```typescript
  interface ApiEndpoint {
    id: string;
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    handler: (req, res) => void;
    requiresAuth?: boolean;
  }
  ```
- [ ] Dynamic endpoint registration/deregistration
- [ ] Endpoint listing endpoint (`/api/endpoints`)

### 4.3 Request/Response Handling
- [ ] JSON body parser middleware
- [ ] Error handling middleware
- [ ] Request logging
- [ ] Response time tracking

### 4.4 Server Mode UI
- [ ] Dashboard showing active server status
- [ ] List of registered endpoints
- [ ] Request logs viewer
- [ ] Start/Stop server controls

---

## Phase 5: Client Mode Implementation

### 5.1 Server Discovery
- [ ] Implement LAN discovery (UDP broadcast/multicast)
- [ ] mDNS/Bonjour integration (optional)
- [ ] Manual server address input
- [ ] Discovered servers list with status

### 5.2 API Call Execution
- [ ] HTTP client service (axios wrapper)
- [ ] Request builder component:
  - [ ] Method selection
  - [ ] URL/path input
  - [ ] Headers editor
  - [ ] Body editor (JSON with syntax highlighting)
- [ ] Response viewer:
  - [ ] Status code
  - [ ] Headers
  - [ ] Body (formatted JSON)
  - [ ] Response time

### 5.3 Saved Requests
- [ ] Create/save/load request configurations
- [ ] Organize requests into collections
- [ ] Environment variables support
- [ ] Export/import collections

### 5.4 Client Mode UI
- [ ] Server connection status indicator
- [ ] Discovered servers panel
- [ ] Request builder panel
- [ ] Response display panel
- [ ] Request history sidebar

---

## Phase 6: Security

### 6.1 Authentication (Zero-Config / Invisible)
- [x] No user-facing authentication (LAN trust model)
- [ ] Auto-generated instance ID for peer identification
- [ ] Automatic token exchange between instances (no user input)
- [ ] Token stored in electron-store, attached to all requests automatically

### 6.2 Electron Security
- [x] Context isolation enabled
- [x] Node integration disabled in renderer
- [ ] CSP (Content Security Policy) headers
- [ ] Disable webSecurity only if absolutely necessary

### 6.3 Network Security (Optional)
- [ ] Optional HTTPS/TLS support (for non-trusted networks)
- [ ] Rate limiting (prevent accidental overload)

---

## Phase 7: Polish & UX

### 7.1 UI/UX Improvements
- [ ] Dark/Light theme toggle
- [ ] Responsive layout
- [ ] Loading states
- [ ] Error notifications (toast)
- [ ] Confirmation dialogs for destructive actions

### 7.2 Developer Experience
- [ ] Request/response logging to file
- [ ] Export logs functionality
- [ ] Keyboard shortcuts
- [ ] Auto-save unsaved requests

---

## Phase 8: Testing

### 8.1 Unit Tests
- [ ] Test configuration system
- [ ] Test server endpoint registration
- [ ] Test client HTTP service
- [ ] Test LAN discovery logic

### 8.2 Integration Tests
- [ ] Test server-client communication
- [ ] Test IPC handlers
- [ ] Test mode switching

### 8.3 E2E Tests
- [ ] Set up Playwright for Electron
- [ ] Test first-time setup flow
- [ ] Test API call workflow

---

## Phase 9: Build & Distribution

### 9.1 Build Configuration
- [ ] Configure electron-builder
- [ ] Set up auto-updater (electron-updater)
- [ ] Code signing preparation

### 9.2 Platform Targets
- [ ] Windows (NSIS installer + portable)
- [ ] macOS (DMG)
- [ ] Linux (AppImage + deb)

### 9.3 Release Process
- [ ] GitHub Actions CI/CD pipeline
- [ ] Automated version bumping
- [ ] Release notes generation

---

## Future Phases (Post-MVP)

### Phase 10: Advanced Features
- [ ] WebSocket support for real-time communication
- [ ] GraphQL endpoint support
- [ ] gRPC support
- [ ] Request chaining/workflows
- [ ] Scripting support (JavaScript/Python handlers)

### Phase 11: Visual Control Interface
- [ ] Drag-and-drop control builder
- [ ] Dashboard widgets
- [ ] Real-time data visualization
- [ ] Custom control themes

### Phase 12: Multi-Server Management
- [ ] Server clustering
- [ ] Load balancing
- [ ] Failover configuration
- [ ] Centralized management dashboard

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Framework | React + TypeScript | Familiar, strong ecosystem |
| Build Tool | Vite | Fast HMR, modern bundling |
| Server Framework | Express.js | Lightweight, well-understood |
| HTTP Client | Axios | Interceptors, easy error handling |
| State Management | Zustand | Simple, minimal boilerplate |
| Storage | electron-store | Persistent, type-safe |
| Styling | Tailwind CSS | Rapid UI development |
| Security Model | Zero-config (LAN trust) | No user friction, auto-tokens |

---

## Notes & Considerations

- **Mode Switching**: Requires app restart; clearly communicate to user
- **Firewall**: May need to prompt user to allow LAN access
- **Port Conflicts**: Validate port availability before starting server
- **CORS**: Pre-configure for common LAN IP ranges (192.168.x.x, 10.x.x.x)
- **Discovery Protocol**: Document protocol for future interoperability
- **Security**: Zero-config trust model for LAN; auto-generated tokens invisible to user

---

## Open Questions

1. Should we support running both server and client modes simultaneously?
2. What discovery protocol to prioritize (UDP broadcast vs mDNS)?
3. Support for binary request/response bodies in Phase 1?

---

*Last Updated: 2026-02-21 - Phase 3 Complete*
