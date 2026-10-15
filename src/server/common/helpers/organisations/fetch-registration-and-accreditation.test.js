import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import {
  fetchRegistrationAndAccreditation,
  fetchRegistrationAndAccreditationByNumber
} from './fetch-registration-and-accreditation.js'

const backendUrl = config.get('eprBackendUrl')

describe(fetchRegistrationAndAccreditation, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const accreditationId = 'acc-789'
  const backendToken = 'test-id-token'

  test('returns organisation data, registration and accreditation when all exist', async ({
    msw
  }) => {
    const mockOrganisationData = {
      id: organisationId,
      registrations: [{ id: registrationId, accreditationId }],
      accreditations: [
        {
          id: accreditationId,
          accreditationNumber: 'ACC-2025-001',
          status: 'approved'
        }
      ]
    }

    msw.use(
      http.get(`${backendUrl}/v1/organisations/org-123`, () =>
        HttpResponse.json(mockOrganisationData)
      )
    )

    const result = await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      backendToken
    )

    const accreditation = {
      id: accreditationId,
      accreditationNumber: 'ACC-2025-001',
      status: 'approved'
    }

    expect(result).toStrictEqual({
      organisationData: mockOrganisationData,
      registration: { id: registrationId, accreditationId },
      accreditation,
      rawAccreditation: accreditation
    })
  })

  test('returns undefined accreditation when accreditation status is created', async ({
    msw
  }) => {
    const mockOrganisationData = {
      id: organisationId,
      registrations: [{ id: registrationId, accreditationId }],
      accreditations: [
        {
          id: accreditationId,
          accreditationNumber: 'ACC-2025-001',
          status: 'created'
        }
      ]
    }

    msw.use(
      http.get(`${backendUrl}/v1/organisations/org-123`, () =>
        HttpResponse.json(mockOrganisationData)
      )
    )

    const result = await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      backendToken
    )

    expect(result).toStrictEqual({
      organisationData: mockOrganisationData,
      registration: { id: registrationId, accreditationId },
      accreditation: undefined,
      rawAccreditation: {
        id: accreditationId,
        accreditationNumber: 'ACC-2025-001',
        status: 'created'
      }
    })
  })

  test('should throw 404 when registration not found', async ({ msw }) => {
    msw.use(
      http.get(`${backendUrl}/v1/organisations/org-123`, () =>
        HttpResponse.json({
          id: organisationId,
          registrations: [{ id: 'other-reg', accreditationId }],
          accreditations: [
            { id: accreditationId, accreditationNumber: 'ACC-2025-001' }
          ]
        })
      )
    )

    await expect(
      fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        backendToken
      )
    ).rejects.toMatchObject({ isBoom: true, output: { statusCode: 404 } })
  })

  test('returns undefined accreditation when registration has no accreditationId', async ({
    msw
  }) => {
    const mockOrganisationData = {
      id: organisationId,
      registrations: [{ id: registrationId }],
      accreditations: [
        { id: accreditationId, accreditationNumber: 'ACC-2025-001' }
      ]
    }

    msw.use(
      http.get(`${backendUrl}/v1/organisations/org-123`, () =>
        HttpResponse.json(mockOrganisationData)
      )
    )

    const result = await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      backendToken
    )

    expect(result).toStrictEqual({
      organisationData: mockOrganisationData,
      registration: { id: registrationId },
      accreditation: undefined,
      rawAccreditation: undefined
    })
  })

  test('returns undefined accreditation when accreditation not found', async ({
    msw
  }) => {
    const mockOrganisationData = {
      id: organisationId,
      registrations: [
        { id: registrationId, accreditationId: 'non-existent-acc' }
      ],
      accreditations: [
        { id: accreditationId, accreditationNumber: 'ACC-2025-001' }
      ]
    }

    msw.use(
      http.get(`${backendUrl}/v1/organisations/org-123`, () =>
        HttpResponse.json(mockOrganisationData)
      )
    )

    const result = await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      backendToken
    )

    expect(result).toStrictEqual({
      organisationData: mockOrganisationData,
      registration: { id: registrationId, accreditationId: 'non-existent-acc' },
      accreditation: undefined,
      rawAccreditation: undefined
    })
  })

  test('should throw 404 when registrations array is empty', async ({
    msw
  }) => {
    msw.use(
      http.get(`${backendUrl}/v1/organisations/org-123`, () =>
        HttpResponse.json({
          id: organisationId,
          registrations: [],
          accreditations: []
        })
      )
    )

    await expect(
      fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        backendToken
      )
    ).rejects.toMatchObject({ isBoom: true, output: { statusCode: 404 } })
  })

  test('passes correct parameters to fetchOrganisationById', async ({
    msw
  }) => {
    /** @type {Request | undefined} */
    let capturedRequest
    msw.use(
      http.get(`${backendUrl}/v1/organisations/org-123`, ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          id: organisationId,
          registrations: [{ id: registrationId }],
          accreditations: []
        })
      })
    )

    await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      backendToken
    )

    expect(
      /** @type {Request} */ (capturedRequest).headers.get('authorization')
    ).toBe('Bearer test-id-token')
  })

  test('propagates errors from fetchOrganisationById', async ({ msw }) => {
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123`,
        () => new HttpResponse(null, { status: 404, statusText: 'Not Found' })
      )
    )

    await expect(
      fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        backendToken
      )
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })
})

describe(fetchRegistrationAndAccreditationByNumber, () => {
  const organisationId = '6507f1f77bcf86cd79943901'
  const organisationNumber = '500001'
  const registrationNumber = 'R25SR500030912PA'
  const organisationUrl = `${backendUrl}/v1/organisations/${organisationId}`

  const liveAccreditation = {
    id: 'acc-789',
    accreditationNumber: 'ACC-2025-001',
    status: 'approved'
  }

  const registration = {
    id: 'reg-456',
    registrationNumber,
    accreditationId: liveAccreditation.id
  }

  /**
   * @param {object} [overrides]
   */
  const anOrganisation = (overrides) => ({
    id: organisationId,
    orgId: Number(organisationNumber),
    registrations: [
      { id: 'reg-other', registrationNumber: 'R25SR500030999PA' },
      registration
    ],
    accreditations: [liveAccreditation],
    ...overrides
  })

  /**
   * @param {object} organisation
   */
  const organisationHeld = (organisation) =>
    http.get(organisationUrl, () => HttpResponse.json(organisation))

  const operator = buildMockAuth({
    linkedOrganisationId: organisationId
  }).credentials

  test("returns an operator's registration and its live accreditation", async ({
    msw
  }) => {
    const organisation = anOrganisation()
    msw.use(organisationHeld(organisation))

    await expect(
      fetchRegistrationAndAccreditationByNumber(
        organisationNumber,
        registrationNumber,
        operator
      )
    ).resolves.toStrictEqual({
      organisationData: organisation,
      registration,
      accreditation: liveAccreditation,
      rawAccreditation: liveAccreditation
    })
  })

  test('returns a cancelled accreditation as the raw record only', async ({
    msw
  }) => {
    const cancelled = { ...liveAccreditation, status: 'cancelled' }
    msw.use(organisationHeld(anOrganisation({ accreditations: [cancelled] })))

    await expect(
      fetchRegistrationAndAccreditationByNumber(
        organisationNumber,
        registrationNumber,
        operator
      )
    ).resolves.toMatchObject({
      accreditation: undefined,
      rawAccreditation: cancelled
    })
  })

  test("is 403 for another organisation's number", async ({ msw }) => {
    msw.use(organisationHeld(anOrganisation()))

    await expect(
      fetchRegistrationAndAccreditationByNumber(
        '500999',
        registrationNumber,
        operator
      )
    ).rejects.toMatchObject({
      output: { statusCode: statusCodes.forbidden },
      code: errorCodes.organisationForbidden
    })
  })

  test('is 404 for an unknown registration number', async ({ msw }) => {
    msw.use(organisationHeld(anOrganisation()))

    await expect(
      fetchRegistrationAndAccreditationByNumber(
        organisationNumber,
        'R25SR000000000PA',
        operator
      )
    ).rejects.toMatchObject({
      output: { statusCode: statusCodes.notFound },
      code: errorCodes.registrationNotFound
    })
  })

  test('is 404 for a registration number two registrations share', async ({
    msw
  }) => {
    msw.use(
      organisationHeld(
        anOrganisation({
          registrations: [registration, { id: 'reg-twin', registrationNumber }]
        })
      )
    )

    await expect(
      fetchRegistrationAndAccreditationByNumber(
        organisationNumber,
        registrationNumber,
        operator
      )
    ).rejects.toMatchObject({
      output: { statusCode: statusCodes.notFound },
      code: errorCodes.registrationNotFound
    })
  })

  describe('for a regulator', () => {
    const regulator = buildMockAuth({
      ...sessionIdentity(IDENTITIES.regulator)
    }).credentials

    beforeAll(() => {
      config.set('featureFlags.regulatorAccess', true)
    })

    afterAll(() => {
      config.set('featureFlags.regulatorAccess', false)
    })

    test('finds the organisation by search and returns the same result', async ({
      msw
    }) => {
      const organisation = anOrganisation()
      msw.use(
        http.get(`${backendUrl}/v1/organisations`, ({ request }) =>
          HttpResponse.json({
            items:
              new URL(request.url).searchParams.get('orgId') ===
              organisationNumber
                ? [{ id: organisationId, orgId: 500001 }]
                : [],
            page: 1,
            pageSize: 1
          })
        ),
        organisationHeld(organisation)
      )

      await expect(
        fetchRegistrationAndAccreditationByNumber(
          organisationNumber,
          registrationNumber,
          regulator
        )
      ).resolves.toStrictEqual({
        organisationData: organisation,
        registration,
        accreditation: liveAccreditation,
        rawAccreditation: liveAccreditation
      })
    })
  })
})
