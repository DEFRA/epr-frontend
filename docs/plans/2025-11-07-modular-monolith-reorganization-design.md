# Modular Monolith Reorganization Design

**Date:** 2025-11-07
**Status:** Proposed
**Author:** Design Session with Development Team

## Context

The EPR Frontend codebase has grown difficult to navigate. Finding all files related to a single feature (like `auth` or `account`) requires searching across 8+ locations: routes, controllers, helpers, templates, i18n, constants, and more. The main pain point is 18 loosely organized helper files in `common/helpers/` that mix infrastructure and business logic without clear boundaries.

## Goals

This reorganization aims to achieve:

1. **Fast file lookup** - Find any file related to a feature in under 10 seconds
2. **Clear boundaries** - Obvious where new code should go
3. **Minimal imports** - Less `../../../` navigation in import statements
4. **Onboarding speed** - New developers understand structure quickly

## Approach: Modular Monolith with Controlled Dependencies

The design reorganizes the codebase into **business domain modules** with **controlled dependencies**. Each module is self-contained with all its routes, services, views, and tests. Modules communicate through explicit public APIs, enforced by ESLint import rules.

## Architecture

### High-Level Structure

```
src/
├── modules/                    # Business domain modules
│   ├── identity/              # Authentication & user accounts
│   ├── registration/          # Producer/organization registration
│   ├── waste-reporting/       # Waste tracking & submissions
│   └── platform/              # System-level features (home, health, errors)
│
├── infrastructure/            # Shared technical foundation
│   ├── middleware/
│   ├── server/
│   ├── logging/
│   ├── session/
│   ├── i18n/
│   ├── security/
│   └── errors/
│
├── server/                    # Server setup (minimal)
│   ├── index.js
│   └── router.js
│
├── config/                    # Configuration (unchanged)
└── client/                    # Frontend assets (unchanged)
```

### Module Dependency Graph

```
identity (foundation)
  ↓
platform (depends on identity for auth)
  ↓
registration (depends on identity + platform)
  ↓
waste-reporting (depends on identity + platform + registration)
```

**Key principle:** Dependencies flow downward only. No circular dependencies between modules.

## Module Structure

### Public API Pattern

Each module has a single entry point (`index.js`) that exports its public API:

```javascript
// modules/identity/index.js
export const identity = {
  // Hapi plugin for route registration
  plugin: {
    name: 'identity',
    async register(server) {
      await server.register([
        authRoutes,
        loginRoutes,
        logoutRoutes,
        accountRoutes
      ])
    }
  },

  // Services other modules can use
  services: {
    authService,
    sessionService
  },

  // Middleware other modules can use
  middleware: {
    provideAuthedUser,
    requireAuth
  }
}
```

### Import Rules

1. ✅ **Allowed:** `import { identity } from '@modules/identity'` (through public API)
2. ✅ **Allowed:** `import { logger } from '@infrastructure/logging/logger'` (infrastructure is shared)
3. ❌ **Blocked:** `import { authService } from '@modules/identity/services/auth-service'` (bypass public API)
4. ❌ **Blocked:** Circular dependencies between modules

**Enforcement:** ESLint plugin (`eslint-plugin-boundaries` or `eslint-plugin-import`) with path alias configuration.

### Internal Module Structure

Every module follows this consistent pattern:

```
modules/identity/
├── index.js                    # PUBLIC API - only entry point
│
├── routes/                     # Route definitions
│   ├── index.js               # Exports all route plugins
│   ├── auth.js
│   ├── auth.test.js           # Colocated tests
│   ├── login.js
│   ├── login.test.js
│   └── ...
│
├── controllers/                # Route handlers
│   ├── auth-controller.js
│   ├── auth-controller.test.js
│   └── ...
│
├── services/                   # Business logic
│   ├── auth-service.js
│   ├── auth-service.test.js
│   ├── session-service.js
│   ├── session-service.test.js
│   └── ...
│
├── middleware/                 # Module-specific middleware
│   ├── provide-authed-user.js
│   ├── provide-authed-user.test.js
│   └── ...
│
├── views/                      # Nunjucks templates
│   ├── login.njk
│   ├── logout.njk
│   └── account.njk
│
├── locales/                    # i18n strings
│   ├── en.json
│   └── cy.json
│
├── types.js                    # Module-specific TypeScript/JSDoc types
└── README.md                   # Module documentation
```

**Benefits:**

- Everything for a feature lives together
- Predictable structure across all modules
- Tests colocated with source files
- Clear separation: routes vs controllers vs services

## Module Descriptions

### identity

**Responsibility:** User authentication, session management, user accounts

**Current files to migrate:**

- `src/server/auth/`
- `src/server/login/`
- `src/server/logout/`
- `src/server/account/`
- `src/server/common/helpers/auth/*`

**Public API exports:**

- `plugin` - Route registration
- `services.authService` - OIDC integration
- `services.sessionService` - Session operations
- `middleware.provideAuthedUser` - Add user to request
- `middleware.requireAuth` - Enforce authentication

**Dependencies:** None (foundation module)

### platform

**Responsibility:** System-level features (home page, health checks, error pages, navigation)

**Current files to migrate:**

- `src/server/home/`
- `src/server/health/`
- `src/server/error/`

**Public API exports:**

- `plugin` - Route registration
- `services.navigationService` - Build navigation with auth context
- `services.errorService` - Error handling/rendering

**Dependencies:** `identity` (for authenticated views)

### registration

**Responsibility:** Producer and organization registration, compliance setup

**Current files to migrate:**

- `src/server/registration/`

**Public API exports:**

- `plugin` - Route registration
- `services.registrationService` - Registration business logic

**Dependencies:** `identity`, `platform`

### waste-reporting

**Responsibility:** Waste summary uploads, progress tracking, submission workflows

**Current files to migrate:**

- `src/server/summary-log-upload/`
- `src/server/summary-log-upload-progress/`
- `src/server/common/helpers/upload/*`

**Public API exports:**

- `plugin` - Route registration
- `services.uploadService` - Upload orchestration
- `services.statusService` - Upload status tracking

**Dependencies:** `identity`, `platform`, `registration`

## Infrastructure Layer

Infrastructure is **not a module** - it's shared foundation that all modules can import directly without restrictions.

```
infrastructure/
├── middleware/                 # Cross-cutting HTTP middleware
│   ├── content-security-policy.js
│   ├── request-tracing.js
│   └── useragent-protection.js
│
├── server/                     # Server lifecycle
│   ├── start-server.js
│   ├── metrics.js
│   └── pulse.js
│
├── logging/                    # Logging setup
│   ├── logger.js
│   ├── request-logger.js
│   └── configure-logging.js
│
├── session/                    # Session management
│   ├── session-cache.js
│   ├── redis-client.js
│   └── memory-cache.js
│
├── i18n/                       # Internationalization
│   ├── i18next.js
│   ├── i18n.js
│   └── configure-i18n.js
│
├── security/                   # Security utilities
│   ├── secure-context.js
│   ├── proxy.js
│   └── ...
│
└── errors/                     # Error handling
    ├── error-handler.js
    ├── custom-errors.js
    └── boom-helpers.js
```

**Key characteristics:**

- No public API constraint (import directly from any file)
- No business logic (only technical infrastructure)
- No routes or views (pure utilities)
- Stable (changes less frequently than modules)

**What gets moved here:** The 18 loose helper files from `src/server/common/helpers/` organized into clear technical domains.

## Migration Strategy

### Phase 1: Foundation (Do First)

**Goal:** Set up structure without breaking existing code

**Tasks:**

1. Create `src/modules/` and `src/infrastructure/` directories
2. Configure path aliases in `tsconfig.json` / `jsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@modules/*": ["src/modules/*"],
         "@infrastructure/*": ["src/infrastructure/*"]
       }
     }
   }
   ```
3. Install ESLint boundary checking plugin
4. Configure module boundary rules in ESLint config
5. Update Babel/Webpack configs to recognize new paths

**Validation:** Build succeeds, tests pass, no code moved yet

### Phase 2: Move Infrastructure (Low Risk)

**Goal:** Reorganize the 18 loose helper files into clear domains

**Approach:** Single PR to move all infrastructure at once

**Why low risk:**

- Pure utilities, no business logic
- Find/replace imports across codebase
- Can use ESLint to deprecate old paths with warnings

**Tasks:**

1. Create `infrastructure/` subdirectories
2. Move files from `src/server/common/helpers/` to appropriate infrastructure locations:
   - `content-security-policy.js` → `infrastructure/middleware/`
   - `start-server.js` → `infrastructure/server/`
   - `redis-client.js` → `infrastructure/session/`
   - etc.
3. Update all imports to use `@infrastructure/*` paths
4. Run full test suite
5. Delete old `common/helpers/` files

**Validation:** All tests pass, no import errors

### Phase 3: Create Modules (Gradual)

**Goal:** Migrate features to modules one at a time

**Order:**

1. **platform** (simplest, quick win)
   - Move: `home/`, `health/`, `error/`
   - Create public API
   - Update router registration

2. **identity** (foundation for other modules)
   - Move: `auth/`, `login/`, `logout/`, `account/`
   - Migrate auth helpers
   - Create public API with middleware exports
   - Update router registration

3. **registration** (depends on identity)
   - Move: `registration/`
   - Update imports to use `@modules/identity`
   - Create public API
   - Update router registration

4. **waste-reporting** (most complex, do last)
   - Move: `summary-log-upload/`, `summary-log-upload-progress/`
   - Migrate upload helpers
   - Update imports to use other modules
   - Create public API
   - Update router registration

**Per-module process:**

1. Create module directory structure
2. Move files from old locations
3. Create `index.js` public API
4. Update internal imports to relative paths
5. Update external imports to use `@modules/{name}`
6. Update `router.js` to register new module plugin
7. Run full test suite
8. Delete old files
9. Create module README with usage examples
10. Merge PR

**During migration:**

- Old and new structures coexist
- Each module migration is one PR
- Router registers both old plugins and new module plugins temporarily
- Tests must pass before merging

### Phase 4: Cleanup & Documentation

**Goal:** Remove old structure, document new patterns

**Tasks:**

1. Delete remaining `src/server/{feature}/` directories
2. Update developer documentation
3. Create architecture decision record (ADR)
4. Add module template/generator script
5. Update onboarding docs with new structure

## Example: Using the New Structure

### Finding Auth-Related Code

**Before:** Search 8+ locations

- Route: `src/server/auth/index.js`
- Controller: `src/server/auth/controller.js`
- Helpers: `src/server/common/helpers/auth/*.js`
- Middleware: `src/server/logout/prerequisites/provide-authed-user.js`
- Templates: `src/server/login/index.njk`
- i18n: `src/server/login/en.json` + `src/server/common/en.json`

**After:** One location

- Everything: `src/modules/identity/`

### Adding a New Feature Requiring Auth

**Code:**

```javascript
// modules/my-feature/routes/my-route.js
import { identity } from '@modules/identity'
import { platform } from '@modules/platform'

export const myRoute = {
  method: 'GET',
  path: '/my-feature',
  options: {
    pre: [identity.middleware.provideAuthedUser],
    handler: async (request, h) => {
      const user = request.auth.credentials
      // Use identity service if needed
      const sessionData = await identity.services.sessionService.get(request)

      return h.view('my-feature/index', { user, sessionData })
    }
  }
}
```

**Benefits:**

- Clear where auth comes from (`@modules/identity`)
- Explicit public API usage
- No hunting for middleware location

## Trade-offs

### Benefits

1. **Improved discoverability** - All related files in one module directory
2. **Clear boundaries** - Public APIs prevent tight coupling
3. **Better onboarding** - Consistent structure across modules
4. **Easier testing** - Module isolation enables better testing strategies
5. **Future flexibility** - Modules could become microservices if needed
6. **Reduced cognitive load** - Less context switching between directories

### Costs

1. **Migration effort** - Significant upfront work to reorganize
2. **Learning curve** - Team needs to understand module boundaries
3. **Discipline required** - Must maintain boundaries (ESLint helps)
4. **Initial slowdown** - Developers need to adjust to new patterns
5. **Import overhead** - Explicit public APIs add slight verbosity

### Mitigations

- **Gradual migration** reduces risk and allows learning
- **ESLint enforcement** prevents boundary violations
- **Module READMEs** document usage patterns
- **Consistent structure** reduces cognitive load over time

## Success Criteria

This reorganization succeeds if:

1. **Navigation time decreases** - Developers find files faster (measure with surveys)
2. **Fewer cross-directory imports** - Most imports stay within modules
3. **Clearer PR reviews** - Reviewers understand context faster
4. **Faster onboarding** - New developers productive sooner
5. **Better test isolation** - Module tests don't require extensive mocking

## Open Questions

1. Should component templates move to modules or stay in `common/components/`?
2. How should shared constants (status codes, MIME types) be organized?
3. Should we create a shared testing utilities module or keep in infrastructure?
4. How do we handle shared i18n strings that span multiple modules?

## Next Steps

1. Review and approve this design
2. Create architectural decision record (ADR)
3. Set up worktree for implementation
4. Create detailed implementation plan
5. Begin Phase 1: Foundation setup

## References

- Current codebase analysis: [codebase exploration report]
- Modular monolith pattern: https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer
- Module boundaries enforcement: https://github.com/javierbrea/eslint-plugin-boundaries
