import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { fetchOrganisationRegistrations } from './fetch-organisation-registrations.js'

const backendUrl = config.get('eprBackendUrl')

describe(fetchOrganisationRegistrations, () => {
  const organisationId = 'org-123'
  const backendToken = 'test-id-token'

  test('answers the registrations the collection holds', async ({ msw }) => {
    const registrations = [{ id: 'reg-001' }, { id: 'reg-002' }]

    msw.use(
      http.get(`${backendUrl}/v1/organisations/org-123/registrations`, () =>
        HttpResponse.json({ registrations })
      )
    )

    await expect(
      fetchOrganisationRegistrations(organisationId, backendToken)
    ).resolves.toStrictEqual(registrations)
  })

  test('reads the collection as the token bearer', async ({ msw }) => {
    /** @type {Request | undefined} */
    let capturedRequest

    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/registrations`,
        ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({ registrations: [] })
        }
      )
    )

    await fetchOrganisationRegistrations(organisationId, backendToken)

    const request = /** @type {Request} */ (capturedRequest)

    expect(request.headers.get('authorization')).toBe('Bearer test-id-token')
  })
})
