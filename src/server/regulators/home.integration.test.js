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
  getByLabelText,
  getByRole,
  getByTestId,
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

describe('/regulators/home - GET integration', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('renders the username derived from the signed in regulator email', async ({
    server,
    msw
  }) => {
    backendReturns(msw, { items: [acme] })

    const { body } = await visit(server, '/regulators/home')

    expect(getByTestId(body, 'regulator-username').textContent?.trim()).toBe(
      'jane.doe'
    )
  })

  it('shows every organisation to a regulator who has not searched yet', async ({
    server,
    msw
  }) => {
    const requested = backendReturns(msw, { items: [acme, brightWaste] })

    const { statusCode, body } = await visit(server, '/regulators/home')

    expect(statusCode).toBe(statusCodes.ok)
    expect(requested().searchParams.has('search')).toBe(false)
    expect(requested().searchParams.get('page')).toBe('1')
    expect(resultRows(body)).toHaveLength(2)
  })

  it('searches by asking, so a read-only session may use the form', async ({
    server,
    msw
  }) => {
    backendReturns(msw, { items: [acme] })

    const { body } = await visit(server, '/regulators/home')
    const searchBox = getByLabelText(body, 'Search by organisation name')

    expect(searchBox.closest('form')?.getAttribute('method')).toBe('get')
    expect(searchBox).toHaveProperty('name', 'search')
  })

  it('leaves the search term in the box to be narrowed again', async ({
    server,
    msw
  }) => {
    backendReturns(msw, { items: [acme] })

    const { body } = await visit(server, '/regulators/home?search=ACME')

    expect(getByLabelText(body, 'Search by organisation name')).toHaveProperty(
      'value',
      'ACME'
    )
  })

  it('heads the results with the columns the regulator reads', async ({
    server,
    msw
  }) => {
    backendReturns(msw, { items: [acme] })

    const { body } = await visit(server, '/regulators/home')

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

    const { body } = await visit(server, '/regulators/home?search=ACME')

    expect(requested().searchParams.get('search')).toBe('ACME')
    expect(resultRows(body)).toStrictEqual([
      ['ACME ltd', '50002', 'EA', 'approved']
    ])
  })

  it('opens the organisation from its name', async ({ server, msw }) => {
    backendReturns(msw, { items: [acme] })

    const { body } = await visit(server, '/regulators/home')

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

    const { body } = await visit(server, '/regulators/home?search=nothing')

    expect(queryByText(body, 'No organisation was found.')).not.toBeNull()
    expect(queryByRole(body, 'table')).toBeNull()
  })

  it('pages through the results, carrying the search with it', async ({
    server,
    msw
  }) => {
    backendReturns(msw, { items: [acme], page: 2, totalPages: 3 })

    const { body } = await visit(server, '/regulators/home?search=ACME&page=2')

    const pagination = getByRole(body, 'navigation', { name: 'Pagination' })

    expect(
      getAllByRole(pagination, 'link').map((link) => link.getAttribute('href'))
    ).toStrictEqual([
      '/regulators/home?search=ACME&page=1',
      '/regulators/home?search=ACME&page=3'
    ])
  })

  // Whether a page number beyond the results comes back clamped or spent is
  // the backend's choice, and it can change it without touching this repo.
  // Both are covered because the regulator must land the same way either way.
  const overshoots = [
    {
      backend: 'spends the page and returns nothing',
      results: { items: [], page: 2, totalPages: 1 }
    },
    {
      backend: 'clamps the page and returns the first',
      results: { items: [acme], page: 1, totalPages: 1 }
    }
  ]

  it.for(overshoots)(
    'sends a regulator past the last page back to it, when the backend $backend',
    async ({ results }, { server, msw }) => {
      backendReturns(msw, results)

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/regulators/home?search=ACME&page=2',
        auth: regulatorAuth
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/regulators/home?search=ACME&page=1')
    }
  )

  it('lands that regulator on the results rather than the empty state', async ({
    server,
    msw
  }) => {
    backendReturns(msw, { items: [acme], page: 1, totalPages: 1 })

    const { body } = await visit(server, '/regulators/home?search=ACME&page=1')

    expect(resultRows(body)).toStrictEqual([
      ['ACME ltd', '50002', 'EA', 'approved']
    ])
    expect(queryByText(body, 'No organisation was found.')).toBeNull()
  })

  it('still says nothing was found when the search itself matches none', async ({
    server,
    msw
  }) => {
    backendReturns(msw, { items: [], page: 1, totalPages: 0 })

    const { statusCode, body } = await visit(
      server,
      '/regulators/home?search=nothing'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(queryByText(body, 'No organisation was found.')).not.toBeNull()
  })

  it('offers no paging when every result fits on one page', async ({
    server,
    msw
  }) => {
    backendReturns(msw, { items: [acme] })

    const { body } = await visit(server, '/regulators/home')

    expect(queryByRole(body, 'navigation', { name: 'Pagination' })).toBeNull()
  })

  it('refuses a signed in user who holds no search scope with a 403', async ({
    server
  }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/regulators/home',
      auth: buildMockAuth({
        provider: OIDC_ENTRA_ID,
        profile: { id: 'entra-user-2', email: 'no.role@example.com' },
        role: REGULATOR_ROLE,
        scope: [SCOPES.regulator]
      })
    })

    expect(statusCode).toBe(statusCodes.forbidden)
  })

  it('refuses an authenticated user holding no role at all with a 403', async ({
    server
  }) => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/regulators/home',
      auth: buildMockAuth({
        provider: OIDC_ENTRA_ID,
        profile: { id: 'entra-user-3', email: 'no.role@example.com' }
      })
    })

    expect(statusCode).toBe(statusCodes.forbidden)
    expect(headers.location).toBeUndefined()
  })

  it('redirects an unauthenticated request to sign in', async ({ server }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/regulators/home'
    })

    expect(statusCode).toBe(statusCodes.found)
  })
})
