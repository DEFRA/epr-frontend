/**
 * @import { UserProfile } from './session.js'
 */

/**
 * The fields of a provider's token response that decide which token a session
 * presents to the backend. A sign-in response and a refresh response both
 * carry them, so one rule serves both.
 * @typedef {{ id_token: string, access_token?: string }} ProviderTokens
 */

/**
 * What an OIDC provider does differently from the others.
 *
 * A session records the provider that issued it, and the refresh path reads
 * every provider difference from here. So one provider is described in one
 * place, and a session refreshes with the credentials, the token and the
 * claim mapping of the provider it came from.
 *
 * `tokenRequestParams` are the provider's own parameters on the refresh
 * request. The grant type and the refresh token are the same for every
 * provider and are added by the refresh call.
 *
 * `selectBackendToken` picks the token the session presents to the backend
 * from a token response: the id token for Defra ID, and the access token for
 * Entra ID, because the `roles` claim the backend resolves a regulator from
 * arrives there. Sign-in and refresh both ask it, so a session presents the
 * same token whichever one built it.
 *
 * `verifyBackendToken` verifies that token and reads the identity from it, so
 * a refresh derives the profile and the expiry the same way sign-in does.
 * @typedef {{
 *   tokenRequestParams: Record<string, string>
 *   selectBackendToken: (tokens: ProviderTokens) => string
 *   verifyBackendToken: (token: string) => Promise<{ profile: UserProfile, expiresAt: string }>
 * }} AuthProvider
 */

/**
 * The auth providers a session can come from, by provider name. Entra ID is
 * absent when regulator access is off, so a lookup answers `undefined` for a
 * provider this server does not hold.
 * @typedef {Partial<Record<string, AuthProvider>>} AuthProviders
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
