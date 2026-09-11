/**
 * Backend scopes this app reads. The backend holds the only mapping from an
 * identity to a set of scopes and hands them to a session over `/v1/me`, so
 * every spelling here is that contract and nothing decides one locally.
 *
 * `organisationSearch` is checked via `options.auth.scope` on the regulator's
 * own page. `wasteBalanceLedgerRead` is checked the same way on the waste
 * balance ledger, and the backend guards its own ledger routes on it too.
 * `marketDataRead` guards the market insights page the same way, and the
 * backend guards the aggregate that page reads on it too.
 * `organisationLinkedWrite` is the operator's durable write permission — the
 * backend grants it to an operator for its own organisation and to nobody
 * else. The per-request `organisation.write` is decided on each backend call
 * and never reaches a session.
 *
 * `organisationRead` reaches the organisation a request is about. The backend
 * also grants it to an operator, per request, for their own active
 * organisation — but that grant is decided from the request's organisation and
 * `/v1/me` names none, so it never reaches a session. A session carrying it is
 * a regulator's or an admin's.
 */
export const SCOPES = Object.freeze({
  marketDataRead: 'market-data.read',
  organisationLinkedWrite: 'organisation.linked.write',
  organisationRead: 'organisation.read',
  organisationSearch: 'organisation.search',
  wasteBalanceLedgerRead: 'waste-balance.ledger.read'
})

const WRITE_SCOPES = Object.freeze([SCOPES.organisationLinkedWrite])

/**
 * The part of a session every scope question reads. It is the scopes alone
 * rather than a session, so a predicate serves a request whose credentials
 * hapi has not narrowed to a `UserSession`, and an unauthenticated request
 * answers every question with a no.
 * @typedef {{ scope?: string[] } | null} ScopeBearingCredentials
 */

/**
 * The single answer to "may this session change anything?". Only a write scope
 * says yes, so both the write guard and the templates decide from this one
 * place, and a session the backend grants nothing is offered no write control.
 * The templates share the name, so a context key that is absent or misspelled
 * reads as `undefined` and hides the control rather than showing it.
 * @param {ScopeBearingCredentials} [credentials]
 * @returns {boolean}
 */
export const hasWriteScope = (credentials) =>
  WRITE_SCOPES.some((writeScope) => credentials?.scope?.includes(writeScope))

/**
 * The single answer to "may this session read a waste balance ledger?". The
 * route gate and the link that offers the page both decide from here, so the
 * page cannot admit a session the link hides it from, or the reverse.
 * @param {ScopeBearingCredentials} [credentials]
 * @returns {boolean}
 */
export const hasLedgerReadScope = (credentials) =>
  credentials?.scope?.includes(SCOPES.wasteBalanceLedgerRead) === true

/**
 * The single answer to "may this session read the published market data?". The
 * route gate and the link that offers the page both decide from here, so the
 * page cannot admit a session the link hides it from, or the reverse.
 * @param {ScopeBearingCredentials} [credentials]
 * @returns {boolean}
 */
export const hasMarketDataReadScope = (credentials) =>
  credentials?.scope?.includes(SCOPES.marketDataRead) === true

/**
 * The single answer to "may this session read an organisation it does not
 * belong to?". The backend gates the records such a page reads on this same
 * scope, so a session without it would be refused there anyway.
 * @param {ScopeBearingCredentials} [credentials]
 * @returns {boolean}
 */
export const hasOrganisationReadScope = (credentials) =>
  credentials?.scope?.includes(SCOPES.organisationRead) === true
