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

### **Phase 3: OIDC Strategy Setup**

- [ ] 5. Create Defra ID authentication plugin
  - [ ] `src/server/common/helpers/auth/defra-id.js`
  - [ ] Fetch OIDC configuration from stub
  - [ ] Configure @hapi/bell with authorization & token endpoints
  - [ ] Extract JWT claims into user profile

- [ ] 6. Create session cookie strategy
  - [ ] `src/server/common/helpers/auth/session-cookie.js`
  - [ ] Implement token expiry validation
  - [ ] Set as default auth strategy

### **Phase 4: Token Refresh**

- [ ] 7. Implement automatic token refresh
  - [ ] `src/server/common/helpers/auth/refresh-token.js`
  - [ ] Called automatically when token expires (< 1 min remaining)
  - [ ] Updates session with new tokens

### **Phase 5: Routes & Controllers**

- [ ] 8. Create login route
  - [ ] `src/server/login/` module
  - [ ] Simple controller with `auth: 'defra-id'`
  - [ ] Redirects to home after auth

- [ ] 9. Create auth callback route
  - [ ] `src/server/auth/` module
  - [ ] Handles OIDC callback
  - [ ] Stores user session in Redis
  - [ ] Sets session cookie

- [ ] 10. Create logout route
  - [ ] `src/server/logout/` module
  - [ ] Clears local session
  - [ ] Redirects to stub logout endpoint

### **Phase 6: Integration & Testing**

- [ ] 11. Update router to register new routes
  - [ ] Add login, logout, auth to `src/server/router.js`

- [ ] 12. Update home page to show authentication status
  - [ ] Display user info when authenticated
  - [ ] Show login/logout links

- [ ] 13. Configure stub connection
  - [ ] Point to local cdp-defra-id-stub instance
  - [ ] Add environment variables to `.env` or compose

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

**Note**: These files are based on the reference implementation in `cdp-defra-id-demo`, which also does not include tests for these helpers.
