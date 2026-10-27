import { config } from '#config/config.js'
import { SCOPES } from '#server/auth/scopes.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { it } from '#vite/fixtures/server.js'
import {
  getByRole,
  getByText,
  queryByRole,
  queryByTestId,
  queryByText
} from '@testing-library/dom'
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
const registeredOnlyPath = `${registrationPath}/${year}`

/**
 * @param {number} fromYear
 */
const registeredSince = (fromYear) => ({
  current: 'approved',
  timeline: [{ status: 'approved', at: `${fromYear}-01-01T09:00:00.000Z` }]
})

/**
 * @param {string} current
 * @param {ReadonlyArray<string>} statuses
 * @param {number} [forYear]
 */
const accreditationWith = (current, statuses, forYear = thisYear) => ({
  accreditationNumber,
  status: {
    current,
    timeline: statuses.map((status, month) => ({
      status,
      at: `${forYear}-0${month + 1}-01T09:00:00.000Z`
    }))
  }
})

/** @type {Record<string, unknown>} */
const reprocessor = {
  status: registeredSince(thisYear),
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
      status: {
        current: 'approved',
        timeline: [{ status: 'approved', at: `${year}-01-01T09:00:00.000Z` }]
      }
    }
  }
}

/**
 * @param {Record<string, unknown>} registration
 */
const organisationView = (registration) => ({
  organisationNumber: '500118',
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
      `${backendUrl}${accreditationPath}/packaging-recycling-notes/december-prn-eligibility`,
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
  const { document } = new JSDOM(asHtml(response.result)).window

  return {
    statusCode: response.statusCode,
    body: document.body,
    title: document.title,
    location: response.headers.location
  }
}

/**
 * @param {InstanceType<DOMWindow['HTMLElement']>} body
 * @param {string | RegExp} name
 */
const hrefOf = (body, name) =>
  getByRole(body, 'link', { name }).getAttribute('href')

const configuredWindow = config.get('reapplyAccreditation')

const openTheReapplyWindow = () => {
  config.set('reapplyAccreditation.windowStart', '01-01T00:00')
  config.set('reapplyAccreditation.windowEnd', '12-31T23:59')
  config.set('reapplyAccreditation.baseUrl', 'https://ws2.example')
}

const restoreTheReapplyWindow = () => {
  config.set('reapplyAccreditation.windowStart', configuredWindow.windowStart)
  config.set('reapplyAccreditation.windowEnd', configuredWindow.windowEnd)
  config.set('reapplyAccreditation.baseUrl', configuredWindow.baseUrl)
}

describe("the operator's registration page for a year", () => {
  beforeEach(openTheReapplyWindow)

  afterEach(restoreTheReapplyWindow)

  it("shows the year's accreditation and the site and material", async ({
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
  })

  it('shows the year in the heading and page title', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body, title } = await visit(server)

    expect(getByRole(body, 'heading', { level: 1 }).textContent).toContain(year)
    expect(title).toContain(year)
  })

  it("shows the year's balance", async ({ server, msw }) => {
    backendHolds(msw)

    const { body } = await visit(server)

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
      `/organisations/500118/${year}`
    )
    expect(hrefOf(body, 'Upload your summary log')).toBe(
      `${registrationPath}/summary-logs/upload`
    )
    expect(hrefOf(body, 'Manage reports')).toBe(
      `${registrationPath}/reports/${year}`
    )
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
      `/organisations/500118/${year}/exporting`
    )
    expect(hrefOf(body, 'Create new PERN')).toBe(
      `${accreditationPath}/packaging-recycling-notes/create`
    )
  })

  it('keeps a Welsh reader in Welsh on the way back', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { body } = await visit(server, { url: `/cy${accreditationPath}` })

    expect(body.querySelector('.govuk-back-link')?.getAttribute('href')).toBe(
      `/cy/organisations/500118/${year}`
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
    expect(hrefOf(body, 'View reports')).toBe(
      `${registrationPath}/reports/${year}`
    )
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
            status: {
              current: 'cancelled',
              timeline: [
                { status: 'approved', at: `${year}-01-01T09:00:00.000Z` },
                { status: 'cancelled', at: `${year}-03-01T09:00:00.000Z` }
              ]
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

  it.for([
    { name: 'a value that is not a year', segment: 'abcd' },
    { name: 'a year with five digits', segment: `0${thisYear}` },
    { name: 'a year with a decimal point', segment: `${thisYear}.0` },
    { name: 'a year with a plus sign', segment: `+${thisYear}` }
  ])(
    'is not found for $name, without asking the backend',
    async ({ segment }, { server, msw }) => {
      backendHolds(msw)
      /** @type {string[]} */
      const backendRequests = []
      msw.events.on('request:start', ({ request }) => {
        if (request.url.startsWith(backendUrl)) {
          backendRequests.push(request.url)
        }
      })

      const { statusCode } = await visit(server, {
        url: `${registrationPath}/accreditations/${segment}`
      })

      expect(statusCode).toBe(statusCodes.notFound)
      expect(backendRequests).toStrictEqual([])
    }
  )

  it('fails where the ids for the reapply link could not be looked up', async ({
    server,
    msw
  }) => {
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

/** @type {Record<string, unknown>} */
const registeredOnly = { ...reprocessor, accreditations: {} }

describe("the operator's registered-only page for a year", () => {
  beforeEach(openTheReapplyWindow)

  afterEach(restoreTheReapplyWindow)

  it('shows a registered-only operator their registration', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { registration: registeredOnly })

    const { statusCode, body } = await visit(server, {
      url: registeredOnlyPath
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      getByRole(body, 'heading', { level: 1, name: /Glass remelt/ })
    ).toBeDefined()
    expect(getByText(body, registrationNumber)).toBeDefined()
  })

  it('shows the year in the address in the heading and page title', async ({
    server,
    msw
  }) => {
    const lastYear = String(thisYear - 1)
    backendHolds(msw, {
      registration: { ...registeredOnly, status: registeredSince(thisYear - 1) }
    })

    const { body, title } = await visit(server, {
      url: `${registrationPath}/${lastYear}`
    })

    expect(getByRole(body, 'heading', { level: 1 }).textContent).toContain(
      lastYear
    )
    expect(title).toContain(lastYear)
  })

  it('sends the operator back to the organisation home for the year in the address, not the latest', async ({
    server,
    msw
  }) => {
    const lastYear = String(thisYear - 1)
    backendHolds(msw, {
      registration: { ...registeredOnly, status: registeredSince(thisYear - 1) }
    })

    const { body } = await visit(server, {
      url: `${registrationPath}/${lastYear}`
    })

    expect(body.querySelector('.govuk-back-link')?.getAttribute('href')).toBe(
      `/organisations/500118/${lastYear}`
    )
  })

  it.for(['created', 'rejected', 'cancelled'])(
    'shows the registered-only page for a year whose accreditation is %s',
    async (current, { server, msw }) => {
      backendHolds(msw, {
        registration: {
          ...reprocessor,
          accreditations: {
            [year]: accreditationWith(current, ['created', current])
          }
        }
      })

      const { statusCode, body } = await visit(server, {
        url: registeredOnlyPath
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(queryByText(body, accreditationNumber)).toBeNull()
      expect(
        queryByRole(body, 'link', {
          name: `apply for ${thisYear + 1} accreditation`
        })
      ).toBeNull()
    }
  )

  it('shows a registered-only operator no accreditation, balance or notes', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { registration: registeredOnly })

    const { body } = await visit(server, { url: registeredOnlyPath })

    expect(queryByText(body, accreditationNumber)).toBeNull()
    expect(queryByTestId(body, 'waste-balance-amount')).toBeNull()
    expect(queryByRole(body, 'link', { name: 'Create new PRN' })).toBeNull()
  })

  it('names every link by number', async ({ server, msw }) => {
    backendHolds(msw, { registration: registeredOnly })

    const { body } = await visit(server, {
      url: registeredOnlyPath,
      auth: buildMockAuth({
        linkedOrganisationId: organisationId,
        scope: [SCOPES.organisationLinkedWrite, SCOPES.wasteBalanceLedgerRead]
      })
    })

    expect(body.querySelector('.govuk-back-link')?.getAttribute('href')).toBe(
      `/organisations/500118/${year}`
    )
    expect(hrefOf(body, 'Upload your summary log')).toBe(
      `${registrationPath}/summary-logs/upload`
    )
    expect(hrefOf(body, 'Manage reports')).toBe(
      `${registrationPath}/reports/${year}`
    )
    expect(hrefOf(body, 'View waste balance ledger')).toBe(
      `${registrationPath}/waste-balance-ledger`
    )
  })

  it('offers no ledger link to a session that may not read it', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { registration: registeredOnly })

    const { body } = await visit(server, { url: registeredOnlyPath })

    expect(
      queryByRole(body, 'link', { name: 'View waste balance ledger' })
    ).toBeNull()
  })

  it('offers a registered-only operator no reapply link', async ({
    server,
    msw
  }) => {
    backendHolds(msw, { registration: registeredOnly })

    const { body } = await visit(server, { url: registeredOnlyPath })

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

    const { statusCode } = await visit(server, { url: registeredOnlyPath })

    expect(statusCode).toBe(statusCodes.ok)
  })

  it.for([
    { current: 'approved', statuses: ['created', 'approved'] },
    { current: 'suspended', statuses: ['created', 'approved', 'suspended'] }
  ])(
    'sends an operator whose accreditation for the year is $current to it',
    async ({ current, statuses }, { server, msw }) => {
      backendHolds(msw, {
        registration: {
          ...reprocessor,
          accreditations: { [year]: accreditationWith(current, statuses) }
        }
      })

      const response = await server.inject({
        method: 'GET',
        url: registeredOnlyPath,
        auth: operator
      })

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(accreditationPath)
    }
  )

  it('sends an operator to an approved accreditation whose year is still to come', async ({
    server,
    msw
  }) => {
    const nextYear = thisYear + 1
    backendHolds(msw, {
      registration: {
        ...reprocessor,
        accreditations: {
          [nextYear]: accreditationWith('approved', ['approved'], thisYear)
        }
      }
    })

    const response = await server.inject({
      method: 'GET',
      url: `${registrationPath}/${nextYear}`,
      auth: operator
    })

    expect(response.headers.location).toBe(
      `${registrationPath}/accreditations/${nextYear}`
    )
  })

  it('keeps a Welsh reader in Welsh', async ({ server, msw }) => {
    backendHolds(msw)

    const response = await server.inject({
      method: 'GET',
      url: `/cy${registeredOnlyPath}`,
      auth: operator
    })

    expect(response.headers.location).toBe(`/cy${accreditationPath}`)
  })

  it('keeps the query string', async ({ server, msw }) => {
    backendHolds(msw)

    const response = await server.inject({
      method: 'GET',
      url: `${registeredOnlyPath}?from=dashboard`,
      auth: operator
    })

    expect(response.headers.location).toBe(
      `${accreditationPath}?from=dashboard`
    )
  })

  it.for([
    {
      name: 'a year it was neither registered nor accredited in',
      segment: String(thisYear - 1)
    },
    {
      name: 'a year still to come it is not accredited in',
      segment: String(thisYear + 1)
    },
    { name: 'a value that is not a year', segment: 'abcd' },
    { name: 'a year with five digits', segment: `0${thisYear}` },
    { name: 'a year with a decimal point', segment: `${thisYear}.0` },
    { name: 'a year with a plus sign', segment: `+${thisYear}` }
  ])('is not found for $name', async ({ segment }, { server, msw }) => {
    backendHolds(msw, { registration: registeredOnly })

    const { statusCode } = await visit(server, {
      url: `${registrationPath}/${segment}`
    })

    expect(statusCode).toBe(statusCodes.notFound)
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
      url: `/organisations/500999/registrations/${registrationNumber}/${year}`
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  it('is not found for a registration number the organisation does not hold', async ({
    server,
    msw
  }) => {
    backendHolds(msw)

    const { statusCode } = await visit(server, {
      url: `/organisations/500118/registrations/R99XX/${year}`
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })
})

describe("the operator's registration page with no year", () => {
  it('sends an operator accredited in their latest registered year to its accreditation', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: {
        ...reprocessor,
        status: registeredSince(thisYear - 1),
        accreditations: {
          [thisYear - 1]: accreditationWith(
            'approved',
            ['approved'],
            thisYear - 1
          ),
          [year]: accreditationWith('approved', ['approved'])
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

  it('sends an operator registered-only in their latest registered year to its page', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: {
        ...reprocessor,
        status: registeredSince(thisYear - 1),
        accreditations: {
          [thisYear - 1]: accreditationWith(
            'approved',
            ['approved'],
            thisYear - 1
          )
        }
      }
    })

    const response = await server.inject({
      method: 'GET',
      url: registrationPath,
      auth: operator
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe(registeredOnlyPath)
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

  it('sends an operator whose accreditation is cancelled to the registered-only page for its year', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: {
        ...reprocessor,
        accreditations: {
          [year]: accreditationWith('cancelled', ['approved', 'cancelled'])
        }
      }
    })

    const response = await server.inject({
      method: 'GET',
      url: registrationPath,
      auth: operator
    })

    expect(response.headers.location).toBe(registeredOnlyPath)
  })

  it.for(
    /** @type {const} */ ([
      ['a registered-only', {}],
      ['an accredited', { [year]: accreditationWith('approved', ['approved']) }]
    ])
  )(
    'shows the year it sends %s operator to in the heading and page title',
    async ([, accreditations], { server, msw }) => {
      backendHolds(msw, { registration: { ...reprocessor, accreditations } })

      const { location } = await visit(server, { url: registrationPath })
      const { body, title } = await visit(server, { url: String(location) })

      expect(getByRole(body, 'heading', { level: 1 }).textContent).toContain(
        year
      )
      expect(title).toContain(year)
    }
  )

  it('sends an operator whose registration is still to start to the current year', async ({
    server,
    msw
  }) => {
    backendHolds(msw, {
      registration: { ...registeredOnly, status: registeredSince(thisYear + 1) }
    })

    const response = await server.inject({
      method: 'GET',
      url: registrationPath,
      auth: operator
    })

    expect(response.statusCode).toBe(statusCodes.found)
    expect(response.headers.location).toBe(registeredOnlyPath)
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
