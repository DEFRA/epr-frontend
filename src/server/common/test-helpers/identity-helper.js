import { config } from '#config/config.js'
import { SCOPES } from '#server/auth/scopes.js'
import { http, HttpResponse } from 'msw'

/**
 * The identities the backend resolves, as `/v1/me` reports them. An operator
 * holds its own linked organisation's read and write scopes, a regulator reads
 * every organisation and writes nothing, and an identity on no list at all is
 * granted nothing.
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
    role: 'regulator_standard',
    scopes: ['organisation.read', SCOPES.regulator]
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
