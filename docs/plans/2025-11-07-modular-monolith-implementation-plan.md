# Modular Monolith Reorganization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize EPR Frontend codebase into a modular monolith with clear domain boundaries and controlled dependencies.

**Architecture:** Transform current feature-based structure into business domain modules (identity, platform, registration, waste-reporting) with explicit public APIs. Move shared utilities into organized infrastructure layer. Enforce module boundaries with ESLint.

**Tech Stack:** Node.js, Hapi.js, ESLint, Babel, path aliases

---

## Phase 1: Foundation Setup

### Task 1: Create Directory Structure

**Files:**

- Create: `src/modules/.gitkeep`
- Create: `src/shared/infrastructure/.gitkeep`

**Step 1: Create modules directory**

```bash
mkdir -p src/modules
touch src/modules/.gitkeep
```

**Step 2: Create infrastructure directory**

```bash
mkdir -p src/shared/infrastructure
touch src/shared/infrastructure/.gitkeep
```

**Step 3: Verify directories created**

```bash
ls -la src/
```

Expected: See `modules/` and `infrastructure/` directories

**Step 4: Commit**

```bash
git add src/modules/.gitkeep src/shared/infrastructure/.gitkeep
git commit -m "feat: create modules and infrastructure directories

Set up foundation for modular monolith reorganization.
Modules will contain business domain logic with controlled dependencies.
Infrastructure will contain shared technical utilities."
```

---

### Task 2: Configure Import Paths

**Files:**

- Modify: `package.json` (add to imports)
- Modify: `tsconfig.json` (add paths for IDE support)

**Step 1: Add imports to package.json**

Add new entries to the existing `"imports"` section:

```json
{
  "imports": {
    "#client/*": "./src/client/*",
    "#config/*": "./src/config/*",
    "#server/*": "./src/server/*",
    "#modules/*": "./src/modules/*",
    "#infrastructure/*": "./src/shared/infrastructure/*"
  }
}
```

**Step 2: Update tsconfig.json for IDE support**

Add `paths` to help IDEs understand the imports:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "allowJs": true,
    "checkJs": false,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "#client/*": ["src/client/*"],
      "#config/*": ["src/config/*"],
      "#server/*": ["src/server/*"],
      "#modules/*": ["src/modules/*"],
      "#infrastructure/*": ["src/shared/infrastructure/*"]
    }
  }
}
```

**Step 3: Verify tsconfig.json syntax**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 4: Run build to verify imports work**

```bash
npm run build
```

Expected: Build succeeds

**Step 5: Run tests to verify**

```bash
npm test
```

Expected: All 195 tests pass

**Step 6: Commit**

```bash
git add package.json tsconfig.json
git commit -m "feat: configure import paths for modules and infrastructure

Add #modules/* and #infrastructure/* to Node.js subpath imports.
Update tsconfig paths for IDE autocomplete support.
Uses native Node.js imports (no build tools required)."
```

---

### Task 3: Install ESLint Boundary Plugin

**Files:**

- Modify: `package.json` (add eslint-plugin-import)

**Step 1: Install eslint-plugin-import**

```bash
npm install --save-dev eslint-plugin-import
```

**Step 2: Verify installation**

```bash
npm list eslint-plugin-import
```

Expected: Shows version installed

**Step 3: Run tests to ensure nothing broke**

```bash
npm test
```

Expected: All 195 tests pass

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install eslint-plugin-import for module boundary enforcement

Will be configured to prevent direct imports that bypass module public APIs."
```

---

### Task 4: Configure ESLint Module Boundaries

**Files:**

- Modify: `eslint.config.js` (add import rules)

**Step 1: Read current eslint.config.js**

```bash
cat eslint.config.js
```

Note: Understand current structure

**Step 2: Add import plugin configuration**

Add to the eslint config array:

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
      // Prevent importing from internal module paths
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

**Step 3: Run lint to verify configuration**

```bash
npm run lint:js
```

Expected: No errors (no modules exist yet)

**Step 4: Commit**

```bash
git add eslint.config.js
git commit -m "feat: configure ESLint module boundary rules

Enforce that modules can only be imported via their public API (index.js).
Direct imports to internal module files are blocked."
```

---

## Phase 2: Move Infrastructure

### Task 5: Create Infrastructure Subdirectories

**Files:**

- Create: `src/shared/infrastructure/middleware/.gitkeep`
- Create: `src/shared/infrastructure/server/.gitkeep`
- Create: `src/shared/infrastructure/logging/.gitkeep`
- Create: `src/shared/infrastructure/session/.gitkeep`
- Create: `src/shared/infrastructure/i18n/.gitkeep`
- Create: `src/shared/infrastructure/security/.gitkeep`
- Create: `src/shared/infrastructure/errors/.gitkeep`

**Step 1: Create all infrastructure subdirectories**

```bash
mkdir -p src/shared/infrastructure/middleware
mkdir -p src/shared/infrastructure/server
mkdir -p src/shared/infrastructure/logging
mkdir -p src/shared/infrastructure/session
mkdir -p src/shared/infrastructure/i18n
mkdir -p src/shared/infrastructure/security
mkdir -p src/shared/infrastructure/errors
touch src/shared/infrastructure/*/.gitkeep
```

**Step 2: Verify directories**

```bash
ls -la src/shared/infrastructure/
```

Expected: See all 7 subdirectories

**Step 3: Commit**

```bash
git add src/shared/infrastructure/
git commit -m "feat: create infrastructure subdirectories

Organize infrastructure by technical domain:
- middleware: HTTP middleware
- server: Server lifecycle
- logging: Logging setup
- session: Session management
- i18n: Internationalization
- security: Security utilities
- errors: Error handling"
```

---

### Task 6: Move Middleware Files

**Files:**

- Move: `src/server/common/helpers/content-security-policy.js` → `src/shared/infrastructure/middleware/`
- Move: `src/server/common/helpers/content-security-policy.test.js` → `src/shared/infrastructure/middleware/`
- Move: `src/server/common/helpers/request-tracing.js` → `src/shared/infrastructure/middleware/`
- Move: `src/server/common/helpers/request-tracing.test.js` → `src/shared/infrastructure/middleware/`
- Move: `src/server/common/helpers/useragent-protection.js` → `src/shared/infrastructure/middleware/`
- Move: `src/server/common/helpers/useragent-protection.test.js` → `src/shared/infrastructure/middleware/`

**Step 1: Move content-security-policy files**

```bash
git mv src/server/common/helpers/content-security-policy.js src/shared/infrastructure/middleware/
git mv src/server/common/helpers/content-security-policy.test.js src/shared/infrastructure/middleware/
```

**Step 2: Move request-tracing files**

```bash
git mv src/server/common/helpers/request-tracing.js src/shared/infrastructure/middleware/
git mv src/server/common/helpers/request-tracing.test.js src/shared/infrastructure/middleware/
```

**Step 3: Move useragent-protection files**

```bash
git mv src/server/common/helpers/useragent-protection.js src/shared/infrastructure/middleware/
git mv src/server/common/helpers/useragent-protection.test.js src/shared/infrastructure/middleware/
```

**Step 4: Verify files moved**

```bash
ls src/shared/infrastructure/middleware/
```

Expected: See 6 files

**Step 5: Run tests**

```bash
npm test
```

Expected: All tests pass (imports still work due to git mv)

**Step 6: Commit**

```bash
git commit -m "refactor: move middleware to infrastructure layer

Move HTTP middleware to src/shared/infrastructure/middleware/:
- content-security-policy
- request-tracing
- useragent-protection

Tests colocated with source files."
```

---

### Task 7: Update Middleware Imports to Use New Paths

**Files:**

- Modify: `src/server/index.js` (update imports)

**Step 1: Find all imports of middleware files**

```bash
grep -r "common/helpers/content-security-policy" src/
grep -r "common/helpers/request-tracing" src/
grep -r "common/helpers/useragent-protection" src/
```

Note: Files that import these

**Step 2: Update src/server/index.js imports**

Replace old imports:

```javascript
import { contentSecurityPolicy } from './common/helpers/content-security-policy.js'
import { requestTracing } from './common/helpers/request-tracing.js'
import { userAgentProtection } from './common/helpers/useragent-protection.js'
```

With new imports:

```javascript
import { contentSecurityPolicy } from '#infrastructure/middleware/content-security-policy.js'
import { requestTracing } from '#infrastructure/middleware/request-tracing.js'
import { userAgentProtection } from '#infrastructure/middleware/useragent-protection.js'
```

**Step 3: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 4: Run build**

```bash
npm run build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/server/index.js
git commit -m "refactor: update middleware imports to use #infrastructure alias

Import middleware from new infrastructure location using path aliases."
```

---

### Task 8: Move Server Lifecycle Files

**Files:**

- Move: `src/server/common/helpers/start-server.js` → `src/shared/infrastructure/server/`
- Move: `src/server/common/helpers/start-server.test.js` → `src/shared/infrastructure/server/`
- Move: `src/server/common/helpers/metrics.js` → `src/shared/infrastructure/server/`
- Move: `src/server/common/helpers/metrics.test.js` → `src/shared/infrastructure/server/`
- Move: `src/server/common/helpers/pulse.js` → `src/shared/infrastructure/server/`
- Move: `src/server/common/helpers/pulse.test.js` → `src/shared/infrastructure/server/`

**Step 1: Move start-server files**

```bash
git mv src/server/common/helpers/start-server.js src/shared/infrastructure/server/
git mv src/server/common/helpers/start-server.test.js src/shared/infrastructure/server/
```

**Step 2: Move metrics files**

```bash
git mv src/server/common/helpers/metrics.js src/shared/infrastructure/server/
git mv src/server/common/helpers/metrics.test.js src/shared/infrastructure/server/
```

**Step 3: Move pulse files**

```bash
git mv src/server/common/helpers/pulse.js src/shared/infrastructure/server/
git mv src/server/common/helpers/pulse.test.js src/shared/infrastructure/server/
```

**Step 4: Find and update all imports**

```bash
grep -r "common/helpers/start-server" src/
grep -r "common/helpers/metrics" src/
grep -r "common/helpers/pulse" src/
```

**Step 5: Update imports in src/index.js**

Replace:

```javascript
import { startServer } from './server/common/helpers/start-server.js'
```

With:

```javascript
import { startServer } from '#infrastructure/server/start-server.js'
```

**Step 6: Update imports in src/server/index.js**

Replace:

```javascript
import { pulse } from './common/helpers/pulse.js'
import { metrics } from './common/helpers/metrics.js'
```

With:

```javascript
import { pulse } from '#infrastructure/server/pulse.js'
import { metrics } from '#infrastructure/server/metrics.js'
```

**Step 7: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 8: Commit**

```bash
git add src/
git commit -m "refactor: move server lifecycle to infrastructure layer

Move server setup and monitoring to src/shared/infrastructure/server/:
- start-server
- metrics
- pulse

Update imports to use #infrastructure alias."
```

---

### Task 9: Move Logging Files

**Files:**

- Move: `src/server/common/helpers/logging/*` → `src/shared/infrastructure/logging/`

**Step 1: Move logging directory**

```bash
git mv src/server/common/helpers/logging/* src/shared/infrastructure/logging/
```

**Step 2: Remove empty logging directory**

```bash
rmdir src/server/common/helpers/logging
```

**Step 3: Find all logging imports**

```bash
grep -r "common/helpers/logging" src/
```

**Step 4: Update imports**

Replace all occurrences of:

```javascript
'./common/helpers/logging/'
'../common/helpers/logging/'
```

With:

```javascript
'#infrastructure/logging/'
```

**Step 5: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add src/
git commit -m "refactor: move logging to infrastructure layer

Move logging setup to src/shared/infrastructure/logging/.
Update imports to use #infrastructure alias."
```

---

### Task 10: Move Session Management Files

**Files:**

- Move: `src/server/common/helpers/session-cache/*` → `src/shared/infrastructure/session/`
- Move: `src/server/common/helpers/redis-client.js` → `src/shared/infrastructure/session/`
- Move: `src/server/common/helpers/redis-client.test.js` → `src/shared/infrastructure/session/`

**Step 1: Move session-cache directory**

```bash
git mv src/server/common/helpers/session-cache/* src/shared/infrastructure/session/
rmdir src/server/common/helpers/session-cache
```

**Step 2: Move redis-client files**

```bash
git mv src/server/common/helpers/redis-client.js src/shared/infrastructure/session/
git mv src/server/common/helpers/redis-client.test.js src/shared/infrastructure/session/
```

**Step 3: Find and update imports**

```bash
grep -r "common/helpers/session-cache" src/
grep -r "common/helpers/redis-client" src/
```

**Step 4: Update all session imports**

Replace:

```javascript
'./common/helpers/session-cache/'
'./common/helpers/redis-client'
```

With:

```javascript
'#infrastructure/session/'
```

**Step 5: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add src/
git commit -m "refactor: move session management to infrastructure layer

Move session and Redis management to src/shared/infrastructure/session/:
- session-cache
- redis-client

Update imports to use #infrastructure alias."
```

---

### Task 11: Move i18n Files

**Files:**

- Move: `src/server/common/helpers/i18n/*` → `src/shared/infrastructure/i18n/`
- Move: `src/server/common/helpers/i18next.js` → `src/shared/infrastructure/i18n/`
- Move: `src/server/common/helpers/i18next.test.js` → `src/shared/infrastructure/i18n/`

**Step 1: Move i18n directory**

```bash
git mv src/server/common/helpers/i18n/* src/shared/infrastructure/i18n/
rmdir src/server/common/helpers/i18n
```

**Step 2: Move i18next files**

```bash
git mv src/server/common/helpers/i18next.js src/shared/infrastructure/i18n/
git mv src/server/common/helpers/i18next.test.js src/shared/infrastructure/i18n/
```

**Step 3: Find and update imports**

```bash
grep -r "common/helpers/i18n" src/
grep -r "common/helpers/i18next" src/
```

**Step 4: Update imports**

Replace all occurrences with `#infrastructure/i18n/`

**Step 5: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add src/
git commit -m "refactor: move i18n to infrastructure layer

Move internationalization to src/shared/infrastructure/i18n/:
- i18n helpers
- i18next setup

Update imports to use #infrastructure alias."
```

---

### Task 12: Move Security Files

**Files:**

- Move: `src/server/common/helpers/secure-context/*` → `src/shared/infrastructure/security/`
- Move: `src/server/common/helpers/proxy/*` → `src/shared/infrastructure/security/`

**Step 1: Move secure-context directory**

```bash
git mv src/server/common/helpers/secure-context/* src/shared/infrastructure/security/
rmdir src/server/common/helpers/secure-context
```

**Step 2: Move proxy directory**

```bash
git mv src/server/common/helpers/proxy/* src/shared/infrastructure/security/
rmdir src/server/common/helpers/proxy
```

**Step 3: Find and update imports**

```bash
grep -r "common/helpers/secure-context" src/
grep -r "common/helpers/proxy" src/
```

**Step 4: Update imports**

Replace with `#infrastructure/security/`

**Step 5: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add src/
git commit -m "refactor: move security utilities to infrastructure layer

Move security setup to src/shared/infrastructure/security/:
- secure-context (TLS)
- proxy

Update imports to use #infrastructure alias."
```

---

### Task 13: Move Error Handling Files

**Files:**

- Move: `src/server/common/helpers/errors.js` → `src/shared/infrastructure/errors/`
- Move: `src/server/common/helpers/errors.test.js` → `src/shared/infrastructure/errors/`

**Step 1: Move errors files**

```bash
git mv src/server/common/helpers/errors.js src/shared/infrastructure/errors/
git mv src/server/common/helpers/errors.test.js src/shared/infrastructure/errors/
```

**Step 2: Find and update imports**

```bash
grep -r "common/helpers/errors" src/
```

**Step 3: Update all error imports**

Replace with `#infrastructure/errors/errors.js`

**Step 4: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/
git commit -m "refactor: move error handling to infrastructure layer

Move error utilities to src/shared/infrastructure/errors/.
Update imports to use #infrastructure alias."
```

---

### Task 14: Move Remaining Helper Files

**Files:**

- Move: `src/server/common/helpers/serve-static-files.js` → `src/shared/infrastructure/server/`
- Move: `src/server/common/helpers/serve-static-files.test.js` → `src/shared/infrastructure/server/`

**Step 1: Move serve-static-files**

```bash
git mv src/server/common/helpers/serve-static-files.js src/shared/infrastructure/server/
git mv src/server/common/helpers/serve-static-files.test.js src/shared/infrastructure/server/
```

**Step 2: Update imports**

```bash
grep -r "serve-static-files" src/
```

Replace with `#infrastructure/server/serve-static-files.js`

**Step 3: Verify helpers directory is clean**

```bash
ls -la src/server/common/helpers/
```

Expected: Only auth/ and upload/ subdirectories remain (will move with modules)

**Step 4: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/
git commit -m "refactor: move static file serving to infrastructure layer

Complete infrastructure reorganization for server utilities."
```

---

## Phase 3: Create Platform Module

### Task 15: Create Platform Module Structure

**Files:**

- Create: `src/modules/platform/index.js`
- Create: `src/modules/platform/routes/`
- Create: `src/modules/platform/controllers/`
- Create: `src/modules/platform/views/`
- Create: `src/modules/platform/locales/`
- Create: `src/modules/platform/README.md`

**Step 1: Create platform directory structure**

```bash
mkdir -p src/modules/platform/routes
mkdir -p src/modules/platform/controllers
mkdir -p src/modules/platform/views
mkdir -p src/modules/platform/locales
```

**Step 2: Create README**

Create `src/modules/platform/README.md`:

````markdown
# Platform Module

System-level features: home page, health checks, error pages.

## Public API

```javascript
import { platform } from '#modules/platform'

// Use in server
await server.register(platform.plugin)
```
````

## Dependencies

- `#modules/identity` - For authenticated views

## Routes

- `GET /` - Home page (authenticated)
- `GET /health` - Health check
- Error pages

````

**Step 3: Create placeholder index.js**

Create `src/modules/platform/index.js`:

```javascript
// Platform module public API
export const platform = {
  plugin: {
    name: 'platform',
    version: '1.0.0',
    async register(server) {
      // Routes will be registered here
    }
  }
}
````

**Step 4: Verify structure**

```bash
tree src/modules/platform/
```

**Step 5: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add src/modules/platform/
git commit -m "feat: create platform module structure

Initialize platform module for system-level features.
Will contain home, health, and error routes."
```

---

### Task 16: Move Home Route to Platform Module

**Files:**

- Move: `src/server/home/controller.js` → `src/modules/platform/controllers/home-controller.js`
- Move: `src/server/home/controller.test.js` → `src/modules/platform/controllers/home-controller.test.js`
- Move: `src/server/home/index.njk` → `src/modules/platform/views/home.njk`
- Move: `src/server/home/en.json` → `src/modules/platform/locales/home.en.json`
- Move: `src/server/home/cy.json` → `src/modules/platform/locales/home.cy.json`
- Create: `src/modules/platform/routes/home.js`

**Step 1: Move home controller**

```bash
git mv src/server/home/controller.js src/modules/platform/controllers/home-controller.js
git mv src/server/home/controller.test.js src/modules/platform/controllers/home-controller.test.js
```

**Step 2: Move home view**

```bash
git mv src/server/home/index.njk src/modules/platform/views/home.njk
```

**Step 3: Move home locales**

```bash
git mv src/server/home/en.json src/modules/platform/locales/home.en.json
git mv src/server/home/cy.json src/modules/platform/locales/home.cy.json
```

**Step 4: Create home route definition**

Create `src/modules/platform/routes/home.js`:

```javascript
import { homeController } from '../controllers/home-controller.js'

export const homeRoute = {
  plugin: {
    name: 'platform.home',
    async register(server) {
      server.route({
        method: 'GET',
        path: '/',
        ...homeController
      })
    }
  }
}
```

**Step 5: Update controller test imports**

In `src/modules/platform/controllers/home-controller.test.js`, update relative imports to match new location.

**Step 6: Run tests**

```bash
npm test
```

Expected: home-controller.test.js passes

**Step 7: Remove old home directory**

```bash
rmdir src/server/home
```

**Step 8: Commit**

```bash
git add src/
git commit -m "refactor: move home route to platform module

Move home page to src/modules/platform/:
- Controller and tests
- View template
- Locales

Home route now part of platform module."
```

---

### Task 17: Move Health Route to Platform Module

**Files:**

- Move: `src/server/health/controller.js` → `src/modules/platform/controllers/health-controller.js`
- Move: `src/server/health/controller.test.js` → `src/modules/platform/controllers/health-controller.test.js`
- Create: `src/modules/platform/routes/health.js`

**Step 1: Move health controller**

```bash
git mv src/server/health/controller.js src/modules/platform/controllers/health-controller.js
git mv src/server/health/controller.test.js src/modules/platform/controllers/health-controller.test.js
```

**Step 2: Create health route**

Create `src/modules/platform/routes/health.js`:

```javascript
import { healthController } from '../controllers/health-controller.js'

export const healthRoute = {
  plugin: {
    name: 'platform.health',
    async register(server) {
      server.route({
        method: 'GET',
        path: '/health',
        ...healthController
      })
    }
  }
}
```

**Step 3: Update test imports**

Fix relative imports in health-controller.test.js

**Step 4: Run tests**

```bash
npm test
```

Expected: health-controller.test.js passes

**Step 5: Remove old health directory**

```bash
rmdir src/server/health
```

**Step 6: Commit**

```bash
git add src/
git commit -m "refactor: move health route to platform module

Move health check to src/modules/platform/."
```

---

### Task 18: Move Error Route to Platform Module

**Files:**

- Move: `src/server/error/` → `src/modules/platform/`

**Step 1: Check error route contents**

```bash
ls src/server/error/
```

**Step 2: Move error files to platform**

```bash
git mv src/server/error/* src/modules/platform/views/
```

**Step 3: Create error route if needed**

Create `src/modules/platform/routes/error.js` if error handling route exists.

**Step 4: Remove old error directory**

```bash
rmdir src/server/error
```

**Step 5: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add src/
git commit -m "refactor: move error pages to platform module

Move error templates to platform module views."
```

---

### Task 19: Complete Platform Module Public API

**Files:**

- Modify: `src/modules/platform/index.js`

**Step 1: Update platform index.js to register all routes**

```javascript
import { homeRoute } from './routes/home.js'
import { healthRoute } from './routes/health.js'

export const platform = {
  plugin: {
    name: 'platform',
    version: '1.0.0',
    dependencies: [], // Will add identity dependency later
    async register(server) {
      await server.register([homeRoute, healthRoute])
    }
  },

  // Public services (currently none)
  services: {}
}
```

**Step 2: Register platform module in router**

Modify `src/server/router.js` to include platform module:

```javascript
import { platform } from '#modules/platform'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      // Register platform module
      await server.register(platform.plugin)

      // ... existing route registrations
    }
  }
}
```

**Step 3: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 4: Run build and start server**

```bash
npm run build
npm start
```

Visit http://localhost:3000 and http://localhost:3000/health

Expected: Both work

**Step 5: Stop server**

Ctrl+C

**Step 6: Commit**

```bash
git add src/modules/platform/index.js src/server/router.js
git commit -m "feat: complete platform module with public API

Platform module now registered in router.
Home and health routes working through module structure."
```

---

## Phase 4: Create Identity Module

### Task 20: Create Identity Module Structure

**Files:**

- Create: `src/modules/identity/index.js`
- Create: `src/modules/identity/routes/`
- Create: `src/modules/identity/controllers/`
- Create: `src/modules/identity/services/`
- Create: `src/modules/identity/middleware/`
- Create: `src/modules/identity/views/`
- Create: `src/modules/identity/locales/`
- Create: `src/modules/identity/README.md`

**Step 1: Create identity directory structure**

```bash
mkdir -p src/modules/identity/{routes,controllers,services,middleware,views,locales}
```

**Step 2: Create README**

Create `src/modules/identity/README.md`:

````markdown
# Identity Module

User authentication, session management, and account features.

## Public API

```javascript
import { identity } from '#modules/identity'

// Register plugin
await server.register(identity.plugin)

// Use services
const user = await identity.services.authService.getUser(token)

// Use middleware
server.route({
  path: '/protected',
  options: {
    pre: [identity.middleware.provideAuthedUser]
  }
})
```
````

## Dependencies

None (foundation module)

## Routes

- `GET /auth` - OIDC callback
- `GET /login` - Login page
- `GET /logout` - Logout
- `GET /account` - Account page

````

**Step 3: Commit**

```bash
git add src/modules/identity/
git commit -m "feat: create identity module structure

Initialize identity module for authentication and user management."
````

---

### Task 21: Move Auth Services to Identity Module

**Files:**

- Move: `src/server/common/helpers/auth/*` → `src/modules/identity/services/`

**Step 1: Move auth directory**

```bash
git mv src/server/common/helpers/auth/* src/modules/identity/services/
rmdir src/server/common/helpers/auth
```

**Step 2: Update test imports in moved files**

Fix relative imports in all test files under `src/modules/identity/services/`

**Step 3: Run tests**

```bash
npm test
```

Expected: Auth service tests pass

**Step 4: Commit**

```bash
git add src/
git commit -m "refactor: move auth services to identity module

Move authentication services from common/helpers/auth/ to identity module.
These become internal services of the identity module."
```

---

### Task 22: Move Auth Routes to Identity Module

**Files:**

- Move: `src/server/auth/` → `src/modules/identity/`
- Move: `src/server/login/` → `src/modules/identity/`
- Move: `src/server/logout/` → `src/modules/identity/`
- Move: `src/server/account/` → `src/modules/identity/`

**Step 1: Move auth controller**

```bash
git mv src/server/auth/controller.js src/modules/identity/controllers/auth-controller.js
git mv src/server/auth/controller.test.js src/modules/identity/controllers/auth-controller.test.js
```

**Step 2: Move login files**

```bash
git mv src/server/login/controller.js src/modules/identity/controllers/login-controller.js
git mv src/server/login/controller.test.js src/modules/identity/controllers/login-controller.test.js
git mv src/server/login/index.njk src/modules/identity/views/login.njk
```

**Step 3: Move logout files**

```bash
git mv src/server/logout/controller.js src/modules/identity/controllers/logout-controller.js
git mv src/server/logout/controller.test.js src/modules/identity/controllers/logout-controller.test.js
git mv src/server/logout/prerequisites/provide-authed-user.js src/modules/identity/middleware/
```

**Step 4: Move account files**

```bash
git mv src/server/account/controller.js src/modules/identity/controllers/account-controller.js
git mv src/server/account/controller.test.js src/modules/identity/controllers/account-controller.test.js
git mv src/server/account/index.njk src/modules/identity/views/account.njk
git mv src/server/account/en.json src/modules/identity/locales/account.en.json
git mv src/server/account/cy.json src/modules/identity/locales/account.cy.json
```

**Step 5: Update all test imports**

Fix relative imports in all moved test files

**Step 6: Run tests**

```bash
npm test
```

Expected: Identity tests pass

**Step 7: Clean up old directories**

```bash
rmdir src/server/auth
rmdir src/server/login
rmdir src/server/logout/prerequisites
rmdir src/server/logout
rmdir src/server/account
```

**Step 8: Commit**

```bash
git add src/
git commit -m "refactor: move auth routes to identity module

Move all authentication routes to identity module:
- Auth OIDC callback
- Login
- Logout
- Account

Middleware and controllers now part of identity module."
```

---

### Task 23: Create Identity Module Routes

**Files:**

- Create: `src/modules/identity/routes/auth.js`
- Create: `src/modules/identity/routes/login.js`
- Create: `src/modules/identity/routes/logout.js`
- Create: `src/modules/identity/routes/account.js`

**Step 1: Create auth route**

Create `src/modules/identity/routes/auth.js`:

```javascript
import { authController } from '../controllers/auth-controller.js'

export const authRoute = {
  plugin: {
    name: 'identity.auth',
    async register(server) {
      server.route({
        method: 'GET',
        path: '/auth',
        ...authController
      })
    }
  }
}
```

**Step 2: Create login route**

Create `src/modules/identity/routes/login.js`:

```javascript
import { loginController } from '../controllers/login-controller.js'

export const loginRoute = {
  plugin: {
    name: 'identity.login',
    async register(server) {
      server.route({
        method: 'GET',
        path: '/login',
        ...loginController
      })
    }
  }
}
```

**Step 3: Create logout route**

Create `src/modules/identity/routes/logout.js`:

```javascript
import { logoutController } from '../controllers/logout-controller.js'

export const logoutRoute = {
  plugin: {
    name: 'identity.logout',
    async register(server) {
      server.route({
        method: 'GET',
        path: '/logout',
        ...logoutController
      })
    }
  }
}
```

**Step 4: Create account route**

Create `src/modules/identity/routes/account.js`:

```javascript
import { accountController } from '../controllers/account-controller.js'

export const accountRoute = {
  plugin: {
    name: 'identity.account',
    async register(server) {
      server.route({
        method: 'GET',
        path: '/account',
        ...accountController
      })
    }
  }
}
```

**Step 5: Commit**

```bash
git add src/modules/identity/routes/
git commit -m "feat: create identity module route definitions

Define route plugins for all identity routes."
```

---

### Task 24: Complete Identity Module Public API

**Files:**

- Modify: `src/modules/identity/index.js`

**Step 1: Create public API**

```javascript
import { authRoute } from './routes/auth.js'
import { loginRoute } from './routes/login.js'
import { logoutRoute } from './routes/logout.js'
import { accountRoute } from './routes/account.js'
import { authService } from './services/defra-id.js'
import { sessionService } from './services/user-session.js'
import { provideAuthedUser } from './middleware/provide-authed-user.js'

export const identity = {
  plugin: {
    name: 'identity',
    version: '1.0.0',
    dependencies: [],
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

**Step 2: Register identity in router**

Update `src/server/router.js`:

```javascript
import { identity } from '#modules/identity'
import { platform } from '#modules/platform'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      // Register identity first (foundation)
      await server.register(identity.plugin)

      // Register platform (depends on identity)
      await server.register(platform.plugin)

      // ... other routes
    }
  }
}
```

**Step 3: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add src/modules/identity/index.js src/server/router.js
git commit -m "feat: complete identity module with public API

Identity module now fully functional with:
- Auth routes (OIDC, login, logout, account)
- Services (auth, session)
- Middleware (provideAuthedUser)

Registered in router as foundation module."
```

---

### Task 25: Update Platform to Use Identity Module

**Files:**

- Modify: `src/modules/platform/index.js`
- Modify: `src/modules/platform/routes/home.js`

**Step 1: Update platform to declare identity dependency**

In `src/modules/platform/index.js`:

```javascript
export const platform = {
  plugin: {
    name: 'platform',
    version: '1.0.0',
    dependencies: ['identity'], // Declare dependency
    async register(server) {
      await server.register([homeRoute, healthRoute])
    }
  }
}
```

**Step 2: Update home route to use identity middleware**

In `src/modules/platform/routes/home.js`:

```javascript
import { homeController } from '../controllers/home-controller.js'
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

**Step 3: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 4: Test authentication flow**

```bash
npm run build
npm start
```

Visit http://localhost:3000/ - should be authenticated

**Step 5: Stop server and commit**

```bash
git add src/modules/platform/
git commit -m "feat: integrate identity module into platform

Platform module now uses identity middleware for authenticated routes.
Declares dependency on identity module."
```

---

## Summary & Next Steps

This plan covers:

- ✅ Phase 1: Foundation (path aliases, ESLint boundaries)
- ✅ Phase 2: Infrastructure reorganization
- ✅ Phase 3: Platform module
- ✅ Phase 4: Identity module with platform integration

**Remaining work (not in this plan):**

- Phase 3 continued: Registration module
- Phase 3 continued: Waste-reporting module
- Phase 4: Cleanup & documentation

**Success criteria:**

- All 195 tests passing
- Build succeeds
- Server starts and routes work
- Module boundaries enforced by ESLint

**Testing after each phase:**

```bash
npm test
npm run build
npm run lint
```

**Rollback if needed:**

```bash
git reset --hard <commit-hash>
```
