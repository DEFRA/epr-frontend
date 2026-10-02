/** @import { HapiServer } from '#server/common/hapi-types.js'; */
import { getByRole, getByText, queryByText } from '@testing-library/dom'
import Boom from '@hapi/boom'
import { JSDOM } from 'jsdom'
import { describe, expect } from 'vitest'

import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'

describe('#catchAll - server errors', () => {
  it('renders the generic error page and logs for an unhandled 5xx', async ({
    server
  }) => {
    server.route({
      method: 'GET',
      path: '/boom',
      options: { auth: false },
      handler: () => {
        throw new Error('boom')
      }
    })

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/boom'
    })

    expect(statusCode).toBe(statusCodes.internalServerError)

    const dom = new JSDOM(result)
    const main = getByRole(dom.window.document.body, 'main')

    expect(getByText(main, /Something has gone wrong/i)).toBeDefined()
    expect(server.loggerMocks.error).toHaveBeenCalledWith({
      err: expect.any(Error)
    })
  })
})

describe('#catchAll - a refused request', () => {
  const regulatorAuth = buildMockAuth({
    provider: OIDC_ENTRA_ID,
    profile: { id: 'entra-user-1', email: 'jane.doe@example.com' }
  })

  const operatorAuth = buildMockAuth({
    provider: OIDC_DEFRA_ID,
    profile: { id: 'defra-user-1', email: 'defra.user@example.com' }
  })

  /**
   * A route that refuses, standing in for any route the backend or a guard
   * refuses for this session. CSRF is off so that a refused POST can only be
   * the handler's refusal, never the crumb's.
   * @param {HapiServer} server
   * @param {'GET' | 'POST'} method
   */
  const routeThatRefuses = (server, method) =>
    server.route({
      method,
      path: '/refused',
      options: { plugins: { crumb: false } },
      handler: () => {
        throw Boom.forbidden('Access denied')
      }
    })

  it('answers a refused GET with 403, not a redirect to a page that answers 200', async ({
    server
  }) => {
    routeThatRefuses(server, 'GET')

    const response = await server.inject({
      method: 'GET',
      url: '/refused',
      auth: regulatorAuth
    })

    expect(response.statusCode).toBe(statusCodes.forbidden)
  })

  it('answers a refused POST with 403 in place, holding the same status as a refused GET', async ({
    server
  }) => {
    routeThatRefuses(server, 'POST')

    const response = await server.inject({
      method: 'POST',
      url: '/refused',
      auth: regulatorAuth,
      payload: {}
    })

    expect(response.statusCode).toBe(statusCodes.forbidden)
    expect(response.headers['location']).toBeUndefined()
  })

  it('states that permission is absent for a session signed in with Entra ID', async ({
    server
  }) => {
    routeThatRefuses(server, 'GET')

    const response = await server.inject({
      method: 'GET',
      url: '/refused',
      auth: regulatorAuth
    })

    const dom = new JSDOM(response.result)
    const body = dom.window.document.body

    expect(getByText(body, 'You do not have permission')).toBeDefined()
  })

  it('states that permission is absent for a session signed in with Defra ID', async ({
    server
  }) => {
    routeThatRefuses(server, 'GET')

    const response = await server.inject({
      method: 'GET',
      url: '/refused',
      auth: operatorAuth
    })

    expect(response.statusCode).toBe(statusCodes.forbidden)

    const dom = new JSDOM(response.result)
    const body = dom.window.document.body

    expect(getByText(body, 'You do not have permission')).toBeDefined()
    expect(queryByText(body, 'Forbidden')).toBeNull()
  })

  /**
   * `@hapi/crumb` refuses a stale or missing crumb with a bare 403, and it is
   * registered for the whole server, so a CSRF refusal reads the same page as
   * an authorisation refusal. The page fits it poorly: it tells the reader to
   * ask for access when the answer is to go back and submit the form again.
   */
  it('reads the permission page to a signed in user whose crumb is missing', async ({
    server
  }) => {
    server.route({
      method: 'POST',
      path: '/needs-a-crumb',
      handler: () => 'never reached'
    })

    const response = await server.inject({
      method: 'POST',
      url: '/needs-a-crumb',
      auth: operatorAuth,
      payload: {}
    })

    expect(response.statusCode).toBe(statusCodes.forbidden)

    const body = new JSDOM(response.result).window.document.body
    expect(getByText(body, 'You do not have permission')).toBeDefined()
  })
})
