import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

import { beforeEach, it } from '#vite/fixtures/server.js'

import { fetchPrnListDetails } from './fetch-prn-list-details.js'

/**
 * @import { SetupServer } from 'msw/node'
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { PrnListDetails } from './fetch-prn-list-details.js'
 */

/**
 * @typedef {{ authorization: string | null, pathname: string }} Received
 */

/**
 * @param {Received} a
 * @param {Received} b
 */
const byPathname = (a, b) => a.pathname.localeCompare(b.pathname)

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)

const { fetchRegistrationAndAccreditation } =
  await import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')

describe(fetchPrnListDetails, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const accreditationId = 'acc-789'
  const backendToken = 'token'

  const organisation = /** @type {Organisation} */ (
    /** @type {unknown} */ ({
      id: organisationId,
      companyDetails: { name: 'Kirkby Plastics Ltd' }
    })
  )

  const registration = /** @type {Registration} */ (
    /** @type {unknown} */ ({
      id: registrationId,
      registrationNumber: 'R26ER5001180041PL',
      wasteProcessingType: 'reprocessor'
    })
  )

  const accreditation = {
    id: accreditationId,
    accreditationNumber: 'A26ER5001180114PL',
    status: 'approved'
  }

  /** @type {PrnListDetails['packagingRecyclingNotes']} */
  const notes = [
    {
      id: 'prn-001',
      prnNumber: '240000123',
      issuedToOrganisation: { id: 'org-9', name: 'Radar Compliance PLC' },
      tonnage: 20,
      material: 'plastic',
      status: 'accepted',
      createdAt: '2026-01-27T09:00:00.000Z',
      issuedAt: '2026-01-28T09:00:00.000Z',
      wasteProcessingType: 'reprocessor',
      processToBeUsed: '',
      isDecemberWaste: false
    }
  ]

  /**
   * @param {SetupServer} msw
   * @param {() => Response} [answer]
   */
  const backendAnswers = (msw, answer = () => HttpResponse.json(notes)) => {
    /** @type {Received[]} */
    const received = []

    msw.use(
      http.get(/\/v1\/organisations\//, ({ request }) => {
        const { pathname } = new URL(request.url)
        received.push({
          authorization: request.headers.get('authorization'),
          pathname
        })

        return pathname.endsWith('/packaging-recycling-notes')
          ? answer()
          : HttpResponse.json(accreditation)
      })
    )

    return received
  }

  /** @type {Received[]} */
  let requests

  const fetchDetails = () =>
    fetchPrnListDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken
    })

  beforeEach(({ msw }) => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: organisation,
      registration
    })
    requests = backendAnswers(msw)
  })

  it('reads the three things the page shows, and nothing else', async () => {
    const result = await fetchDetails()

    expect(result).toStrictEqual({
      organisation,
      registration,
      accreditation,
      packagingRecyclingNotes: notes
    })

    // The waste balance, the reporting calendar and the ledger belong to the
    // page above this one; asking for them here would be three reads spent on
    // nothing this page draws.
    expect(requests).toHaveLength(2)
  })

  it('reads the accreditation and its notes with the session token, encoding the ids in each path', async () => {
    await fetchPrnListDetails({
      organisationId: 'org/123',
      registrationId: 'reg 456',
      accreditationId: 'acc?789',
      backendToken
    })

    expect(requests.toSorted(byPathname)).toStrictEqual(
      [
        '/v1/organisations/org%2F123/registrations/reg%20456/accreditations/acc%3F789',
        '/v1/organisations/org%2F123/registrations/reg%20456/accreditations/acc%3F789/packaging-recycling-notes'
      ]
        .map((pathname) => ({ authorization: 'Bearer token', pathname }))
        .toSorted(byPathname)
    )
  })

  it('fails the page where the notes could not be read', async ({ msw }) => {
    backendAnswers(msw, () => new HttpResponse(null, { status: 503 }))

    // Unlike the summary section on the accreditation page, the notes are the
    // whole of this page, so there is nothing left to render without them.
    await expect(fetchDetails()).rejects.toMatchObject({
      output: { statusCode: 503 }
    })
  })
})
