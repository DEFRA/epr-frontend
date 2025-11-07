# Modular Monolith Reorganisation - Revised PR Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan PR-by-PR.

**Goal:** Reorganise EPR Frontend codebase into a modular monolith through a series of PRs where the application remains functional after each merge.

**Architecture:** Transform current feature-based structure into business domain modules AND cross-cutting concern modules (localisation, observability) with explicit public APIs. Move only pure technical plumbing to shared.

**Tech Stack:** Node.js, Hapi.js, ESLint, native Node.js subpath imports

**Success Criteria:** After each PR, `npm test && npm run lint && npm run build && npm start` must work.

---

## Revised Module Structure

**Modules (domains + cross-cutting concerns):**

- `modules/identity/` - Authentication, user accounts, session management
- `modules/platform/` - Home, health, errors
- `modules/registration/` - Producer/organisation registration
- `modules/waste-reporting/` - Waste tracking & submissions
- `modules/localisation/` - i18n, translations, language switching
- `modules/observability/` - Logging, metrics, monitoring

**Shared Infrastructure (pure technical plumbing):**

- `shared/middleware/` - HTTP middleware (CSP, request tracing, user-agent)
- `shared/server/` - Server lifecycle (start, serve static)
- `shared/security/` - TLS, proxy
- `shared/errors/` - Error handling framework

---

## PR 1: Foundation Setup ✅ COMPLETED

**Branch:** `PAE-478-modular-monolith-reorganization-impl`
**Status:** PR #165 created
**Goal:** Set up directory structure and import path configuration.

Already complete - see PR #165

---

## PR 2: Infrastructure - Middleware

**Branch:** `PAE-478-infrastructure-middleware`
**Goal:** Move HTTP middleware to shared infrastructure (atomic: move + update imports)

### Task 5: Create Infrastructure Subdirectories

**Implementation:**

```bash
mkdir -p src/shared/{middleware,server,security,errors}
touch src/shared/*/.gitkeep
```

**Commit:**

```bash
git add src/shared/
git commit -m "feat: create infrastructure subdirectories

Organise shared infrastructure by technical domain:
- middleware: HTTP middleware
- server: Server lifecycle
- security: Security utilities
- errors: Error handling"
```

### Task 6: Move Middleware (Atomic)

**Files to move:**

- `src/server/common/helpers/content-security-policy.{js,test.js}` → `src/shared/middleware/`
- `src/server/common/helpers/request-tracing.{js,test.js}` → `src/shared/middleware/`
- `src/server/common/helpers/useragent-protection.{js,test.js}` → `src/shared/middleware/`

**Files to update:**

- `src/server/index.js` (update imports)

**Implementation:**

Move files:

```bash
git mv src/server/common/helpers/content-security-policy.js src/shared/middleware/
git mv src/server/common/helpers/content-security-policy.test.js src/shared/middleware/
git mv src/server/common/helpers/request-tracing.js src/shared/middleware/
git mv src/server/common/helpers/request-tracing.test.js src/shared/middleware/
git mv src/server/common/helpers/useragent-protection.js src/shared/middleware/
git mv src/server/common/helpers/useragent-protection.test.js src/shared/middleware/
```

Update `src/server/index.js` imports:

```javascript
// OLD:
import { contentSecurityPolicy } from './common/helpers/content-security-policy.js'
import { requestTracing } from './common/helpers/request-tracing.js'
import { userAgentProtection } from './common/helpers/useragent-protection.js'

// NEW:
import { contentSecurityPolicy } from '#shared/middleware/content-security-policy.js'
import { requestTracing } from '#shared/middleware/request-tracing.js'
import { userAgentProtection } from '#shared/middleware/useragent-protection.js'
```

**Verification:**

```bash
npm test && npm run lint && npm run build && npm start
```

**Commit:**

```bash
git add src/
git commit -m "refactor: move middleware to shared infrastructure

Move HTTP middleware to src/shared/middleware/.
Update imports to use #shared alias.
All tests passing, app fully functional."
```

**Create PR:**

```bash
git push origin PAE-478-infrastructure-middleware
gh pr create --title "PAE-478: Move middleware to shared infrastructure" \
  --body "Atomic refactor: move middleware files + update imports together. App remains functional."
```

---

## PR 3: Infrastructure - Server Lifecycle

**Branch:** `PAE-478-infrastructure-server`

### Task 7: Move Server Lifecycle Files (Atomic)

**Files to move:**

- `src/server/common/helpers/start-server.{js,test.js}` → `src/shared/server/`
- `src/server/common/helpers/metrics.{js,test.js}` → `src/shared/server/`
- `src/server/common/helpers/pulse.{js,test.js}` → `src/shared/server/`
- `src/server/common/helpers/serve-static-files.{js,test.js}` → `src/shared/server/`

**Files to update:**

- `src/index.js`
- `src/server/index.js`

**Implementation:**

Move files and update imports to `#shared/server/`

**Verification:**

```bash
npm test && npm run lint && npm run build && npm start
```

**Commit:**

```bash
git add src/
git commit -m "refactor: move server lifecycle to shared infrastructure"
```

---

## PR 4: Infrastructure - Security

**Branch:** `PAE-478-infrastructure-security`

### Task 8: Move Security Files (Atomic)

**Files to move:**

- `src/server/common/helpers/secure-context/*` → `src/shared/security/`
- `src/server/common/helpers/proxy/*` → `src/shared/security/`

**Implementation:**

Move files and update all imports to `#shared/security/`

**Verification:**

```bash
npm test && npm run lint && npm run build
```

**Commit:**

```bash
git add src/
git commit -m "refactor: move security utilities to shared infrastructure"
```

---

## PR 5: Infrastructure - Errors

**Branch:** `PAE-478-infrastructure-errors`

### Task 9: Move Error Files (Atomic)

**Files to move:**

- `src/server/common/helpers/errors.{js,test.js}` → `src/shared/errors/`

**Implementation:**

Move files and update all imports to `#shared/errors/errors.js`

**Verification:**

```bash
npm test && npm run lint && npm run build
```

**Commit:**

```bash
git add src/
git commit -m "refactor: move error handling to shared infrastructure

Complete shared infrastructure organisation."
```

---

## PR 6: Platform Module

**Branch:** `PAE-478-module-platform`
**Goal:** Create platform module and migrate home, health, error routes

### Task 10: Create Platform Module Structure

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

### Task 11: Migrate Platform Routes (Atomic)

**Files to move:**

- `src/server/home/*` → `src/modules/platform/`
- `src/server/health/*` → `src/modules/platform/`
- `src/server/error/*` → `src/modules/platform/`

**Files to create:**

- `src/modules/platform/routes/home.js`
- `src/modules/platform/routes/health.js`
- `src/modules/platform/routes/error.js`
- `src/modules/platform/index.js` (public API)

**Files to update:**

- `src/server/router.js` (register platform module)

**Public API:**

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

**Verification:**

```bash
npm test && npm run lint && npm run build && npm start
# Visit http://localhost:3000/ and /health
```

**Commit:**

```bash
git add src/
git commit -m "feat: create platform module with home and health routes"
```

---

## PR 7: Identity Module (with Session Management)

**Branch:** `PAE-478-module-identity`
**Goal:** Create identity module and migrate all auth-related routes + session management

### Task 12: Create Identity Module Structure

```bash
mkdir -p src/modules/identity/{routes,controllers,services,middleware,views,locales}
```

Create README.

### Task 13: Migrate Identity Routes + Session (Atomic)

**Files to move:**

- `src/server/common/helpers/auth/*` → `src/modules/identity/services/`
- `src/server/common/helpers/session-cache/*` → `src/modules/identity/services/`
- `src/server/common/helpers/redis-client.{js,test.js}` → `src/modules/identity/services/`
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
- All files importing from session-cache or redis-client

**Public API:**

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
    sessionService,
    sessionCache,
    redisClient
  },
  middleware: {
    provideAuthedUser
  }
}
```

**Verification:**

```bash
npm test && npm run lint && npm run build && npm start
# Test login flow
```

**Commit:**

```bash
git add src/
git commit -m "feat: create identity module with auth and session management"
```

---

## PR 8: Localisation Module

**Branch:** `PAE-478-module-localisation`
**Goal:** Create localisation module for i18n

### Task 14: Create Localisation Module Structure

```bash
mkdir -p src/modules/localisation/{services,middleware}
```

### Task 15: Migrate i18n (Atomic)

**Files to move:**

- `src/server/common/helpers/i18n/*` → `src/modules/localisation/services/`
- `src/server/common/helpers/i18next.{js,test.js}` → `src/modules/localisation/services/`

**Files to update:**

- All files importing from i18n or i18next
- `src/server/index.js` (register localisation plugin)

**Public API:**

```javascript
export const localisation = {
  plugin: {
    name: 'localisation',
    version: '1.0.0',
    async register(server) {
      // Register i18n middleware
    }
  },
  services: {
    i18n,
    i18next,
    localiseUrl
  }
}
```

**Verification:**

```bash
npm test && npm run lint && npm run build && npm start
# Test language switching
```

**Commit:**

```bash
git add src/
git commit -m "feat: create localisation module for i18n"
```

---

## PR 9: Observability Module

**Branch:** `PAE-478-module-observability`
**Goal:** Create observability module for logging and metrics

### Task 16: Create Observability Module Structure

```bash
mkdir -p src/modules/observability/{services,middleware}
```

### Task 17: Migrate Logging and Metrics (Atomic)

**Files to move:**

- `src/server/common/helpers/logging/*` → `src/modules/observability/services/`
- `src/shared/server/metrics.{js,test.js}` → `src/modules/observability/services/`
- `src/shared/server/pulse.{js,test.js}` → `src/modules/observability/services/`

**Files to update:**

- All files importing from logging, metrics, pulse
- `src/server/index.js` (register observability plugin)

**Public API:**

```javascript
export const observability = {
  plugin: {
    name: 'observability',
    version: '1.0.0',
    async register(server) {
      // Register logging, metrics, pulse
    }
  },
  services: {
    logger,
    loggerOptions,
    requestLogger,
    metrics,
    pulse
  }
}
```

**Verification:**

```bash
npm test && npm run lint && npm run build && npm start
# Check logs and metrics
```

**Commit:**

```bash
git add src/
git commit -m "feat: create observability module for logging and metrics"
```

---

## PR 10: Registration Module

**Branch:** `PAE-478-module-registration`

### Task 18: Migrate Registration Routes (Atomic)

**Files to move:**

- `src/server/registration/` → `src/modules/registration/`

**Public API:**

```javascript
export const registration = {
  plugin: {
    name: 'registration',
    version: '1.0.0',
    dependencies: ['identity', 'platform'],
    async register(server) {
      await server.register([registrationRoute])
    }
  },
  services: {}
}
```

**Verification:**

```bash
npm test && npm run lint && npm run build && npm start
```

**Commit:**

```bash
git add src/
git commit -m "feat: create registration module"
```

---

## PR 11: Waste Reporting Module

**Branch:** `PAE-478-module-waste-reporting`

### Task 19: Migrate Waste Reporting Routes (Atomic)

**Files to move:**

- `src/server/summary-log-upload/` → `src/modules/waste-reporting/`
- `src/server/summary-log-upload-progress/` → `src/modules/waste-reporting/`
- `src/server/common/helpers/upload/*` → `src/modules/waste-reporting/services/`

**Public API:**

```javascript
export const wasteReporting = {
  plugin: {
    name: 'waste-reporting',
    version: '1.0.0',
    dependencies: ['identity', 'platform', 'registration'],
    async register(server) {
      await server.register([uploadRoute, progressRoute])
    }
  },
  services: {
    uploadService,
    statusService
  }
}
```

**Verification:**

```bash
npm test && npm run lint && npm run build && npm start
```

**Commit:**

```bash
git add src/
git commit -m "feat: create waste-reporting module"
```

---

## PR 12: Module Integration

**Branch:** `PAE-478-module-integration`
**Goal:** Platform module uses identity module's middleware

### Task 20: Integrate Identity into Platform

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

**12 PRs total:**

1. Foundation setup ✅
2. Infrastructure - Middleware
3. Infrastructure - Server
4. Infrastructure - Security
5. Infrastructure - Errors
6. Platform module
7. Identity module (+ session management)
8. Localisation module (i18n)
9. Observability module (logging, metrics)
10. Registration module
11. Waste-reporting module
12. Module integration

**After each PR:**

- ✅ All 195 tests pass
- ✅ Build succeeds
- ✅ Application fully functional

**Verification command after each PR:**

```bash
npm test && npm run lint && npm run build && npm start
```
