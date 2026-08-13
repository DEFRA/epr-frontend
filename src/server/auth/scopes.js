/**
 * Hapi route auth scopes, granted on the session credentials and checked via
 * `options.auth.scope` on protected routes.
 */
export const SCOPES = Object.freeze({
  regulator: 'regulator'
})

/**
 * The single answer to "is this a regulator?". A regulator reads an operator's
 * data and changes none of it, so both the write guard and the templates decide
 * from this one place. Takes the scopes alone rather than a session, so it
 * serves a request whose credentials hapi has not narrowed to a `UserSession`.
 * @param {{ scope?: string[] } | null} [credentials]
 * @returns {boolean}
 */
export const isRegulatorSession = (credentials) =>
  Boolean(credentials?.scope?.includes(SCOPES.regulator))
