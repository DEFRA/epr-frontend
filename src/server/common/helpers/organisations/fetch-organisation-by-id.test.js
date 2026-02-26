import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { fetchOrganisationById } from './fetch-organisation-by-id.js'

const backendUrl = config.get('eprBackendUrl')

describe(fetchOrganisationById, () => {
  const organisationId = 'org-123'
  const idToken = 'test-id-token'

  test('returns organisation data when backend responds successfully', async ({
    msw
  }) => {
    const mockOrganisationData = {
      orgId: organisationId,
      companyDetails: {
        tradingName: 'Test Company'
      },
      accreditations: [],
      registrations: []
    }

    msw.use(
      http.get(`${backendUrl}/v1/organisations/org-123`, () =>
        HttpResponse.json(mockOrganisationData)
      )
    )

    const result = await fetchOrganisationById(organisationId, idToken)

    expect(result).toStrictEqual(mockOrganisationData)
  })

  test('calls backend with correct path including organisation ID', async ({
    msw
  }) => {
    let capturedUrl
    msw.use(
      http.get(`${backendUrl}/v1/organisations/org-123`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({})
      })
    )

    await fetchOrganisationById(organisationId, idToken)

    expect(capturedUrl).toMatch(/\/v1\/organisations\/org-123$/)
  })

  test('includes Authorization header with Bearer token', async ({ msw }) => {
    let capturedRequest
    msw.use(
      http.get(`${backendUrl}/v1/organisations/org-123`, ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({})
      })
    )

    await fetchOrganisationById(organisationId, idToken)

    expect(capturedRequest.headers.get('content-type')).toBe('application/json')
    expect(capturedRequest.headers.get('authorization')).toBe(
      'Bearer test-id-token'
    )
  })

  test('throws Boom notFound error when backend returns 404', async ({
    msw
  }) => {
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123`,
        () => new HttpResponse(null, { status: 404, statusText: 'Not Found' })
      )
    )

    await expect(
      fetchOrganisationById(organisationId, idToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  test('throws Boom error when backend returns 500', async ({ msw }) => {
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123`,
        () =>
          new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error'
          })
      )
    )

    await expect(
      fetchOrganisationById(organisationId, idToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
