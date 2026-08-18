/**
 * The role the backend resolves a regulator identity to. The backend holds the
 * only mapping from an identity to a role and hands it to a session over
 * `/v1/me`, so this spelling is that contract and nothing decides one locally.
 *
 * It is deliberately not the `regulator` scope. The role says who the user is
 * and chooses the shell they see; the scope says what they may do and gates a
 * control inside that shell.
 */
export const REGULATOR_ROLE = 'regulator_standard'

/**
 * The single answer to "whose shell is this?". Where a user lands, which
 * navigation renders and what the header calls the service are questions about
 * identity, so they read the role. A control inside the shell reads a scope
 * instead — see `hasWriteScope`.
 *
 * A session holding any other role keeps the operator shell, so a role this
 * app renders nothing special for still gets a page.
 *
 * Takes the credentials alone rather than a session, so it serves a request
 * whose credentials hapi has not narrowed to a `UserSession`.
 * @param {{ role?: string | null } | null} [credentials]
 * @returns {boolean}
 */
export const isRegulator = (credentials) => credentials?.role === REGULATOR_ROLE

/**
 * A session carries a positive identity or none at all. The backend answers
 * `role: null` for an identity it does not recognise, and such a session gets
 * no session cookie rather than one that falls through to whatever a guard
 * written against a specific scope happens to allow. A refresh reads it too,
 * and ends the session the backend has stopped recognising.
 *
 * Takes the role alone rather than a session, so it reads the backend's answer
 * at a refresh, before any session is built from it, and reads a session at
 * sign-in. One predicate answers the question in both places.
 * @param {{ role: string | null }} identity
 * @returns {boolean}
 */
export const holdsNoRole = (identity) => identity.role === null
