/** @import { HapiServer } from '#server/common/hapi-types.js'; */
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { SCOPES } from '#server/auth/scopes.js'
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
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * @import { DOMWindow } from 'jsdom'
 * @import { SetupServerApi } from 'msw/node'
 * @import { AccreditationResource, RegistrationResource } from './helpers/types.js'
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

const regulatorWithoutLedgerScope = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity({
    role: IDENTITIES.regulator.role,
    scopes: IDENTITIES.regulator.scopes.filter(
      (scope) => scope !== SCOPES.wasteBalanceLedgerRead
    )
  })
})

const organisation = {
  id: organisationId,
  orgId: 500118,
  companyDetails: { name: 'Kirkby Plastics Ltd' },
  status: 'approved',
  registrations: [],
  accreditations: []
}

/**
 * The organisation record carries the accreditation the registration is on, so
 * a fixture that varies the links varies this.
 * @param {AccreditationResource[]} accreditations
 * @param {string} [accreditationId]
 */
const organisationHolding = (accreditations, accreditationId) => ({
  ...organisation,
  registrations: [{ id: registrationId, accreditationId }],
  accreditations: accreditations.map(({ id, accreditationNumber, status }) => ({
    id,
    accreditationNumber,
    status
  }))
})

/** @type {RegistrationResource} */
const registration = {
  id: registrationId,
  organisationId,
  registrationNumber: 'R26ER5001180041PL',
  status: 'approved',
  reprocessingType: 'input',
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
 * @param {SetupServerApi} msw
 * @param {{
 *   registration?: RegistrationResource,
 *   accreditations?: AccreditationResource[],
 *   accreditationId?: string,
 *   organisation?: object
 * }} [overrides]
 */
const backendHolds = (msw, overrides = {}) => {
  const registrationUrl = `${backendUrl}/v1/organisations/${organisationId}/registrations/${registrationId}`
  const accreditations = overrides.accreditations ?? []
  const held =
    overrides.organisation ??
    organisationHolding(
      accreditations,
      overrides.accreditationId ?? accreditations[0]?.id
    )

  msw.use(
    http.get(`${backendUrl}/v1/organisations/${organisationId}`, () =>
      HttpResponse.json(held)
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
 * @param {object} [as]
 */
const visit = async (server, as = regulator) => {
  const response = await server.inject({
    method: 'GET',
    url: path,
    auth: as
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
        '1 July 2026 - Current',
        'Approved',
        'View accreditation A26ER5001180114PL'
      ],
      [
        'A26ER5001180097PL',
        '15 February 2026 - 31 March 2026',
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

  it('names the organisation by its trading name where it holds one', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      organisation: {
        ...organisationHolding([], undefined),
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

  it('offers the note list, the reports and the ledger of the accreditation the registration is on', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      accreditations: [anAccreditation({ id: 'acc-002' })],
      accreditationId: 'acc-002'
    })

    const { body } = await visit(server)

    expect(
      getByRole(body, 'link', { name: 'View PRNs' }).getAttribute('href')
    ).toBe(`${path}/accreditations/acc-002/packaging-recycling-notes`)
    expect(
      getByRole(body, 'link', { name: 'View reports' }).getAttribute('href')
    ).toBe(`${path}/reports`)
    expect(
      getByRole(body, 'link', {
        name: 'View waste balance ledger'
      }).getAttribute('href')
    ).toBe(`${path}/accreditations/acc-002/waste-balance-ledger`)
  })

  it('offers those four routes and nothing else', async ({ server, msw }) => {
    backendHolds(msw, { accreditations: [anAccreditation({ id: 'acc-002' })] })

    const { body } = await visit(server)

    const offered = [...body.querySelectorAll('#main-content a[href]')].map(
      (link) => (link.getAttribute('href') ?? '').replace(/acc-002/g, '{acc}')
    )

    expect(offered.sort()).toStrictEqual([
      `${path}/accreditations/{acc}`,
      `${path}/accreditations/{acc}/packaging-recycling-notes`,
      `${path}/accreditations/{acc}/waste-balance-ledger`,
      `${path}/reports`
    ])
  })

  it('follows the accreditation the registration is on rather than the most recent one', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      accreditations: [
        anAccreditation({
          id: 'acc-001',
          accreditationNumber: 'A26ER5001180097PL',
          dateRange: { validFrom: '2026-02-15', validTo: '2026-03-31' }
        }),
        anAccreditation({
          id: 'acc-002',
          dateRange: { validFrom: '2026-07-01', validTo: null }
        })
      ],
      accreditationId: 'acc-001'
    })

    const { body } = await visit(server)

    expect(
      getByRole(body, 'link', { name: 'View PRNs' }).getAttribute('href')
    ).toBe(`${path}/accreditations/acc-001/packaging-recycling-notes`)
    expect(
      getByRole(body, 'link', {
        name: 'View waste balance ledger'
      }).getAttribute('href')
    ).toBe(`${path}/accreditations/acc-001/waste-balance-ledger`)
  })

  it('names the note list for an exporter by what an exporter issues', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: {
        ...registration,
        application: {
          ...registration.application,
          wasteProcessingType: 'exporter',
          site: null
        }
      },
      accreditations: [anAccreditation({})]
    })

    const { body } = await visit(server)

    expect(getByRole(body, 'link', { name: 'View PERNs' })).not.toBeNull()
  })

  it('offers no note list where the accreditation is not live, and still points the ledger at it', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      accreditations: [anAccreditation({ id: 'acc-002', status: 'cancelled' })]
    })

    const { body } = await visit(server)

    expect(queryByRole(body, 'link', { name: 'View PRNs' })).toBeNull()
    expect(
      getByRole(body, 'link', {
        name: 'View waste balance ledger'
      }).getAttribute('href')
    ).toBe(`${path}/accreditations/acc-002/waste-balance-ledger`)
  })

  it('points the ledger at the registration where it is on no accreditation', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server)

    expect(queryByRole(body, 'link', { name: 'View PRNs' })).toBeNull()
    expect(
      getByRole(body, 'link', {
        name: 'View waste balance ledger'
      }).getAttribute('href')
    ).toBe(`${path}/waste-balance-ledger`)
  })

  // The backend grants every regulator the ledger scope, so this stands up a
  // session that cannot occur to prove the gate holds. Without it, deleting
  // the scope check would leave the suite green.
  it('offers no ledger to a session the backend grants no ledger scope', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { accreditations: [anAccreditation({})] })

    const { body } = await visit(server, regulatorWithoutLedgerScope)

    expect(
      queryByRole(body, 'link', { name: 'View waste balance ledger' })
    ).toBeNull()
    expect(getByRole(body, 'link', { name: 'View PRNs' })).not.toBeNull()
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
