import { config } from '#config/config.js'
import { REGULATOR_ROLE } from '#server/auth/roles.js'
import { SCOPES } from '#server/auth/scopes.js'
import { http, HttpResponse } from 'msw'

/**
 * The identities the backend resolves, as `/v1/me` reports them. An operator
 * holds its own linked organisation's read and write scopes. A regulator reads
 * and searches every organisation and writes nothing. An identity on no list at
 * all is granted nothing.
 *
 * The backend decides every scope here and this fixture only restates it, so a
 * scope it grants belongs in this list whether or not this app guards on one.
 * The regulator's `organisation.search` is the scope the regulator's own page
 * guards on, and is the one a stale fixture is caught on. `organisation.read`
 * and `regulator` gate no route here, so nothing local pins them.
 *
 * `operatorWithoutWrite` is the same operator after the backend stops granting
 * the write scope: a narrower answer that still names a role.
 */
export const IDENTITIES = Object.freeze({
  operator: {
    role: 'operator',
    scopes: ['organisation.linked.read', SCOPES.organisationLinkedWrite]
  },
  operatorWithoutWrite: {
    role: 'operator',
    scopes: ['organisation.linked.read']
  },
  regulator: {
    role: REGULATOR_ROLE,
    scopes: ['organisation.read', SCOPES.organisationSearch, SCOPES.regulator]
  },
  unrecognised: { role: null, scopes: [] }
})

/**
 * MSW handler for the backend's identity endpoint.
 * @param {{ role: string | null, scopes: string[] }} [identity]
 */
export const identityHandler = (identity = IDENTITIES.operator) =>
  http.get(`${config.get('eprBackendUrl')}/v1/me`, () =>
    HttpResponse.json(identity)
  )
