/**
 * Backend scopes this app reads. The backend holds the only mapping from an
 * identity to a set of scopes and hands them to a session over `/v1/me`, so
 * every spelling here is that contract and nothing decides one locally.
 *
 * `organisationSearch` is checked via `options.auth.scope` on the regulator's
 * own page. `regulator` is granted by the backend to a regulator identity and
 * gates no route here. `organisationLinkedWrite` is the operator's durable write
 * permission — the backend grants it to an operator for its own organisation
 * and to nobody else. The per-request `organisation.write` is decided on each
 * backend call and never reaches a session.
 */
export const SCOPES = Object.freeze({
  organisationLinkedWrite: 'organisation.linked.write',
  organisationSearch: 'organisation.search',
  regulator: 'regulator'
})

const WRITE_SCOPES = Object.freeze([SCOPES.organisationLinkedWrite])

/**
 * The single answer to "may this session change anything?". Only a write scope
 * says yes, so both the write guard and the templates decide from this one
 * place, and a session the backend grants nothing is offered no write control.
 * The templates share the name, so a context key that is absent or misspelled
 * reads as `undefined` and hides the control rather than showing it.
 *
 * Takes the scopes alone rather than a session, so it serves a request whose
 * credentials hapi has not narrowed to a `UserSession`.
 * @param {{ scope?: string[] } | null} [credentials]
 * @returns {boolean}
 */
export const hasWriteScope = (credentials) =>
  WRITE_SCOPES.some((writeScope) => credentials?.scope?.includes(writeScope))
