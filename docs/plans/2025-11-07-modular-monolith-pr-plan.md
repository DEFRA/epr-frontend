# Modular Monolith Reorganization - PR-Based Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan PR-by-PR.

**Goal:** Reorganize EPR Frontend codebase into a modular monolith through a series of PRs where the application remains functional after each merge.

**Architecture:** Transform current feature-based structure into business domain modules (identity, platform, registration, waste-reporting) with explicit public APIs. Move shared utilities into organized infrastructure layer. Enforce module boundaries with ESLint.

**Tech Stack:** Node.js, Hapi.js, ESLint, native Node.js subpath imports

**Success Criteria:** After each PR, `npm test && npm run lint && npm run build && npm start` must work.

---

## PR 1: Foundation Setup

**Branch:** `PAE-478-modular-monolith-reorganization-impl`
**Status:** ✅ Task 1 complete (directories created)
**Goal:** Set up directory structure and import path configuration without moving any code.

### Task 1: Create Directory Structure ✅ COMPLETED

Already complete - commit `3b7b49b`

### Task 2: Configure Import Paths

**Files:**

- Modify: `package.json`

**Implementation:**

Update package.json imports section to add the new paths:

```json
{
  "imports": {
    "#client/*": "./src/client/*",
    "#config/*": "./src/config/*",
    "#server/*": "./src/server/*",
    "#modules/*": "./src/modules/*",
    "#shared/infrastructure/*": "./src/shared/infrastructure/*"
  }
}
```

Note: tsconfig.json with `"module": "NodeNext"` already understands Node.js subpath imports natively, so no changes needed there.

**Verification:**

```bash
npm test  # All 195 tests pass
npm run lint  # Linting passes
npm run build  # Build succeeds
```

**Commit:**

```bash
git add package.json
git commit -m "feat: configure import paths for modules and infrastructure

Add #modules/* and #shared/infrastructure/* to Node.js subpath imports.
TypeScript with module: NodeNext understands these natively."
```

### Task 3: Install ESLint Boundary Plugin

**Implementation:**

```bash
npm install --save-dev eslint-plugin-import
```

**Verification:**

```bash
npm test  # All tests still pass
```

**Commit:**

```bash
git add package.json package-lock.json
git commit -m "feat: install eslint-plugin-import for module boundary enforcement"
```

### Task 4: Configure ESLint Module Boundaries

**Files:**

- Modify: `eslint.config.js`

**Implementation:**

Add to eslint config:

```javascript
import importPlugin from 'eslint-plugin-import'

export default [
  // ... existing config
  {
    files: ['src/modules/**/*.js'],
    plugins: {
      import: importPlugin
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/*/!(index.js)'],
              message:
                'Import from module public API (#modules/{name}) instead of internal paths'
            }
          ]
        }
      ]
    }
  }
]
```

**Verification:**

```bash
npm run lint  # Passes (no modules exist yet)
npm test  # All tests pass
```

**Commit:**

```bash
git add eslint.config.js
git commit -m "feat: configure ESLint module boundary rules

Enforce that modules can only be imported via their public API."
```

### PR 1 Completion

**Create PR:**

```bash
git push origin PAE-478-modular-monolith-reorganization-impl
gh pr create --title "PAE-478: Foundation for modular monolith reorganization" \
  --body "$(cat <<'EOF'
## Summary
- Create modules/ and infrastructure/ directories
- Configure Node.js subpath imports (#modules/*, #shared/infrastructure/*)
- Install and configure ESLint boundary enforcement

## Verification
- ✅ All 195 tests pass
- ✅ Build succeeds
- ✅ No code moved yet - app fully functional

Part of PAE-478 modular monolith reorganization.
EOF
)"
```

---

## PR 2: Infrastructure - Middleware

**Branch:** `PAE-478-infrastructure-middleware`
**Goal:** Move middleware to infrastructure layer (atomic: move + update imports together)

### Task 5: Create Infrastructure Subdirectories

**Implementation:**

```bash
mkdir -p src/shared/infrastructure/{middleware,server,logging,session,i18n,security,errors}
touch src/shared/infrastructure/*/.gitkeep
```

**Commit:**

```bash
git add src/shared/infrastructure/
git commit -m "feat: create infrastructure subdirectories"
```

### Task 6: Move Middleware (Atomic)

**Files to move:**

- `src/server/common/helpers/content-security-policy.{js,test.js}` → `src/shared/infrastructure/middleware/`
- `src/server/common/helpers/request-tracing.{js,test.js}` → `src/shared/infrastructure/middleware/`
- `src/server/common/helpers/useragent-protection.{js,test.js}` → `src/shared/infrastructure/middleware/`

**Files to update:**

- `src/server/index.js` (update imports)

**Implementation:**

Move files:

```bash
git mv src/server/common/helpers/content-security-policy.js src/shared/infrastructure/middleware/
git mv src/server/common/helpers/content-security-policy.test.js src/shared/infrastructure/middleware/
git mv src/server/common/helpers/request-tracing.js src/shared/infrastructure/middleware/
git mv src/server/common/helpers/request-tracing.test.js src/shared/infrastructure/middleware/
git mv src/server/common/helpers/useragent-protection.js src/shared/infrastructure/middleware/
git mv src/server/common/helpers/useragent-protection.test.js src/shared/infrastructure/middleware/
```

Update `src/server/index.js` imports:

```javascript
// OLD:
import { contentSecurityPolicy } from './common/helpers/content-security-policy.js'
import { requestTracing } from './common/helpers/request-tracing.js'
import { userAgentProtection } from './common/helpers/useragent-protection.js'

// NEW:
import { contentSecurityPolicy } from '#shared/infrastructure/middleware/content-security-policy.js'
import { requestTracing } from '#shared/infrastructure/middleware/request-tracing.js'
import { userAgentProtection } from '#shared/infrastructure/middleware/useragent-protection.js'
```

**Verification:**

```bash
npm test  # All tests pass
npm run build  # Build succeeds
npm start  # Server starts successfully
```

**Commit:**

```bash
git add src/
git commit -m "refactor: move middleware to infrastructure layer

Move HTTP middleware to src/shared/infrastructure/middleware/:
- content-security-policy
- request-tracing
- useragent-protection

Update imports to use #shared/infrastructure alias.
All tests passing, app fully functional."
```

### PR 2 Completion

```bash
git push origin PAE-478-infrastructure-middleware
gh pr create --title "PAE-478: Move middleware to infrastructure" \
  --body "Atomic refactor: move middleware files + update imports together. App remains functional."
```

---

## PR 3: Infrastructure - Server Lifecycle

**Branch:** `PAE-478-infrastructure-server`

### Task 7: Move Server Lifecycle Files (Atomic)

**Files to move:**

- `src/server/common/helpers/start-server.{js,test.js}` → `src/shared/infrastructure/server/`
- `src/server/common/helpers/metrics.{js,test.js}` → `src/shared/infrastructure/server/`
- `src/server/common/helpers/pulse.{js,test.js}` → `src/shared/infrastructure/server/`
- `src/server/common/helpers/serve-static-files.{js,test.js}` → `src/shared/infrastructure/server/`

**Files to update:**

- `src/index.js`
- `src/server/index.js`

**Implementation:**

Move files:

```bash
git mv src/server/common/helpers/start-server.js src/shared/infrastructure/server/
git mv src/server/common/helpers/start-server.test.js src/shared/infrastructure/server/
git mv src/server/common/helpers/metrics.js src/shared/infrastructure/server/
git mv src/server/common/helpers/metrics.test.js src/shared/infrastructure/server/
git mv src/server/common/helpers/pulse.js src/shared/infrastructure/server/
git mv src/server/common/helpers/pulse.test.js src/shared/infrastructure/server/
git mv src/server/common/helpers/serve-static-files.js src/shared/infrastructure/server/
git mv src/server/common/helpers/serve-static-files.test.js src/shared/infrastructure/server/
```

Update imports in `src/index.js`:

```javascript
import { startServer } from '#shared/infrastructure/server/start-server.js'
```

Update imports in `src/server/index.js`:

```javascript
import { pulse } from '#shared/infrastructure/server/pulse.js'
import { metrics } from '#shared/infrastructure/server/metrics.js'
import { serveStaticFiles } from '#shared/infrastructure/server/serve-static-files.js'
```

**Verification:**

```bash
npm test && npm run lint && npm run build && npm start
```

**Commit:**

```bash
git add src/
git commit -m "refactor: move server lifecycle to infrastructure layer

Move server setup and monitoring to src/shared/infrastructure/server/.
Update imports to use #shared/infrastructure alias."
```

---

## PR 4: Infrastructure - Logging

**Branch:** `PAE-478-infrastructure-logging`

### Task 8: Move Logging Files (Atomic)

**Files to move:**

- `src/server/common/helpers/logging/*` → `src/shared/infrastructure/logging/`

**Files to update:**

- All files that import from `common/helpers/logging/`

**Implementation:**

Move directory:

```bash
git mv src/server/common/helpers/logging/* src/shared/infrastructure/logging/
rmdir src/server/common/helpers/logging
```

Find and update all imports:

```bash
# Find all files
grep -r "common/helpers/logging" src/ --files-with-matches

# Update each file to use #shared/infrastructure/logging/ instead
```

**Verification:**

```bash
npm test && npm run lint && npm run build
```

**Commit:**

```bash
git add src/
git commit -m "refactor: move logging to infrastructure layer"
```

---

## PR 5: Infrastructure - Session Management

**Branch:** `PAE-478-infrastructure-session`

### Task 9: Move Session Files (Atomic)

**Files to move:**

- `src/server/common/helpers/session-cache/*` → `src/shared/infrastructure/session/`
- `src/server/common/helpers/redis-client.{js,test.js}` → `src/shared/infrastructure/session/`

**Files to update:**

- All files importing from session-cache or redis-client

**Implementation:**

Move files:

```bash
git mv src/server/common/helpers/session-cache/* src/shared/infrastructure/session/
rmdir src/server/common/helpers/session-cache
git mv src/server/common/helpers/redis-client.js src/shared/infrastructure/session/
git mv src/server/common/helpers/redis-client.test.js src/shared/infrastructure/session/
```

Update all imports to `#shared/infrastructure/session/`

**Verification:**

```bash
npm test && npm run lint && npm run build
```

**Commit:**

```bash
git add src/
git commit -m "refactor: move session management to infrastructure layer"
```

---

## PR 6: Infrastructure - i18n

**Branch:** `PAE-478-infrastructure-i18n`

### Task 10: Move i18n Files (Atomic)

**Files to move:**

- `src/server/common/helpers/i18n/*` → `src/shared/infrastructure/i18n/`
- `src/server/common/helpers/i18next.{js,test.js}` → `src/shared/infrastructure/i18n/`

**Implementation:**

Move files and update all imports to `#shared/infrastructure/i18n/`

**Verification:**

```bash
npm test && npm run lint && npm run build
```

**Commit:**

```bash
git add src/
git commit -m "refactor: move i18n to infrastructure layer"
```

---

## PR 7: Infrastructure - Security

**Branch:** `PAE-478-infrastructure-security`

### Task 11: Move Security Files (Atomic)

**Files to move:**

- `src/server/common/helpers/secure-context/*` → `src/shared/infrastructure/security/`
- `src/server/common/helpers/proxy/*` → `src/shared/infrastructure/security/`

**Implementation:**

Move files and update all imports to `#shared/infrastructure/security/`

**Verification:**

```bash
npm test && npm run lint && npm run build
```

**Commit:**

```bash
git add src/
git commit -m "refactor: move security utilities to infrastructure layer"
```

---

## PR 8: Infrastructure - Error Handling

**Branch:** `PAE-478-infrastructure-errors`

### Task 12: Move Error Files (Atomic)

**Files to move:**

- `src/server/common/helpers/errors.{js,test.js}` → `src/shared/infrastructure/errors/`

**Implementation:**

Move files and update all imports to `#shared/infrastructure/errors/errors.js`

**Verification:**

```bash
npm test && npm run lint && npm run build
```

**Commit:**

```bash
git add src/
git commit -m "refactor: move error handling to infrastructure layer

Complete infrastructure reorganization. All 18 helper files now organized by technical domain."
```

---

## PR 9: Platform Module

**Branch:** `PAE-478-module-platform`
**Goal:** Create platform module and migrate home, health, error routes

### Task 13: Create Platform Module Structure

Create directories and README:

```bash
mkdir -p src/modules/platform/{routes,controllers,views,locales}
```

Create `src/modules/platform/README.md` documenting the module.

**Commit:**

```bash
git add src/modules/platform/
git commit -m "feat: create platform module structure"
```

### Task 14: Migrate Platform Routes (Atomic)

**Files to move:**

- `src/server/home/*` → `src/modules/platform/`
- `src/server/health/*` → `src/modules/platform/`
- `src/server/error/*` → `src/modules/platform/`

**Files to create:**

- `src/modules/platform/routes/home.js`
- `src/modules/platform/routes/health.js`
- `src/modules/platform/routes/error.js` (if needed)
- `src/modules/platform/index.js` (public API)

**Files to update:**

- `src/server/router.js` (register platform module)

**Implementation:**

Move controllers, views, locales to platform module.

Create route plugins in `routes/` directory.

Create public API in `index.js`:

```javascript
import { homeRoute } from './routes/home.js'
import { healthRoute } from './routes/health.js'

export const platform = {
  plugin: {
    name: 'platform',
    version: '1.0.0',
    async register(server) {
      await server.register([homeRoute, healthRoute])
    }
  },
  services: {}
}
```

Update `src/server/router.js`:

```javascript
import { platform } from '#modules/platform'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register(platform.plugin)
      // ... other routes
    }
  }
}
```

**Verification:**

```bash
npm test  # All tests pass
npm run build
npm start
# Visit http://localhost:3000/ and /health
```

**Commit:**

```bash
git add src/
git commit -m "feat: create platform module with home and health routes

Platform module contains system-level features.
Registered in router. App fully functional."
```

### PR 9 Completion

```bash
git push origin PAE-478-module-platform
gh pr create --title "PAE-478: Create platform module" \
  --body "Platform module with home, health, and error routes. App fully functional."
```

---

## PR 10: Identity Module

**Branch:** `PAE-478-module-identity`
**Goal:** Create identity module and migrate all auth-related routes

### Task 15: Create Identity Module Structure

```bash
mkdir -p src/modules/identity/{routes,controllers,services,middleware,views,locales}
```

Create README.

### Task 16: Migrate Identity Routes (Atomic)

**Files to move:**

- `src/server/common/helpers/auth/*` → `src/modules/identity/services/`
- `src/server/auth/*` → `src/modules/identity/`
- `src/server/login/*` → `src/modules/identity/`
- `src/server/logout/*` → `src/modules/identity/`
- `src/server/account/*` → `src/modules/identity/`
- `src/server/logout/prerequisites/provide-authed-user.js` → `src/modules/identity/middleware/`

**Files to create:**

- `src/modules/identity/routes/*.js`
- `src/modules/identity/index.js`

**Files to update:**

- `src/server/router.js`

**Implementation:**

Move all auth-related code to identity module.

Create public API:

```javascript
export const identity = {
  plugin: {
    name: 'identity',
    version: '1.0.0',
    async register(server) {
      await server.register([authRoute, loginRoute, logoutRoute, accountRoute])
    }
  },
  services: {
    authService,
    sessionService
  },
  middleware: {
    provideAuthedUser
  }
}
```

Register in router:

```javascript
import { identity } from '#modules/identity'
import { platform } from '#modules/platform'

await server.register(identity.plugin)
await server.register(platform.plugin)
```

**Verification:**

```bash
npm test && npm run lint && npm run build && npm start
# Test login flow
```

**Commit:**

```bash
git add src/
git commit -m "feat: create identity module with auth routes

Identity module contains authentication and user management.
Registered in router. Auth flow fully functional."
```

---

## PR 11: Module Integration

**Branch:** `PAE-478-module-integration`
**Goal:** Platform module uses identity module's middleware

### Task 17: Integrate Identity into Platform

**Files to update:**

- `src/modules/platform/index.js`
- `src/modules/platform/routes/home.js`

**Implementation:**

Update platform to declare identity dependency:

```javascript
export const platform = {
  plugin: {
    name: 'platform',
    version: '1.0.0',
    dependencies: ['identity'],
    async register(server) {
      // ...
    }
  }
}
```

Update home route to use identity middleware:

```javascript
import { identity } from '#modules/identity'

export const homeRoute = {
  plugin: {
    name: 'platform.home',
    async register(server) {
      server.route({
        method: 'GET',
        path: '/',
        options: {
          pre: [identity.middleware.provideAuthedUser],
          handler: homeController.handler
        }
      })
    }
  }
}
```

**Verification:**

```bash
npm test && npm run lint && npm run build && npm start
# Test that home page requires auth
```

**Commit:**

```bash
git add src/modules/platform/
git commit -m "feat: integrate identity module into platform

Platform module uses identity middleware for authenticated routes.
Module dependency pattern established."
```

---

## Summary

**11 PRs total:**

1. Foundation setup
   2-8. Infrastructure reorganization (one domain per PR)
2. Platform module
3. Identity module
4. Module integration

**After each PR:**

- ✅ All 195 tests pass
- ✅ Build succeeds
- ✅ Application fully functional

**Remaining work (future PRs):**

- Registration module
- Waste-reporting module
- Remove old route registration code
- Update documentation

**Verification command after each PR:**

```bash
npm test && npm run lint && npm run build && npm start
```
