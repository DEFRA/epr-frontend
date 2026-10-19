/** @import { HapiServer } from '#server/common/hapi-types.js'; */
/** @import { OrganisationView } from '#server/common/helpers/organisations/organisation-view.js'; */
/** @import { SetupServer } from 'msw/node'; */
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import {
  getAllByRole,
  getByRole,
  queryAllByRole,
  queryByRole,
  within
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect } from 'vitest'

const backendUrl = config.get('eprBackendUrl')
const organisationNumber = 500118
const path = `/organisations/${organisationNumber}`

const operator = buildMockAuth()

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

const support = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-3', email: 'support.user@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.support)
})

const unrecognised = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-2', email: 'nobody@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.unrecognised)
})

/** @type {OrganisationView} */
const organisation = {
  organisationNumber,
  name: 'Kirkby Plastics Ltd',
  displayName: 'Kirkby Plastics Ltd',
  registrations: {
    R26ER5001180041PL: {
      status: {
        current: 'approved',
        timeline: { '2025-01-01T00:00:00.000Z': { status: 'approved' } }
      },
      validFrom: '2025-01-01',
      material: 'glass_re_melt',
      submittedToRegulator: { code: 'ea' },
      wasteProcessingType: 'reprocessor',
      reprocessingType: 'input',
      site: {
        address: { line1: 'Site name A', town: 'Kirkby', postcode: 'L33 7SA' }
      },
      accreditations: {
        2025: {
          accreditationNumber: 'A25ER5001180114GR',
          status: {
            current: 'cancelled',
            timeline: {
              '2025-01-01T09:00:00.000Z': { status: 'approved' },
              '2025-06-01T09:00:00.000Z': { status: 'cancelled' }
            }
          }
        },
        2026: {
          accreditationNumber: 'A26ER5001180114GR',
          status: {
            current: 'approved',
            timeline: { '2026-01-01T09:00:00.000Z': { status: 'approved' } }
          }
        }
      }
    },
    R26ER5001180042AL: {
      status: {
        current: 'cancelled',
        timeline: {
          '2025-01-01T00:00:00.000Z': { status: 'approved' },
          '2025-06-01T09:00:00.000Z': { status: 'cancelled' }
        }
      },
      validFrom: '2025-01-01',
      material: 'aluminium',
      submittedToRegulator: { code: 'sepa' },
      wasteProcessingType: 'reprocessor',
      reprocessingType: 'input',
      site: {
        address: { line1: 'Site name A', town: 'Kirkby', postcode: 'L33 7SA' }
      },
      accreditations: {}
    },
    R26EX5001180041PA: {
      status: {
        current: 'approved',
        timeline: { '2025-01-01T00:00:00.000Z': { status: 'approved' } }
      },
      validFrom: '2025-01-01',
      material: 'paper',
      submittedToRegulator: { code: 'ea' },
      wasteProcessingType: 'exporter',
      accreditations: {}
    }
  }
}

/**
 * The backend as both the regulator page and the operator dashboard read it.
 * The year a request names is recorded, so a test can see which the page asked for.
 * @param {SetupServer} msw
 */
const serveBackend = (msw) => {
  /** @type {Array<string | null>} */
  const yearsAskedFor = []

  msw.use(
    http.get(`${backendUrl}${path}`, ({ request }) => {
      yearsAskedFor.push(new URL(request.url).searchParams.get('year'))
      return HttpResponse.json(organisation)
    }),
    http.get(`${backendUrl}${path}/years`, () =>
      HttpResponse.json({ years: [2026, 2025] })
    ),
    http.get(`${backendUrl}${path}/waste-balances/:year`, () =>
      HttpResponse.json({})
    )
  )

  return { yearsAskedFor }
}

/**
 * @param {HapiServer} server
 * @param {ReturnType<typeof buildMockAuth>} auth
 * @param {string} [url]
 */
const visit = async (server, auth, url = path) => {
  const response = await server.inject({ method: 'GET', url, auth })

  return {
    statusCode: response.statusCode,
    body: asHtml(response.result)
  }
}

/** @param {string} body */
const documentOf = (body) => new JSDOM(body).window.document.body

/** @param {string} body */
const headingOf = (body) =>
  getByRole(documentOf(body), 'heading', { level: 1 }).textContent?.trim()

/** @param {string} body */
const rowsOf = (body) =>
  getAllByRole(within(documentOf(body)).getByRole('table'), 'row')
    .slice(1)
    .map((row) =>
      [...queryAllByRole(row, 'rowheader'), ...queryAllByRole(row, 'cell')].map(
        (cell) => cell.textContent?.trim().replaceAll(/\s+/g, ' ')
      )
    )

describe('the organisation homepage a regulator reads', () => {
  /** @type {ReturnType<typeof serveBackend>} */
  let backend

  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(({ msw }) => {
    backend = serveBackend(msw)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('heads the page with the organisation it is about', async ({ server }) => {
    const { statusCode, body } = await visit(server, regulator)

    expect(statusCode).toBe(statusCodes.ok)
    expect(headingOf(body)).toContain('Organisation homepage')
    expect(documentOf(body).textContent).toContain('Kirkby Plastics Ltd')
  })

  it('reads the whole organisation, not one year of it', async ({ server }) => {
    await visit(server, regulator)

    expect(backend.yearsAskedFor).toStrictEqual([null])
  })

  it('names the columns the design asks for', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(
      getAllByRole(
        within(documentOf(body)).getByRole('table'),
        'columnheader'
      ).map((cell) => cell.textContent?.trim())
    ).toStrictEqual([
      'Registration number',
      'Registration status',
      'Material',
      'Regulator',
      'Accreditation',
      'Actions'
    ])
  })

  it('reads each registration out of the record', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(rowsOf(body)).toStrictEqual([
      [
        'R26ER5001180041PL',
        'Approved',
        'Glass remelt',
        'EA',
        '2026: Approved 2025: Cancelled',
        'View R26ER5001180041PL'
      ],
      [
        'R26ER5001180042AL',
        'Cancelled',
        'Aluminium',
        'SEPA',
        'Not applicable',
        'View R26ER5001180042AL'
      ]
    ])
  })

  it('opens a registration by number from the row that names it', async ({
    server
  }) => {
    const { body } = await visit(server, regulator)

    expect(
      getByRole(documentOf(body), 'link', {
        name: /^View\s*R26ER5001180041PL$/
      }).getAttribute('href')
    ).toBe(`${path}/registrations/R26ER5001180041PL`)
  })

  it('walks back to the organisation list', async ({ server }) => {
    const { body } = await visit(server, regulator)

    expect(
      getByRole(documentOf(body), 'link', {
        name: 'All organisations'
      }).getAttribute('href')
    ).toBe('/regulators/home')
  })

  it('separates what the organisation exports from what it reprocesses', async ({
    server
  }) => {
    const { body } = await visit(server, regulator, `${path}/exporting`)

    expect(rowsOf(body).map(([number]) => number)).toStrictEqual([
      'R26EX5001180041PA'
    ])
  })
})

describe('an old bookmark to the organisation page', () => {
  const organisationId = '6507f1f77bcf86cd79943901'

  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(({ msw }) => {
    msw.use(
      http.get(`${backendUrl}/v1/organisations/${organisationId}`, () =>
        HttpResponse.json({
          id: organisationId,
          orgId: organisationNumber,
          registrations: [],
          accreditations: []
        })
      )
    )
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it.for(
    /** @type {const} */ ([
      ['an operator', ''],
      ['an operator', '/exporting'],
      ['an operator', '/error'],
      ['a regulator', ''],
      ['a regulator', '/exporting']
    ])
  )(
    'sends %s from the id to the number at "%s"',
    async ([who, page], { server }) => {
      const auth =
        who === 'a regulator'
          ? regulator
          : buildMockAuth({ linkedOrganisationId: organisationId })

      const response = await server.inject({
        method: 'GET',
        url: `/organisations/${organisationId}${page}`,
        auth
      })

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(`${path}${page}`)
    }
  )
})

describe('who the organisation page renders for', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(({ msw }) => {
    serveBackend(msw)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('gives an operator their own page, not the regulator one', async ({
    server
  }) => {
    const { statusCode, body } = await visit(server, operator, `${path}/2026`)

    expect(statusCode).toBe(statusCodes.ok)
    expect(headingOf(body)).not.toContain('Organisation homepage')
    expect(
      queryByRole(documentOf(body), 'columnheader', { name: 'Regulator' })
    ).toBeNull()
  })

  it('renders an operator the identical page whether the regulator surface is on or off', async ({
    server
  }) => {
    const surfaceOn = await visit(server, operator, `${path}/2026`)

    config.set('featureFlags.regulatorAccess', false)
    const surfaceOff = await visit(server, operator, `${path}/2026`)
    config.set('featureFlags.regulatorAccess', true)

    expect(surfaceOn.statusCode).toBe(statusCodes.ok)
    expect(surfaceOff.statusCode).toBe(statusCodes.ok)
    expect(surfaceOff.body).toBe(surfaceOn.body)
  })

  it('gives a support user the regulator page', async ({ server }) => {
    const { statusCode, body } = await visit(server, support)

    expect(statusCode).toBe(statusCodes.ok)
    expect(headingOf(body)).toContain('Organisation homepage')
  })

  it('keeps a session the backend named nobody on the operator page', async ({
    server
  }) => {
    const { body } = await visit(server, unrecognised, `${path}/2026`)

    expect(headingOf(body)).not.toContain('Organisation homepage')
  })

  it('gives a regulator the operator page while the regulator surface is off', async ({
    server
  }) => {
    config.set('featureFlags.regulatorAccess', false)
    const { statusCode, body } = await visit(server, regulator, `${path}/2026`)
    config.set('featureFlags.regulatorAccess', true)

    expect(statusCode).toBe(statusCodes.ok)
    expect(headingOf(body)).not.toContain('Organisation homepage')
  })
})
