import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { REGULATOR_ROLE } from '#server/auth/roles.js'
import { SCOPES } from '#server/auth/scopes.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { it } from '#vite/fixtures/server.js'
import {
  getAllByRole,
  getByRole,
  queryByRole,
  queryByText
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * @import { DOMWindow } from 'jsdom'
 * @import { SetupServerApi } from 'msw/node'
 * @import { ServerFixtures } from '#vite/fixtures/server.js'
 */

const backendUrl = config.get('eprBackendUrl')

const regulatorAuth = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'jane.doe@example.com' },
  role: REGULATOR_ROLE,
  scope: [SCOPES.organisationSearch, SCOPES.regulator]
})

const acme = {
  id: '6507f1f77bcf86cd79943901',
  orgId: 50002,
  companyDetails: { name: 'ACME ltd' },
  status: 'approved',
  submittedToRegulator: 'ea'
}

const brightWaste = {
  id: '6507f1f77bcf86cd79943902',
  orgId: 50003,
  companyDetails: { name: 'Bright Waste plc' },
  status: 'active',
  submittedToRegulator: 'nrw'
}

/**
 * Answers the backend's organisations call with a page built around the given
 * organisations, and hands back what the app asked for so a test can assert on
 * the request as well as the rendering.
 * @param {SetupServerApi} msw
 * @param {{ items: object[], page?: number, totalPages?: number }} results
 * @returns {() => URL}
 */
const backendReturns = (msw, { items, page = 1, totalPages = 1 }) => {
  /** @type {URL | undefined} */
  let requested

  msw.use(
    http.get(`${backendUrl}/v1/organisations`, ({ request }) => {
      requested = new URL(request.url)

      return HttpResponse.json({
        items,
        page,
        pageSize: 50,
        totalItems: items.length,
        totalPages
      })
    })
  )

  return () => /** @type {URL} */ (requested)
}

/**
 * @param {ServerFixtures['server']} server
 * @param {string} url
 */
const visit = async (server, url) => {
  const { statusCode, result } = await server.inject({
    method: 'GET',
    url,
    auth: regulatorAuth
  })

  return { statusCode, body: new JSDOM(asHtml(result)).window.document.body }
}

/**
 * The cells of every results row, in column order, with the row header first.
 * @param {InstanceType<DOMWindow['HTMLElement']>} body
 * @returns {string[][]}
 */
const resultRows = (body) =>
  getAllByRole(getByRole(body, 'table'), 'row')
    .slice(1)
    .map((row) =>
      [getByRole(row, 'rowheader'), ...getAllByRole(row, 'cell')].map((cell) =>
        (cell.textContent ?? '').trim()
      )
    )

describe('/regulators/organisations - GET integration', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('shows every organisation to a regulator who has not searched yet', async ({
    server,
    msw
  }) => {
    const requested = backendReturns(msw, { items: [acme, brightWaste] })

    const { statusCode, body } = await visit(
      server,
      '/regulators/organisations'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(requested().searchParams.has('search')).toBe(false)
    expect(requested().searchParams.get('page')).toBe('1')
    expect(resultRows(body)).toHaveLength(2)
  })

  it('heads the results with the columns the regulator reads', async ({
    server,
    msw
  }) => {
    backendReturns(msw, { items: [acme] })

    const { body } = await visit(server, '/regulators/organisations')

    expect(
      getAllByRole(getByRole(body, 'table'), 'columnheader').map((heading) =>
        (heading.textContent ?? '').trim()
      )
    ).toStrictEqual(['Name', 'Organisation ID', 'Regulator', 'Status'])
  })

  it('narrows the results to the organisations matching the search', async ({
    server,
    msw
  }) => {
    const requested = backendReturns(msw, { items: [acme] })

    const { body } = await visit(
      server,
      '/regulators/organisations?search=ACME'
    )

    expect(requested().searchParams.get('search')).toBe('ACME')
    expect(resultRows(body)).toStrictEqual([
      ['ACME ltd', '50002', 'EA', 'approved']
    ])
  })

  it('opens the organisation from its name', async ({ server, msw }) => {
    backendReturns(msw, { items: [acme] })

    const { body } = await visit(server, '/regulators/organisations')

    expect(
      getByRole(getByRole(body, 'table'), 'link', { name: 'ACME ltd' })
    ).toHaveProperty(
      'href',
      expect.stringContaining('/organisations/6507f1f77bcf86cd79943901')
    )
  })

  it('says no organisation was found when the search matches none', async ({
    server,
    msw
  }) => {
    backendReturns(msw, { items: [], totalPages: 0 })

    const { body } = await visit(
      server,
      '/regulators/organisations?search=nothing'
    )

    expect(queryByText(body, 'No organisation was found.')).not.toBeNull()
    expect(queryByRole(body, 'table')).toBeNull()
  })

  it('pages through the results, carrying the search with it', async ({
    server,
    msw
  }) => {
    backendReturns(msw, { items: [acme], page: 2, totalPages: 3 })

    const { body } = await visit(
      server,
      '/regulators/organisations?search=ACME&page=2'
    )

    const pagination = getByRole(body, 'navigation', { name: 'Pagination' })

    expect(
      getAllByRole(pagination, 'link').map((link) => link.getAttribute('href'))
    ).toStrictEqual([
      '/regulators/organisations?search=ACME&page=1',
      '/regulators/organisations?search=ACME&page=3'
    ])
  })

  it('offers no paging when every result fits on one page', async ({
    server,
    msw
  }) => {
    backendReturns(msw, { items: [acme] })

    const { body } = await visit(server, '/regulators/organisations')

    expect(queryByRole(body, 'navigation', { name: 'Pagination' })).toBeNull()
  })

  it('refuses a signed in user who holds no search scope with a 403', async ({
    server
  }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/regulators/organisations',
      auth: buildMockAuth({
        provider: OIDC_ENTRA_ID,
        profile: { id: 'entra-user-2', email: 'no.role@example.com' },
        role: REGULATOR_ROLE,
        scope: [SCOPES.regulator]
      })
    })

    expect(statusCode).toBe(statusCodes.forbidden)
  })

  it('redirects an unauthenticated request to sign in', async ({ server }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/regulators/organisations'
    })

    expect(statusCode).toBe(statusCodes.found)
  })
})
