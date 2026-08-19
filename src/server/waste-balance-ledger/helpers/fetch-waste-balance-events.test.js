import { config } from '#config/config.js'
import { test } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { fetchWasteBalanceEvents } from './fetch-waste-balance-events.js'

const backendUrl = config.get('eprBackendUrl')
const backendToken = 'test-backend-token'

const organisationId = 'org-1'
const registrationId = 'reg-1'
const accreditationId = 'acc-1'

const accreditationPath = `${backendUrl}/v1/admin/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/waste-balance-events`
const registeredOnlyPath = `${backendUrl}/v1/admin/organisations/${organisationId}/registrations/${registrationId}/waste-balance-events`

describe(fetchWasteBalanceEvents, () => {
  test('reads the ledger of the accreditation named in the address', async ({
    msw
  }) => {
    const events = [{ kind: 'prn-issued' }]

    msw.use(http.get(accreditationPath, () => HttpResponse.json(events)))

    await expect(
      fetchWasteBalanceEvents({
        organisationId,
        registrationId,
        accreditationId,
        backendToken
      })
    ).resolves.toStrictEqual(events)
  })

  test('reads the registered-only ledger where the address names no accreditation', async ({
    msw
  }) => {
    const events = [{ kind: 'summary-log-submitted' }]

    msw.use(http.get(registeredOnlyPath, () => HttpResponse.json(events)))

    await expect(
      fetchWasteBalanceEvents({
        organisationId,
        registrationId,
        accreditationId: undefined,
        backendToken
      })
    ).resolves.toStrictEqual(events)
  })

  test('authorises the call with the session backend token', async ({
    msw
  }) => {
    /** @type {Request | undefined} */
    let captured

    msw.use(
      http.get(accreditationPath, ({ request }) => {
        captured = request
        return HttpResponse.json([])
      })
    )

    await fetchWasteBalanceEvents({
      organisationId,
      registrationId,
      accreditationId,
      backendToken
    })

    expect(/** @type {Request} */ (captured).headers.get('authorization')).toBe(
      'Bearer test-backend-token'
    )
  })
})
