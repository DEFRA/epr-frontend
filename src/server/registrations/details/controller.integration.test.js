/** @import { HapiServer } from '#server/common/hapi-types.js'; */
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { it } from '#vite/fixtures/server.js'
import {
  getAllByRole,
  getByRole,
  queryByRole,
  queryByText,
  within
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

/**
 * @import { DOMWindow } from 'jsdom'
 * @import { SetupServer } from 'msw/node'
 */

const backendUrl = config.get('eprBackendUrl')

const registrationNumber = 'R26ER5001180041PL'
const path = `/organisations/500118/registrations/${registrationNumber}`

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/** @type {Record<string, unknown>} */
const registration = {
  status: {
    current: 'approved',
    timeline: [{ status: 'approved', at: '2026-01-01T00:00:00.000Z' }]
  },
  validFrom: '2026-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  wasteProcessingType: 'reprocessor',
  reprocessingType: 'input',
  site: {
    address: { line1: 'Unit 4 Mill Road', town: 'Leeds', postcode: 'LS10 1AB' }
  },
  accreditations: {}
}

/** @type {Record<string, unknown>} */
const exporterRegistration = {
  status: {
    current: 'approved',
    timeline: [{ status: 'approved', at: '2026-01-01T00:00:00.000Z' }]
  },
  validFrom: '2026-01-01',
  material: 'plastic',
  submittedToRegulator: { code: 'ea' },
  wasteProcessingType: 'exporter',
  accreditations: {}
}

const accreditation = {
  accreditationNumber: 'A26ER5001180114PL',
  status: {
    current: 'approved',
    timeline: [{ status: 'approved', at: '2026-07-01T09:00:00.000Z' }]
  }
}

/**
 * @param {SetupServer} msw
 * @param {{
 *   registration?: Record<string, unknown>,
 *   tradingName?: string
 * }} [overrides]
 */
const backendHolds = (msw, overrides = {}) =>
  msw.use(
    http.get(`${backendUrl}/organisations/500118`, () =>
      HttpResponse.json({
        organisationNumber: 500118,
        name: 'Kirkby Plastics Ltd',
        tradingName: overrides.tradingName,
        registrations: {
          [registrationNumber]: overrides.registration ?? registration
        }
      })
    )
  )

/**
 * @param {HapiServer} server
 * @param {string} [url]
 */
const visit = async (server, url = path) => {
  const response = await server.inject({ method: 'GET', url, auth: regulator })

  return {
    statusCode: response.statusCode,
    body: new JSDOM(asHtml(response.result)).window.document.body
  }
}

/**
 * @param {InstanceType<DOMWindow['HTMLElement']>} body
 * @param {string} caption
 * @returns {string[][]}
 */
const rowsOf = (body, caption) =>
  getAllByRole(getByRole(body, 'table', { name: caption }), 'row')
    .slice(1)
    .map((row) =>
      [...getAllByRole(row, 'rowheader'), ...getAllByRole(row, 'cell')].map(
        (cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim()
      )
    )

/**
 * @param {InstanceType<DOMWindow['HTMLElement']>} body
 * @param {string} key
 * @returns {string | undefined}
 */
const summaryValue = (body, key) =>
  queryByText(body, key)
    ?.parentElement?.querySelector('.govuk-summary-list__value')
    ?.textContent?.trim()

describe('the registration details page a regulator reads', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('names the organisation and the registration above the heading', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { statusCode, body } = await visit(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      getByRole(body, 'heading', { level: 1 }).textContent?.replace(/\s+/g, ' ')
    ).toContain('Kirkby Plastics Ltd - R26ER5001180041PL Registration details')
  })

  it('walks back to the organisation by number and to the organisation list', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server)
    const breadcrumbs = getByRole(body, 'navigation', { name: 'Breadcrumb' })

    expect(
      getAllByRole(breadcrumbs, 'listitem').map((item) =>
        (item.textContent ?? '').trim()
      )
    ).toStrictEqual([
      'All organisations',
      'Kirkby Plastics Ltd',
      'Registration details'
    ])
    expect(
      getByRole(breadcrumbs, 'link', {
        name: 'Kirkby Plastics Ltd'
      }).getAttribute('href')
    ).toBe('/organisations/500118')
    expect(
      getByRole(breadcrumbs, 'link', {
        name: 'All organisations'
      }).getAttribute('href')
    ).toBe('/regulators/home')
  })

  it('shows what a reprocessor registration covers', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server)

    expect(summaryValue(body, 'Status')).toBe('Approved')
    expect(summaryValue(body, 'Processing type')).toBe('Reprocessor (input)')
    expect(summaryValue(body, 'Material')).toBe('Plastic')
    expect(summaryValue(body, 'Site')).toBe('Unit 4 Mill Road, Leeds, LS10 1AB')
    expect(queryByText(body, 'Overseas reprocessing site')).toBeNull()
  })

  it('shows the site a reprocessor holds as a written-out address', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: {
        ...registration,
        site: { address: { fullAddress: 'North Road, Leeds LS1 1AA' } }
      }
    })

    const { body } = await visit(server)

    expect(summaryValue(body, 'Site')).toBe('North Road, Leeds LS1 1AA')
  })

  it('shows an exporter no site, and opens the overseas sites it sends to', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { registration: exporterRegistration })

    const { body } = await visit(server)

    expect(queryByText(body, 'Site')).toBeNull()
    expect(summaryValue(body, 'Processing type')).toBe('Exporter')
    expect(
      getByRole(body, 'link', {
        name: /^View\s*Overseas reprocessing site$/
      }).getAttribute('href')
    ).toBe(`${path}/overseas-sites`)
  })

  it('lists one accredited period per year, newest first, each opening its year', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: {
        ...registration,
        validFrom: '2025-01-01',
        accreditations: {
          2025: {
            accreditationNumber: 'A25ER5001180097PL',
            status: {
              current: 'cancelled',
              timeline: [
                { status: 'approved', at: '2025-02-15T09:00:00.000Z' },
                { status: 'cancelled', at: '2025-03-31T09:00:00.000Z' }
              ]
            }
          },
          2026: {
            ...accreditation,
            status: {
              current: 'approved',
              timeline: [{ status: 'approved', at: '2025-12-15T09:00:00.000Z' }]
            }
          }
        }
      }
    })

    const { body } = await visit(server)

    expect(rowsOf(body, 'Accredited periods')).toStrictEqual([
      [
        'A26ER5001180114PL',
        '1 January to 31 December 2026',
        'Approved',
        'View A26ER5001180114PL'
      ],
      [
        'A25ER5001180097PL',
        '15 February to 31 March 2025',
        'Cancelled',
        'View A25ER5001180097PL'
      ]
    ])
    expect(
      getByRole(body, 'link', {
        name: /^View\s*A25ER5001180097PL$/
      }).getAttribute('href')
    ).toBe(`${path}/accreditations/2025`)
  })

  it('shows the empty state for a registration holding no accreditation', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server)

    expect(
      getByRole(body, 'heading', { name: 'Accredited periods', level: 2 })
    ).not.toBeNull()
    expect(
      queryByText(body, 'This registration holds no accreditation.')
    ).not.toBeNull()
  })

  it('lists a registered-only year per year the registration has run', async ({
    server,
    msw
  }) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T00:00:00Z'))

    try {
      backendHolds(msw, {
        registration: {
          ...registration,
          status: {
            current: 'approved',
            timeline: [{ status: 'approved', at: '2025-03-01T00:00:00.000Z' }]
          }
        }
      })

      const { body } = await visit(server)

      expect(rowsOf(body, 'Registered-only')).toStrictEqual([
        ['2026', 'View reg-only period 2026'],
        ['2025', 'View reg-only period 2025']
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('names the organisation by its trading name where it holds one', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { tradingName: 'Kirkby Recycling' })

    const { body } = await visit(server)

    expect(getByRole(body, 'heading', { level: 1 }).textContent).toContain(
      'Kirkby Recycling'
    )
  })

  // The registration has no end date, so the years it offers run to the current
  // one. The clock is pinned so the whole set can be compared.
  it('offers the accreditation and the registered-only year by number, and nothing else', async ({
    server,
    msw
  }) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T00:00:00Z'))

    try {
      backendHolds(msw, {
        registration: {
          ...registration,
          accreditations: { 2026: accreditation }
        }
      })

      const { body } = await visit(server)

      const offered = [...body.querySelectorAll('#main-content a[href]')].map(
        (link) => link.getAttribute('href')
      )

      expect(offered).toStrictEqual([
        `${path}/accreditations/2026`,
        `${path}/registered-only-periods/2026`
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps Welsh links in Welsh', async ({ server, msw }) => {
    backendHolds(msw, {
      registration: { ...registration, accreditations: { 2026: accreditation } }
    })

    const { body } = await visit(server, `/cy${path}`)

    expect(
      body
        .querySelector('[data-testid="accredited-periods-table"] a')
        ?.getAttribute('href')
    ).toBe(`/cy${path}/accreditations/2026`)
  })

  it('offers a regulator no control that changes the registration', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server)

    expect(queryByRole(body, 'button')).toBeNull()
    expect(queryByText(body, 'Upload your summary log')).toBeNull()
    expect(within(body).queryByText(/Create new PRN|Manage PRNs/)).toBeNull()
  })

  it('is not found for an organisation number the backend does not know', async ({
    server,
    msw
  }) => {
    msw.use(
      http.get(
        `${backendUrl}/organisations/500999`,
        () => new HttpResponse(null, { status: statusCodes.notFound })
      )
    )

    const { statusCode } = await visit(
      server,
      `/organisations/500999/registrations/${registrationNumber}`
    )

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('is not found for a registration number the organisation does not hold', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { statusCode } = await visit(
      server,
      '/organisations/500118/registrations/R99XX'
    )

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
