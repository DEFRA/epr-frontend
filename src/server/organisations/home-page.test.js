import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchOrganisation } from '#server/common/helpers/organisations/fetch-organisation.js'
import { fetchOrganisationYears } from '#server/common/helpers/organisations/fetch-organisation-years.js'
import { fetchOrganisationWasteBalances } from '#server/common/helpers/waste-balance/fetch-organisation-waste-balances.js'
import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { year } from '#server/common/helpers/year.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { it } from '#vite/fixtures/server.js'
import { homePath } from './home-page.js'
import Boom from '@hapi/boom'
import { getAllByRole, getByRole } from '@testing-library/dom'
import { load } from 'cheerio'
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'

/** @import { DOMWindow } from 'jsdom' */
/** @import { AccreditationView, OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js' */

vi.mock(import('#server/common/helpers/organisations/fetch-organisation.js'))
vi.mock(
  import('#server/common/helpers/organisations/fetch-organisation-years.js')
)
vi.mock(
  import('#server/common/helpers/waste-balance/fetch-organisation-waste-balances.js')
)

const ORGANISATION_NUMBER = 500123
const BARE_PATH = `/organisations/${ORGANISATION_NUMBER}`
const PATH = `${BARE_PATH}/2026`

const mockAuth = buildMockAuth({
  idToken: 'test-id-token',
  backendToken: 'test-backend-token'
})

/**
 * @param {Partial<RegistrationView>} [overrides]
 * @returns {RegistrationView}
 */
const reprocessor = (overrides = {}) =>
  /** @type {RegistrationView} */ ({
    status: 'approved',
    material: 'plastic',
    submittedToRegulator: { code: 'ea' },
    wasteProcessingType: 'reprocessor',
    site: { address: { line1: 'Site A' } },
    accreditations: {},
    ...overrides
  })

/**
 * @param {Partial<RegistrationView>} [overrides]
 * @returns {RegistrationView}
 */
const exporter = (overrides = {}) =>
  /** @type {RegistrationView} */ ({
    status: 'approved',
    material: 'paper',
    submittedToRegulator: { code: 'ea' },
    wasteProcessingType: 'exporter',
    accreditations: {},
    ...overrides
  })

/**
 * @param {Partial<OrganisationView>} [overrides]
 * @returns {OrganisationView}
 */
const organisationOf = (overrides = {}) => ({
  organisationNumber: ORGANISATION_NUMBER,
  name: 'ACME ltd',
  tradingName: 'ACME trading',
  registrations: {},
  ...overrides
})

/** @type {AccreditationView} */
const approved2026 = {
  accreditationNumber: 'A26ER1',
  status: 'approved',
  statusTimeline: {}
}

/**
 * @param {Record<string, RegistrationView>} registrations
 * @param {Partial<OrganisationView>} [overrides]
 */
const serve = (registrations, overrides = {}) =>
  vi
    .mocked(fetchOrganisation)
    .mockResolvedValue(organisationOf({ registrations, ...overrides }))

/**
 * @param {ServerFixtures['server']} server
 * @param {string} [url]
 */
const visit = (server, url = PATH) =>
  server.inject({ method: 'GET', url, auth: mockAuth })

/**
 * @param {string} payload
 * @returns {InstanceType<DOMWindow['HTMLElement']>}
 */
const bodyOf = (payload) => new JSDOM(payload).window.document.body

/**
 * @param {InstanceType<DOMWindow['HTMLElement']>} table
 * @returns {(columnName: string | RegExp) => InstanceType<DOMWindow['HTMLElement']>}
 */
const cellInColumn = (table) => {
  const headers = getAllByRole(table, 'columnheader')
  const [, dataRow] = getAllByRole(table, 'row')

  return (columnName) => {
    const pattern =
      columnName instanceof RegExp ? columnName : new RegExp(columnName, 'i')
    const colIndex = headers.findIndex((h) => pattern.test(h.textContent))

    return getAllByRole(dataRow, 'cell')[colIndex]
  }
}

describe('#homePath', () => {
  const organisation = organisationNumber(ORGANISATION_NUMBER)

  it('builds the path when it has no year', () => {
    expect(homePath(organisation)).toBe(BARE_PATH)
  })

  it('builds the path when it has a year', () => {
    expect(homePath(organisation, { year: year(2026) })).toBe(PATH)
  })

  it('builds the path when it has a year and exporting', () => {
    expect(homePath(organisation, { year: year(2026), exporting: true })).toBe(
      `${PATH}/exporting`
    )
  })

  it('builds the path when it has exporting and no year', () => {
    expect(homePath(organisation, { exporting: true })).toBe(
      `${BARE_PATH}/exporting`
    )
  })
})

describe('the organisation home page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchOrganisationYears).mockResolvedValue([
      year(2026),
      year(2025)
    ])
    vi.mocked(fetchOrganisationWasteBalances).mockResolvedValue({})
  })

  describe('the organisation it reads', () => {
    it.for([2026, 2025])(
      'reads the organisation as it stood in the year in the address, %i',
      async (addressYear, { server }) => {
        serve({})

        await visit(server, `${BARE_PATH}/${addressYear}`)

        expect(fetchOrganisationYears).toHaveBeenCalledWith(
          ORGANISATION_NUMBER,
          'test-backend-token'
        )
        expect(fetchOrganisation).toHaveBeenCalledWith(
          ORGANISATION_NUMBER,
          'test-backend-token',
          { year: addressYear }
        )
        expect(fetchOrganisationWasteBalances).toHaveBeenCalledWith(
          ORGANISATION_NUMBER,
          addressYear,
          'test-backend-token'
        )
      }
    )

    it('shows no registrations when the organisation has no approved year', async ({
      server
    }) => {
      vi.mocked(fetchOrganisationYears).mockResolvedValue([])
      serve({ R26ER1: reprocessor() })

      const { payload, statusCode } = await visit(server, BARE_PATH)

      expect(statusCode).toBe(statusCodes.ok)
      expect(fetchOrganisation).toHaveBeenCalledWith(
        ORGANISATION_NUMBER,
        'test-backend-token'
      )
      expect(fetchOrganisationWasteBalances).not.toHaveBeenCalled()
      expect(payload).toContain('No sites found')
      expect(load(payload)('h1').text()).toMatch(/ACME trading/)
    })
  })

  describe('the name it shows', () => {
    it('names the organisation by its trading name', async ({ server }) => {
      serve({})

      const { payload } = await visit(server)
      const $ = load(payload)

      expect($('title').text()).toMatch(/^Home: ACME trading/)
      expect($('h1').text()).toMatch(/ACME trading/)
    })

    it('falls back to the name when there is no trading name', async ({
      server
    }) => {
      serve({}, { tradingName: undefined })

      const { payload } = await visit(server)

      expect(load(payload)('title').text()).toMatch(/^Home: ACME ltd/)
    })

    it('falls back to the name when the trading name is blank', async ({
      server
    }) => {
      serve({}, { tradingName: '   ' })

      const { payload } = await visit(server)

      expect(load(payload)('h1').text()).toMatch(/ACME ltd/)
    })
  })

  describe('the registrations it shows', () => {
    it('shows a reprocessing row for each registration', async ({ server }) => {
      serve({
        R26ER1: reprocessor({ accreditations: { 2026: approved2026 } })
      })

      const { payload, statusCode } = await visit(server)
      const cell = cellInColumn(getByRole(bodyOf(payload), 'table'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(cell('Material')).toHaveTextContent('Plastic')
      expect(cell('Registration')).toHaveTextContent('Approved')
      expect(cell('Accreditation')).toHaveTextContent('Approved')
    })

    it('shows a resolved glass material by its process', async ({ server }) => {
      serve({ R26ER1: reprocessor({ material: 'glass_re_melt' }) })

      const { payload } = await visit(server)
      const cell = cellInColumn(getByRole(bodyOf(payload), 'table'))

      expect(cell('Material')).toHaveTextContent('Glass remelt')
    })

    it('links a registered-only row to its registration by number', async ({
      server
    }) => {
      serve({ R26ER1: reprocessor() })

      const { payload } = await visit(server)

      expect(load(payload)('tbody a.govuk-link').attr('href')).toBe(
        `/organisations/${ORGANISATION_NUMBER}/registrations/R26ER1`
      )
    })

    it('links an accredited row to its accreditation for the year', async ({
      server
    }) => {
      serve({
        R26ER1: reprocessor({ accreditations: { 2026: approved2026 } })
      })

      const { payload } = await visit(server)

      expect(load(payload)('tbody a.govuk-link').attr('href')).toBe(
        `/organisations/${ORGANISATION_NUMBER}/registrations/R26ER1/accreditations/2026`
      )
    })

    it('links a row to the year even once its accreditation is cancelled', async ({
      server
    }) => {
      serve({
        R26ER1: reprocessor({
          accreditations: {
            2026: {
              accreditationNumber: 'A26ER1',
              status: 'cancelled',
              statusTimeline: {}
            }
          }
        })
      })

      const { payload } = await visit(server)

      expect(load(payload)('tbody a.govuk-link').attr('href')).toBe(
        `/organisations/${ORGANISATION_NUMBER}/registrations/R26ER1/accreditations/2026`
      )
    })

    it('links a row by registration alone where its accreditation is for another year', async ({
      server
    }) => {
      serve({
        R26ER1: reprocessor({
          accreditations: {
            2025: {
              accreditationNumber: 'A25ER1',
              status: 'approved',
              statusTimeline: {}
            }
          }
        })
      })

      const { payload } = await visit(server)

      expect(load(payload)('tbody a.govuk-link').attr('href')).toBe(
        `/organisations/${ORGANISATION_NUMBER}/registrations/R26ER1`
      )
    })

    it('keeps a Welsh reader in Welsh', async ({ server }) => {
      serve({
        R26ER1: reprocessor({ accreditations: { 2026: approved2026 } })
      })

      const { payload } = await visit(server, `/cy${PATH}`)

      expect(load(payload)('tbody a.govuk-link').attr('href')).toBe(
        `/cy/organisations/${ORGANISATION_NUMBER}/registrations/R26ER1/accreditations/2026`
      )
    })

    it('groups registrations under the site they are processed at', async ({
      server
    }) => {
      serve({
        R26ER1: reprocessor(),
        R26ER2: reprocessor({
          site: { address: { fullAddress: 'Site B, London' } }
        }),
        R26ER3: reprocessor({ material: 'wood' })
      })

      const { payload } = await visit(server)
      const $ = load(payload)

      expect(
        $('h3.govuk-heading-m')
          .map((_, el) => $(el).text())
          .get()
      ).toStrictEqual(['Site A', 'Site B, London'])
      expect($('tbody tr')).toHaveLength(3)
    })

    it('shows an exporter-only organisation in one table with no site heading', async ({
      server
    }) => {
      serve({ R26EX1: exporter(), R26EX2: exporter({ material: 'steel' }) })

      const { payload } = await visit(server, `${PATH}/exporting`)
      const $ = load(payload)

      expect($('h3.govuk-heading-m')).toHaveLength(0)
      expect($('table')).toHaveLength(1)
      expect($('tbody tr')).toHaveLength(2)
      expect($('.govuk-tabs')).toHaveLength(0)
    })

    it('says no sites were found when the year has no registrations', async ({
      server
    }) => {
      serve({})

      const { payload } = await visit(server)

      expect(payload).toContain('No sites found')
    })
  })

  describe('the accreditation it shows', () => {
    it('shows the accreditation for the year in the address and no other', async ({
      server
    }) => {
      serve({
        R26ER1: reprocessor({
          accreditations: {
            2025: {
              accreditationNumber: 'A25ER1',
              status: 'suspended',
              statusTimeline: {}
            }
          }
        })
      })

      const { payload } = await visit(server)
      const cell = cellInColumn(getByRole(bodyOf(payload), 'table'))

      expect(cell('Accreditation')).toHaveTextContent('Not accredited')
    })

    it('tags a suspended accreditation', async ({ server }) => {
      serve({
        R26ER1: reprocessor({
          accreditations: {
            2026: {
              accreditationNumber: 'A26ER1',
              status: 'suspended',
              statusTimeline: {}
            }
          }
        })
      })

      const { payload } = await visit(server)

      expect(load(payload)('.govuk-tag--yellow').text()).toBe('Suspended')
    })

    it('shows a cancelled accreditation as not accredited, with no balance', async ({
      server
    }) => {
      serve({
        R26ER1: reprocessor({
          status: 'cancelled',
          accreditations: {
            2026: {
              accreditationNumber: 'A26ER1',
              status: 'cancelled',
              statusTimeline: {}
            }
          }
        })
      })

      const { payload } = await visit(server)
      const cell = cellInColumn(getByRole(bodyOf(payload), 'table'))

      expect(cell('Registration')).toHaveTextContent('Cancelled')
      expect(load(payload)('.govuk-tag--red')).toHaveLength(1)
      expect(cell('Accreditation')).toHaveTextContent('Not accredited')
      expect(cell(/Available waste balance/)).toHaveTextContent(
        'Not applicable'
      )
    })
  })

  describe('the waste balance it shows', () => {
    it('shows each accreditation’s balance', async ({ server }) => {
      serve({
        R26ER1: reprocessor({ accreditations: { 2026: approved2026 } })
      })
      vi.mocked(fetchOrganisationWasteBalances).mockResolvedValue({
        A26ER1: { amount: 1500.5, availableAmount: 1234.56 }
      })

      const { payload } = await visit(server)
      const cell = cellInColumn(getByRole(bodyOf(payload), 'table'))

      expect(cell(/Available waste balance/)).toHaveTextContent('1,234.56')
    })

    it('still shows the page when the balances cannot be read', async ({
      server
    }) => {
      const fetchError = new Error('Waste balance service unavailable')
      serve({
        R26ER1: reprocessor({ accreditations: { 2026: approved2026 } })
      })
      vi.mocked(fetchOrganisationWasteBalances).mockRejectedValue(fetchError)

      const { payload, statusCode } = await visit(server)
      const cell = cellInColumn(getByRole(bodyOf(payload), 'table'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(cell(/Available waste balance/)).toHaveTextContent('0.00')
      expect(server.loggerMocks.error).toHaveBeenCalledWith({
        message: 'Failed to fetch waste balances',
        err: fetchError
      })
    })
  })

  describe('the tabs it offers', () => {
    beforeEach(() => {
      serve({ R26ER1: reprocessor(), R26EX1: exporter() })
    })

    it('opens on reprocessing, linking both tabs by number', async ({
      server
    }) => {
      const { payload } = await visit(server)
      const $ = load(payload)

      expect($('.govuk-tabs__list-item--selected a').text()).toMatch(
        /Reprocessing/
      )
      expect(
        $('.govuk-tabs__tab')
          .map((_, el) => $(el).attr('href'))
          .get()
      ).toStrictEqual([PATH, `${PATH}/exporting`])
    })

    it('shows exporting on the exporting tab', async ({ server }) => {
      const { payload } = await visit(server, `${PATH}/exporting`)
      const $ = load(payload)

      expect($('.govuk-tabs__list-item--selected a').text()).toMatch(
        /Exporting/
      )
      expect($('tbody td').first().text()).toBe('Paper and board')
    })
  })

  describe('the year in the address', () => {
    beforeEach(() => {
      serve({})
    })

    it.for(
      /** @type {const} */ ([
        ['', '/2026'],
        ['/exporting', '/2026/exporting']
      ])
    )(
      'sends the organisation address at "%s" to its latest year',
      async ([page, expected], { server }) => {
        const { statusCode, headers } = await visit(
          server,
          `${BARE_PATH}${page}`
        )

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(`${BARE_PATH}${expected}`)
        expect(fetchOrganisation).not.toHaveBeenCalled()
      }
    )

    it('links the tabs within the year the address names', async ({
      server
    }) => {
      serve({ R26R1: reprocessor(), R26EX1: exporter() })

      const { payload } = await visit(server, `${BARE_PATH}/2025`)
      const $ = load(payload)

      expect(
        $('.govuk-tabs__tab')
          .map((_, el) => $(el).attr('href'))
          .get()
      ).toStrictEqual([`${BARE_PATH}/2025`, `${BARE_PATH}/2025/exporting`])
    })

    it('finds no page for a year the organisation has no approved registrations in', async ({
      server
    }) => {
      const { statusCode } = await visit(server, `${BARE_PATH}/2024`)

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it.for(['20x6', '202', '20266'])(
      'finds no page for the address "%s", which is not a year',
      async (segment, { server }) => {
        const { statusCode } = await visit(server, `${BARE_PATH}/${segment}`)

        expect(statusCode).toBe(statusCodes.notFound)
      }
    )

    it('shows the page without a year address when the organisation has no approved year', async ({
      server
    }) => {
      vi.mocked(fetchOrganisationYears).mockResolvedValue([])

      const { statusCode } = await visit(server, BARE_PATH)

      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('the year line', () => {
    beforeEach(() => {
      serve({})
    })

    afterEach(() => {
      config.set('featureFlags.navigateAcrossYears', false)
    })

    it('hides the year line while the flag is off', async ({ server }) => {
      config.set('featureFlags.navigateAcrossYears', false)

      const { payload } = await visit(server)

      expect(payload).not.toMatch(/This is \d+ data/)
    })

    it('shows the year line while the flag is on', async ({ server }) => {
      config.set('featureFlags.navigateAcrossYears', true)

      const { payload } = await visit(server)

      expect(load(payload)('p.govuk-heading-m').text()).toBe(
        'This is 2026 data'
      )
    })

    it('hides the year line when the organisation has no approved year', async ({
      server
    }) => {
      config.set('featureFlags.navigateAcrossYears', true)
      vi.mocked(fetchOrganisationYears).mockResolvedValue([])

      const { payload } = await visit(server, BARE_PATH)

      expect(payload).not.toMatch(/This is \d+ data/)
    })
  })

  describe('when it cannot be shown', () => {
    it('shows the not-found page when the backend has no such organisation', async ({
      server
    }) => {
      vi.mocked(fetchOrganisationYears).mockRejectedValue(
        Boom.notFound('Organisation not found')
      )

      const { statusCode } = await visit(server)

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('shows the error page when the backend fails', async ({ server }) => {
      vi.mocked(fetchOrganisation).mockRejectedValue(
        new Error('Backend service unavailable')
      )

      const { statusCode } = await visit(server)

      expect(statusCode).toBe(statusCodes.internalServerError)
    })

    it('sends a signed-out user to the logged-out page', async ({ server }) => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: PATH
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/logged-out')
    })
  })
})

/** @import { ServerFixtures } from '#vite/fixtures/server.js' */
