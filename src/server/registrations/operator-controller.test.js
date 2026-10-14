import { config } from '#config/config.js'
import { SCOPES } from '#server/auth/scopes.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, queryByRole, queryByTestId } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect } from 'vitest'

/**
 * @import { DOMWindow } from 'jsdom'
 * @import { SetupServer } from 'msw/node'
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

const backendUrl = config.get('eprBackendUrl')

const thisYear = new Date().getFullYear()
const year = String(thisYear)

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = '6507f1f77bcf86cd79943902'
const accreditationId = '6507f1f77bcf86cd79943903'
const registrationNumber = 'R26ER5001180041GL'
const accreditationNumber = 'A26ER5001180114GL'

const registrationPath = `/organisations/500118/registrations/${registrationNumber}`
const accreditationPath = `${registrationPath}/accreditations/${year}`

/** @type {Record<string, unknown>} */
const reprocessor = {
  status: 'approved',
  validFrom: `${year}-01-01`,
  material: 'glass_re_melt',
  submittedToRegulator: { code: 'ea' },
  wasteProcessingType: 'reprocessor',
  reprocessingType: 'input',
  site: {
    address: { line1: 'Unit 4 Mill Road', town: 'Leeds', postcode: 'LS1 1AA' }
  },
  accreditations: {
    [year]: {
      accreditationNumber,
      status: 'approved',
      statusTimeline: { [`${year}-01-01`]: { status: 'approved' } }
    }
  }
}

/**
 * @param {Record<string, unknown>} registration
 */
const organisationView = (registration) => ({
  organisationNumber: 500118,
  name: 'Acme Recycling Ltd',
  registrations: { [registrationNumber]: registration }
})

const organisation = {
  id: organisationId,
  orgId: 500118,
  registrations: [
    {
      id: registrationId,
      registrationNumber,
      accreditationId,
      material: 'glass',
      wasteProcessingType: 'reprocessor'
    }
  ],
  accreditations: [
    { id: accreditationId, accreditationNumber, validFrom: `${year}-01-01` }
  ]
}

const operator = buildMockAuth({ linkedOrganisationId: organisationId })

/**
 * @param {SetupServer} msw
 * @param {{
 *   registration?: Record<string, unknown>,
 *   balances?: () => Response,
 *   ids?: () => Response,
 *   eligibility?: Record<string, unknown>
 * }} [answers]
 */
const backendHolds = (
  msw,
  {
    registration = reprocessor,
    balances = () =>
      HttpResponse.json({
        [accreditationNumber]: { amount: 1500, availableAmount: 1234.5 }
      }),
    ids = () => HttpResponse.json(organisation),
    eligibility = { mode: 'pool', windowOpen: false }
  } = {}
) =>
  msw.use(
    http.get(`${backendUrl}/organisations/500118`, () =>
      HttpResponse.json(organisationView(registration))
    ),
    http.get(
      `${backendUrl}/organisations/500118/waste-balances/${year}`,
      balances
    ),
    http.get(`${backendUrl}/v1/organisations/${organisationId}`, ids),
    http.get(
      `${backendUrl}/v1/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/december-prn-eligibility`,
      () => HttpResponse.json(eligibility)
    )
  )

/**
 * @param {HapiServer} server
 * @param {{ url?: string, auth?: ReturnType<typeof buildMockAuth> }} [options]
 */
const visit = async (
  server,
  { url = accreditationPath, auth = operator } = {}
) => {
  const response = await server.inject({ method: 'GET', url, auth })

  return {
    statusCode: response.statusCode,
    body: new JSDOM(asHtml(response.result)).window.document.body
  }
}

/**
 * @param {InstanceType<DOMWindow['HTMLElement']>} body
 * @param {string | RegExp} name
 */
const hrefOf = (body, name) =>
  getByRole(body, 'link', { name }).getAttribute('href')

describe("the operator's registration page for a year", () => {
  const configuredWindow = config.get('reapplyAccreditation')

  beforeEach(() => {
    config.set('reapplyAccreditation.windowStart', '01-01T00:00')
    config.set('reapplyAccreditation.windowEnd', '12-31T23:59')
    config.set('reapplyAccreditation.baseUrl', 'https://ws2.example')
  })

  afterEach(() => {
    config.set('reapplyAccreditation.windowStart', configuredWindow.windowStart)
    config.set('reapplyAccreditation.windowEnd', configuredWindow.windowEnd)
    config.set('reapplyAccreditation.baseUrl', configuredWindow.baseUrl)
  })

  it("shows the year's accreditation, its balance and the site and material", async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { statusCode, body } = await visit(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(getByRole(body, 'heading', { level: 1 }).textContent).toContain(
      'Glass remelt'
    )
    expect(body.textContent).toContain('Unit 4 Mill Road')
    expect(body.textContent).toContain(registrationNumber)
    expect(body.textContent).toContain(accreditationNumber)
    expect(queryByTestId(body, 'waste-balance-amount')?.textContent).toContain(
      '1,234.50'
    )
  })

  it('names an unknown site where the address has no first line', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: {
        ...reprocessor,
        site: { address: { fullAddress: 'North Road, Leeds' } }
      }
    })

    const { body } = await visit(server)

    expect(body.textContent).toContain('Unknown site')
  })

  it('names every link by number', async ({ server, msw }) => {
    backendHolds(msw)

    const { body } = await visit(server)

    expect(body.querySelector('.govuk-back-link')?.getAttribute('href')).toBe(
      '/organisations/500118'
    )
    expect(hrefOf(body, 'Upload your summary log')).toBe(
      `${registrationPath}/summary-logs/upload`
    )
    expect(hrefOf(body, 'Manage reports')).toBe(`${registrationPath}/reports`)
    expect(hrefOf(body, 'Create new PRN')).toBe(
      `${accreditationPath}/packaging-recycling-notes/create`
    )
    expect(hrefOf(body, 'Manage PRNs')).toBe(
      `${accreditationPath}/packaging-recycling-notes`
    )
  })

  it("sends an exporter back to the organisation's exporting tab", async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: { ...reprocessor, wasteProcessingType: 'exporter' }
    })

    const { body } = await visit(server)

    expect(body.querySelector('.govuk-back-link')?.getAttribute('href')).toBe(
      '/organisations/500118/exporting'
    )
    expect(hrefOf(body, 'Create new PERN')).toBe(
      `${accreditationPath}/packaging-recycling-notes/create`
    )
  })

  it('links the ledger by number for a session that may read it', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server, {
      auth: buildMockAuth({
        linkedOrganisationId: organisationId,
        scope: [SCOPES.organisationLinkedWrite, SCOPES.wasteBalanceLedgerRead]
      })
    })

    expect(hrefOf(body, 'View waste balance ledger')).toBe(
      `${accreditationPath}/waste-balance-ledger`
    )
  })

  it('offers a session holding no write scope only the lists', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server, {
      auth: buildMockAuth({ linkedOrganisationId: organisationId, scope: [] })
    })

    expect(hrefOf(body, 'View PRNs')).toBe(
      `${accreditationPath}/packaging-recycling-notes`
    )
    expect(hrefOf(body, 'View reports')).toBe(`${registrationPath}/reports`)
    expect(queryByRole(body, 'link', { name: 'Create new PRN' })).toBeNull()
  })

  it('offers no ledger link to a session that may not read it', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server)

    expect(
      queryByRole(body, 'link', { name: 'View waste balance ledger' })
    ).toBeNull()
  })

  it('renders without a balance where the balance could not be read', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      balances: () =>
        new HttpResponse(null, { status: statusCodes.internalServerError })
    })

    const { statusCode, body } = await visit(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(body.textContent).not.toContain('1,234.50')
  })

  it('splits the balance into its December portions while the pool is open', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { eligibility: { mode: 'pool', windowOpen: true } })

    const { body } = await visit(server)

    expect(queryByTestId(body, 'waste-balance-amount')).toBeNull()
  })

  it('shows no accreditation, balance or notes once the accreditation is cancelled, but still offers the reapply link', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: {
        ...reprocessor,
        accreditations: {
          [year]: {
            accreditationNumber,
            status: 'cancelled',
            statusTimeline: {
              [`${year}-01-01`]: { status: 'approved' },
              [`${year}-03-01`]: { status: 'cancelled' }
            }
          }
        }
      }
    })

    const { statusCode, body } = await visit(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(body.textContent).not.toContain(accreditationNumber)
    expect(queryByTestId(body, 'waste-balance-amount')).toBeNull()
    expect(queryByRole(body, 'link', { name: 'Create new PRN' })).toBeNull()
    expect(
      queryByRole(body, 'link', {
        name: `apply for ${thisYear + 1} accreditation`
      })
    ).not.toBeNull()
  })

  it('links the reapply to the next year with the ids and the applied-for material', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server)

    expect(hrefOf(body, `apply for ${thisYear + 1} accreditation`)).toBe(
      `https://ws2.example/operator-accreditation/${organisationId}/${registrationId}/glass/${thisYear + 1}`
    )
  })

  it('is not found for an organisation number the backend does not know', async ({
    server,
    msw
  }) => {
    backendHolds(msw)
    msw.use(
      http.get(
        `${backendUrl}/organisations/500999`,
        () => new HttpResponse(null, { status: statusCodes.notFound })
      )
    )

    const { statusCode } = await visit(server, {
      url: `/organisations/500999/registrations/${registrationNumber}/accreditations/${year}`
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('is not found for a registration number the organisation does not hold', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { statusCode } = await visit(server, {
      url: `/organisations/500118/registrations/R99XX/accreditations/${year}`
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('is not found for a year the registration holds no accreditation for', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { statusCode } = await visit(server, {
      url: `${registrationPath}/accreditations/${thisYear - 1}`
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('fails where the ids could not be looked up', async ({ server, msw }) => {
    backendHolds(msw, {
      ids: () =>
        new HttpResponse(null, { status: statusCodes.internalServerError })
    })

    const { statusCode } = await visit(server)

    expect(statusCode).toBe(statusCodes.internalServerError)
  })

  it('is not found where the numbers resolve to no ids', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      ids: () => HttpResponse.json({ ...organisation, registrations: [] })
    })

    const { statusCode } = await visit(server)

    expect(statusCode).toBe(statusCodes.notFound)
  })
})

describe("the operator's registration page with no year", () => {
  /** @type {Record<string, unknown>} */
  const registeredOnly = { ...reprocessor, accreditations: {} }

  it('sends an accredited operator to the latest year', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: {
        ...reprocessor,
        accreditations: {
          [thisYear - 1]: {
            accreditationNumber: 'A25ER5001180114GL',
            status: 'approved',
            statusTimeline: {
              [`${thisYear - 1}-01-01`]: { status: 'approved' }
            }
          },
          .../** @type {object} */ (reprocessor.accreditations)
        }
      }
    })

    const response = await server.inject({
      method: 'GET',
      url: registrationPath,
      auth: operator
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe(accreditationPath)
  })

  it('keeps a Welsh reader in Welsh', async ({ server, msw }) => {
    backendHolds(msw)

    const response = await server.inject({
      method: 'GET',
      url: `/cy${registrationPath}`,
      auth: operator
    })

    expect(response.headers.location).toBe(`/cy${accreditationPath}`)
  })

  it('keeps the query string', async ({ server, msw }) => {
    backendHolds(msw)

    const response = await server.inject({
      method: 'GET',
      url: `${registrationPath}?from=dashboard`,
      auth: operator
    })

    expect(response.headers.location).toBe(
      `${accreditationPath}?from=dashboard`
    )
  })

  it('sends an operator whose accreditation is cancelled to its year', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: {
        ...reprocessor,
        accreditations: {
          [year]: {
            accreditationNumber,
            status: 'cancelled',
            statusTimeline: {
              [`${year}-01-01`]: { status: 'approved' },
              [`${year}-03-01`]: { status: 'cancelled' }
            }
          }
        }
      }
    })

    const response = await server.inject({
      method: 'GET',
      url: registrationPath,
      auth: operator
    })

    expect(response.headers.location).toBe(accreditationPath)
  })

  it('shows a registered-only operator their registration, with no accreditation, balance or notes', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { registration: registeredOnly })

    const { statusCode, body } = await visit(server, { url: registrationPath })

    expect(statusCode).toBe(statusCodes.ok)
    expect(getByRole(body, 'heading', { level: 1 }).textContent).toContain(
      'Glass remelt'
    )
    expect(body.textContent).toContain(registrationNumber)
    expect(body.textContent).not.toContain(accreditationNumber)
    expect(queryByTestId(body, 'waste-balance-amount')).toBeNull()
    expect(queryByRole(body, 'link', { name: 'Create new PRN' })).toBeNull()
  })

  it('names every link by number', async ({ server, msw }) => {
    backendHolds(msw, { registration: registeredOnly })

    const { body } = await visit(server, {
      url: registrationPath,
      auth: buildMockAuth({
        linkedOrganisationId: organisationId,
        scope: [SCOPES.organisationLinkedWrite, SCOPES.wasteBalanceLedgerRead]
      })
    })

    expect(body.querySelector('.govuk-back-link')?.getAttribute('href')).toBe(
      '/organisations/500118'
    )
    expect(hrefOf(body, 'Upload your summary log')).toBe(
      `${registrationPath}/summary-logs/upload`
    )
    expect(hrefOf(body, 'Manage reports')).toBe(`${registrationPath}/reports`)
    expect(hrefOf(body, 'View waste balance ledger')).toBe(
      `${registrationPath}/waste-balance-ledger`
    )
  })

  it('offers no ledger link to a session that may not read it', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { registration: registeredOnly })

    const { body } = await visit(server, { url: registrationPath })

    expect(
      queryByRole(body, 'link', { name: 'View waste balance ledger' })
    ).toBeNull()
  })

  it('offers a registered-only operator no reapply link', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { registration: registeredOnly })

    const { body } = await visit(server, { url: registrationPath })

    expect(
      queryByRole(body, 'link', {
        name: `apply for ${thisYear + 1} accreditation`
      })
    ).toBeNull()
  })

  it('reads no ids, balance or December eligibility for a registered-only operator', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: registeredOnly,
      ids: () =>
        new HttpResponse(null, { status: statusCodes.internalServerError }),
      balances: () =>
        new HttpResponse(null, { status: statusCodes.internalServerError })
    })

    const { statusCode } = await visit(server, { url: registrationPath })

    expect(statusCode).toBe(statusCodes.ok)
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

    const { statusCode } = await visit(server, {
      url: `/organisations/500999/registrations/${registrationNumber}`
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('is not found for a registration number the organisation does not hold', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { statusCode } = await visit(server, {
      url: '/organisations/500118/registrations/R99XX'
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
