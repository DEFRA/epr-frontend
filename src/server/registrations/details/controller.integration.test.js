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
 * @import { SetupServerApi } from 'msw/node'
 * @import { AccreditationResource } from './helpers/types.js'
 * @import { RegistrationResource } from '#server/common/helpers/organisations/registration-resource.js'
 */

const backendUrl = config.get('eprBackendUrl')

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001-plastic-approved'
const path = `/organisations/${organisationId}/registrations/${registrationId}`

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/**
 * The page names the organisation and asks it nothing else, so this holds no
 * registrations and no accreditations. A page that still read the stored
 * document for either would fail against it rather than quietly pass.
 */
const organisation = {
  id: organisationId,
  orgId: 500118,
  companyDetails: { name: 'Kirkby Plastics Ltd' },
  status: 'approved'
}

/** @type {RegistrationResource} */
const registration = {
  id: registrationId,
  organisation: { id: organisationId },
  registrationNumber: 'R26ER5001180041PL',
  status: 'approved',
  material: 'plastic',
  reprocessingType: 'input',
  dateRange: { validFrom: '2026-01-01', validTo: null },
  accreditations: [],
  application: {
    orgName: 'Kirkby Plastics',
    submittedToRegulator: 'ea',
    material: 'plastic',
    wasteProcessingType: 'reprocessor',
    site: {
      address: {
        line1: 'Unit 4 Mill Road',
        town: 'Leeds',
        postcode: 'LS10 1AB'
      }
    }
  }
}

/**
 * @param {Partial<AccreditationResource>} overrides
 * @returns {AccreditationResource}
 */
const anAccreditation = (overrides) => ({
  id: 'acc-001',
  accreditationNumber: 'A26ER5001180114PL',
  status: 'approved',
  reprocessingType: 'input',
  dateRange: { validFrom: '2026-07-01', validTo: null },
  application: {
    orgName: 'Kirkby Plastics',
    submittedToRegulator: 'ea',
    material: 'plastic',
    wasteProcessingType: 'reprocessor'
  },
  ...overrides
})

/**
 * The registration names the accreditation it is on as a link summary, which
 * is what the page follows. The sub-resource lists them in full, and the two
 * are separate fixtures so a test can make them disagree.
 * @param {AccreditationResource} accreditation
 * @returns {RegistrationResource}
 */
const registrationLinking = ({ id, accreditationNumber, status }) => ({
  ...registration,
  accreditations: [{ id, accreditationNumber, status }]
})

/**
 * @param {SetupServerApi} msw
 * @param {{
 *   registration?: RegistrationResource,
 *   accreditations?: AccreditationResource[],
 *   organisation?: object
 * }} [overrides]
 */
const backendHolds = (msw, overrides = {}) => {
  const registrationUrl = `${backendUrl}/v1/organisations/${organisationId}/registrations/${registrationId}`
  const accreditations = overrides.accreditations ?? []

  msw.use(
    http.get(`${backendUrl}/v1/organisations/${organisationId}`, () =>
      HttpResponse.json(overrides.organisation ?? organisation)
    ),
    http.get(registrationUrl, () =>
      HttpResponse.json(overrides.registration ?? registration)
    ),
    http.get(`${registrationUrl}/accreditations`, () =>
      HttpResponse.json({ accreditations })
    )
  )
}

/**
 * @param {HapiServer} server
 */
const visit = async (server) => {
  const response = await server.inject({
    method: 'GET',
    url: path,
    auth: regulator
  })

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

  it('walks back to the organisation and to the organisation list', async ({
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
    ).toBe(`/organisations/${organisationId}`)
    expect(
      getByRole(breadcrumbs, 'link', {
        name: 'All organisations'
      }).getAttribute('href')
    ).toBe('/regulators/home')
  })

  it('shows what the registration covers', async ({ server, msw }) => {
    backendHolds(msw)

    const { body } = await visit(server)

    expect(summaryValue(body, 'Status')).toBe('Approved')
    expect(summaryValue(body, 'Processing type')).toBe('Reprocessor (input)')
    expect(summaryValue(body, 'Material')).toBe('Plastic')
    expect(summaryValue(body, 'Site')).toBe('Unit 4 Mill Road, Leeds, LS10 1AB')
  })

  it('shows no site for a registration that names none', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: {
        ...registration,
        reprocessingType: null,
        application: {
          ...registration.application,
          wasteProcessingType: 'exporter',
          site: null
        }
      }
    })

    const { body } = await visit(server)

    expect(queryByText(body, 'Site')).toBeNull()
    expect(summaryValue(body, 'Processing type')).toBe('Exporter')
  })

  it('lists the accredited periods, most recent first', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      accreditations: [
        anAccreditation({
          id: 'acc-001',
          accreditationNumber: 'A26ER5001180097PL',
          status: 'cancelled',
          dateRange: { validFrom: '2026-02-15', validTo: '2026-03-31' }
        }),
        anAccreditation({
          id: 'acc-002',
          accreditationNumber: 'A26ER5001180114PL',
          status: 'approved',
          dateRange: { validFrom: '2026-07-01', validTo: null }
        })
      ]
    })

    const { body } = await visit(server)

    expect(rowsOf(body, 'Accredited periods')).toStrictEqual([
      [
        'A26ER5001180114PL',
        '1 July 2026 to Current',
        'Approved',
        'View accreditation A26ER5001180114PL'
      ],
      [
        'A26ER5001180097PL',
        '15 February to 31 March 2026',
        'Cancelled',
        'View accreditation A26ER5001180097PL'
      ]
    ])
  })

  it('names the accredited periods section whether or not it lists any', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { accreditations: [anAccreditation({})] })
    const withPeriods = await visit(server)

    backendHolds(msw, { accreditations: [] })
    const withNone = await visit(server)

    for (const { body } of [withPeriods, withNone]) {
      expect(
        getByRole(body, 'heading', { name: 'Accredited periods', level: 2 })
      ).not.toBeNull()
    }
  })

  it('opens each accredited period at its own address', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { accreditations: [anAccreditation({ id: 'acc-002' })] })

    const { body } = await visit(server)

    expect(
      getByRole(body, 'link', {
        name: /^View accreditation\s*A26ER5001180114PL$/
      }).getAttribute('href')
    ).toBe(`${path}/accreditations/acc-002`)
  })

  it('shows the empty state where the only application never became an accreditation', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      accreditations: [
        anAccreditation({
          id: 'acc-003',
          accreditationNumber: null,
          status: 'rejected',
          dateRange: { validFrom: null, validTo: null }
        })
      ]
    })

    const { body } = await visit(server)

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
          dateRange: { validFrom: '2025-03-01', validTo: null }
        }
      })

      const { body } = await visit(server)

      expect(
        getByRole(body, 'heading', { name: 'Registered-only', level: 2 })
      ).not.toBeNull()

      expect(rowsOf(body, 'Registered-only')).toStrictEqual([
        ['2026', 'View reg-only period 2026'],
        ['2025', 'View reg-only period 2025']
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('opens each registered-only year at its own address', async ({
    server,
    msw
  }) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T00:00:00Z'))

    try {
      backendHolds(msw, {
        registration: {
          ...registration,
          dateRange: { validFrom: '2026-01-01', validTo: null }
        }
      })

      const { body } = await visit(server)

      expect(
        getByRole(body, 'link', {
          name: /^View reg-only period\s*2026$/
        }).getAttribute('href')
      ).toBe(`${path}/registered-only-periods/2026`)
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows the registered-only empty state for a registration with no start date', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: {
        ...registration,
        dateRange: { validFrom: null, validTo: null }
      }
    })

    const { body } = await visit(server)

    expect(
      queryByText(body, 'This registration holds no registered-only period.')
    ).not.toBeNull()
  })

  // The accredited table is what a regulator already reads here, so the second
  // one has to sit after it rather than displace it.
  it('keeps the accredited periods above the registered-only ones', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { accreditations: [anAccreditation({})] })

    const { body } = await visit(server)

    const headings = [
      ...body.querySelectorAll('[data-testid="app-page-body"] h2')
    ].map((heading) => heading.textContent?.trim())

    expect(headings).toStrictEqual(['Accredited periods', 'Registered-only'])
  })

  it('names the organisation by its trading name where it holds one', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      organisation: {
        ...organisation,
        companyDetails: {
          name: 'Kirkby Plastics Ltd',
          tradingName: 'Kirkby Recycling'
        }
      }
    })

    const { body } = await visit(server)

    expect(getByRole(body, 'heading', { level: 1 }).textContent).toContain(
      'Kirkby Recycling'
    )
  })

  it('reads a registration that was never approved', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: {
        ...registration,
        registrationNumber: null,
        status: 'created',
        reprocessingType: null
      }
    })

    const { statusCode, body } = await visit(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(summaryValue(body, 'Status')).toBe('Created')
    expect(
      queryByText(body, 'This registration holds no accreditation.')
    ).not.toBeNull()
  })

  // The note list, the reports and the waste balance ledger are all reachable
  // by their own routes; the design offers none of them from here. The two it
  // does offer are an accreditation and a registered-only year.
  //
  // The registration has no end date, so the years it offers run to the current
  // one and would grow every January. The clock is pinned so the whole set can
  // be compared - which is what makes a route arriving here have to be
  // justified rather than pass unnoticed.
  it('offers the accreditation and the registered-only year, and nothing else', async ({
    server,
    msw
  }) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T00:00:00Z'))

    try {
      const accreditation = anAccreditation({ id: 'acc-002' })

      backendHolds(msw, {
        accreditations: [accreditation],
        registration: registrationLinking(accreditation)
      })

      const { body } = await visit(server)

      const offered = [...body.querySelectorAll('#main-content a[href]')].map(
        (link) => link.getAttribute('href')
      )

      expect(offered).toStrictEqual([
        `${path}/accreditations/acc-002`,
        `${path}/registered-only-periods/2026`
      ])
    } finally {
      vi.useRealTimers()
    }
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
})
