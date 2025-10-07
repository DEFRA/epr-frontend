# OIDC Authentication Implementation Plan

Implementation plan for adding Defra ID OIDC authentication to epr-frontend, based on cdp-defra-id-demo and cdp-defra-id-stub.

## Current State

**epr-frontend** already has:

- Redis configuration and cache engine (`src/config/config.js:160-198`)
- Session cache infrastructure (`src/server/common/helpers/session-cache/`)
- Hapi server with similar structure to the demo app

**cdp-defra-id-stub** provides:

- OIDC endpoints (/.well-known/openid-configuration, /authorize, /token, /logout)
- JWT token generation with user claims
- Registration flow for test users

**cdp-defra-id-demo** implements:

- OIDC setup using @hapi/bell (`src/server/common/helpers/auth/defra-id.js`)
- Session cookie validation with automatic token refresh (`src/server/common/helpers/auth/session-cookie.js`)
- Login/logout flow

## Incremental Implementation Plan

### **Phase 1: Foundation - Configuration & Dependencies** ✅

- [x] 1. Add OIDC configuration to `src/config/config.js`
  - [x] defraIdOidcConfigurationUrl
  - [x] defraIdServiceId
  - [x] defraIdClientId
  - [x] defraIdClientSecret
  - [x] appBaseUrl

- [x] 2. Install required dependencies
  - [x] `@hapi/bell` (OAuth2/OIDC client)
  - [x] `@hapi/cookie` (session cookie auth)
  - [x] `@hapi/jwt` (JWT decoding)

### **Phase 2: Authentication Infrastructure** ✅

- [x] 3. Create user session helper utilities
  - [x] `src/server/common/helpers/auth/get-user-session.js`
  - [x] `src/server/common/helpers/auth/drop-user-session.js`
  - [x] `src/server/common/helpers/auth/user-session.js` (update/remove functions)

- [x] 4. Add request decorators for session management
  - [x] Decorate request with `getUserSession()` and `dropUserSession()`
  - [x] Update `src/server/index.js` to register decorators

### **Phase 3: OIDC Strategy Setup** ✅

- [x] 5. Create Defra ID authentication plugin
  - [x] `src/server/common/helpers/auth/defra-id.js`
  - [x] Fetch OIDC configuration from stub
  - [x] Configure @hapi/bell with authorization & token endpoints
  - [x] Extract JWT claims into user profile

- [x] 6. Create session cookie strategy
  - [x] `src/server/common/helpers/auth/session-cookie.js`
  - [x] Implement token expiry validation
  - [x] Set as default auth strategy

### **Phase 4: Token Refresh** ✅

- [x] 7. Implement automatic token refresh
  - [x] `src/server/common/helpers/auth/refresh-token.js`
  - [x] Called automatically when token expires (< 1 min remaining)
  - [x] Updates session with new tokens

### **Phase 5: Routes & Controllers** ✅

- [x] 8. Create login route
  - [x] `src/server/login/` module
  - [x] Simple controller with `auth: 'defra-id'`
  - [x] Redirects to home after auth

- [x] 9. Create auth callback route
  - [x] `src/server/auth/` module
  - [x] Handles OIDC callback
  - [x] Stores user session in Redis
  - [x] Sets session cookie

- [x] 10. Create logout route
  - [x] `src/server/logout/` module
  - [x] Clears local session
  - [x] Redirects to stub logout endpoint

### **Phase 6: Integration & Testing**

- [x] 11. Update router to register new routes ✅
  - [x] Add login, logout, auth to `src/server/router.js`
  - [x] Conditionally register auth routes only when not in test mode
  - [x] Update `src/server/index.js` to register auth plugins conditionally
  - [x] Set `auth: { mode: 'try' }` at server level (only when not in test)
  - [x] All tests passing, lint clean

- [x] 12. Update home page to show authentication status ✅
  - [x] Updated Nunjucks context to be async and include `authedUser`
  - [x] Updated home page template to show user info when authenticated
  - [x] Added login/logout links based on authentication state
  - [x] Updated context tests to handle async function
  - [x] All tests passing, lint clean

- [x] 13. Configure stub connection ✅
  - [x] Config already points to local cdp-defra-id-stub
  - [x] Fixed port from 3939 to 3200 (stub's default port)
  - [x] Ready to run with stub

### **Phase 7: Testing**

- [ ] 16. Add unit tests for authentication helpers
  - [ ] `src/server/common/helpers/auth/get-user-session.test.js`
  - [ ] `src/server/common/helpers/auth/drop-user-session.test.js`
  - [ ] `src/server/common/helpers/auth/user-session.test.js`
  - [ ] `src/server/common/helpers/auth/refresh-token.test.js`

- [ ] 17. Add integration tests for auth flow
  - [ ] Login flow test
  - [ ] Callback handling test
  - [ ] Token refresh test
  - [ ] Logout flow test

### **Phase 8: Optional Enhancements**

- [ ] 18. Add protected routes example
  - [ ] Demonstrate `auth: { mode: 'required' }`

- [ ] 19. Add session management utilities
  - [ ] View session data
  - [ ] Session timeout handling

## Key Implementation Notes

- **PKCE Flow**: @hapi/bell handles PKCE automatically
- **Session Storage**: Uses existing Redis infrastructure
- **Token Refresh**: Transparent to users, happens on every request validation
- **Logout**: Must redirect to stub's end_session_endpoint to clear both sessions

## Dependencies Between Phases

- Phase 2 depends on Phase 1 (config)
- Phase 3 depends on Phase 2 (session helpers)
- Phase 4 depends on Phase 3 (auth strategies)
- Phase 5 depends on Phase 4 (token refresh)
- Phase 6 depends on Phase 5 (routes)

## Reference Implementations

**Demo App**: `../cdp-defra-id-demo`

- Main config: `src/config/index.js:127-152`
- Auth setup: `src/server/common/helpers/auth/defra-id.js`
- Session validation: `src/server/common/helpers/auth/session-cookie.js`
- Token refresh: `src/server/common/helpers/auth/refresh-token.js`
- Auth callback: `src/server/auth/controller.js`
- Logout: `src/server/logout/controller.js`

**Stub App**: `../cdp-defra-id-stub`

- OIDC endpoints: `src/server/oidc/`

## Flow Diagram

See `../cdp-defra-id-demo/DEFRA-ID-FLOW.md` for complete sequence diagram of the OIDC flow.

## Files Implemented (Need Tests)

### Phase 2 - Authentication Infrastructure ✅

- `src/server/common/helpers/auth/get-user-session.js` - Retrieves user session from cache
- `src/server/common/helpers/auth/drop-user-session.js` - Drops user session from cache
- `src/server/common/helpers/auth/user-session.js` - Update/remove session functions

### Phase 3 - OIDC Strategy Setup ✅

- `src/server/common/helpers/auth/defra-id.js` - Defra ID OIDC authentication plugin
- `src/server/common/helpers/auth/session-cookie.js` - Session cookie strategy with token validation

### Phase 4 - Token Refresh ✅

- `src/server/common/helpers/auth/refresh-token.js` - Automatic token refresh when expiring

### Phase 5 - Routes & Controllers ✅

- `src/server/login/` - Login route that triggers OIDC flow
- `src/server/auth/` - OAuth callback handler that creates session
- `src/server/logout/` - Logout route that clears session and redirects to provider

### Phase 6 - Integration ✅ (Step 11 complete)

- `src/server/router.js` - Updated to register auth routes conditionally
- `src/server/index.js` - Updated to:
  - Register `defraId` and `sessionCookie` plugins (only when not in test mode)
  - Set `auth: { mode: 'try' }` at server level (only when not in test mode)
  - This allows routes to work without authentication by default, but authentication can be explicitly required per route

## Test Strategy

**Note**: These files are based on the reference implementation in `cdp-defra-id-demo`, which also does not include tests for these helpers.

The authentication system is tested through:

- **Unit tests**: Test controllers and helpers in isolation without authentication
- **Integration tests**: Would test full auth flow with the stub running (Phase 7)
- **Test environment behavior**:
  - Auth strategies and routes are NOT registered in test mode (`NODE_ENV=test`)
  - Routes work without authentication in test mode
  - This matches the pattern from `cdp-defra-id-demo`
