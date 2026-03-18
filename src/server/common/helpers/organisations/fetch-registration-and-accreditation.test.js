import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { fetchRegistrationAndAccreditation } from './fetch-registration-and-accreditation.js'

const backendUrl = config.get('eprBackendUrl')

describe(fetchRegistrationAndAccreditation, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const accreditationId = 'acc-789'
  const idToken = 'test-id-token'

  test('returns organisation data, registration and accreditation when all exist', async ({
    msw
  }) => {
    const mockOrganisationData = {
      id: organisationId,
      registrations: [{ id: registrationId, accreditationId }],
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
      idToken
    )

    expect(result).toStrictEqual({
      organisationData: mockOrganisationData,
      registration: { id: registrationId, accreditationId },
      accreditation: {
        id: accreditationId,
        accreditationNumber: 'ACC-2025-001'
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
      fetchRegistrationAndAccreditation(organisationId, registrationId, idToken)
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
      idToken
    )

    expect(result).toStrictEqual({
      organisationData: mockOrganisationData,
      registration: { id: registrationId },
      accreditation: undefined
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
      idToken
    )

    expect(result).toStrictEqual({
      organisationData: mockOrganisationData,
      registration: { id: registrationId, accreditationId: 'non-existent-acc' },
      accreditation: undefined
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
      fetchRegistrationAndAccreditation(organisationId, registrationId, idToken)
    ).rejects.toMatchObject({ isBoom: true, output: { statusCode: 404 } })
  })

  test('passes correct parameters to fetchOrganisationById', async ({
    msw
  }) => {
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
      idToken
    )

    expect(capturedRequest.headers.get('authorization')).toBe(
      'Bearer test-id-token'
    )
  })

  test('propagates errors from fetchOrganisationById', async ({ msw }) => {
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123`,
        () => new HttpResponse(null, { status: 404, statusText: 'Not Found' })
      )
    )

    await expect(
      fetchRegistrationAndAccreditation(organisationId, registrationId, idToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })
})
