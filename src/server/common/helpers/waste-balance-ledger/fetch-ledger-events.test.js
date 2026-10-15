import { config } from '#config/config.js'
import { test } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import {
  fetchLedgerEvents,
  fetchRegisteredOnlyLedgerEvents
} from './fetch-ledger-events.js'

const backendUrl = config.get('eprBackendUrl')
const backendToken = 'test-backend-token'

const organisationId = 'org-1'
const registrationId = 'reg-1'
const accreditationId = 'acc-1'

const accreditationPath = `${backendUrl}/v1/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/waste-balance-ledger`
const registeredOnlyPath = `${backendUrl}/v1/organisations/${organisationId}/registrations/${registrationId}/waste-balance-ledger`

/**
 * @param {unknown[]} events
 */
const ledgerOf = (events) => ({
  ledger: { organisationId, registrationId, accreditationId },
  events
})

describe(fetchLedgerEvents, () => {
  test('reads the ledger of the accreditation named in the address', async ({
    msw
  }) => {
    const events = [{ kind: 'prn-issued' }]

    msw.use(
      http.get(accreditationPath, () => HttpResponse.json(ledgerOf(events)))
    )

    await expect(
      fetchLedgerEvents({
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

    msw.use(
      http.get(registeredOnlyPath, () => HttpResponse.json(ledgerOf(events)))
    )

    await expect(
      fetchLedgerEvents({
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
        return HttpResponse.json(ledgerOf([]))
      })
    )

    await fetchLedgerEvents({
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

const keys = {
  organisationNumber: '500001',
  registrationNumber: 'R25/SR1',
  year: '2026'
}
const naturalRegistrationPath = `${backendUrl}/organisations/500001/registrations/R25%2FSR1`

describe(fetchRegisteredOnlyLedgerEvents, () => {
  test("reads the year's registered-only ledger with the session backend token", async ({
    msw
  }) => {
    const events = [{ kind: 'summary-log-submitted' }]
    /** @type {string | null | undefined} */
    let authorization

    msw.use(
      http.get(`${naturalRegistrationPath}/ledger/2026`, ({ request }) => {
        authorization = request.headers.get('authorization')
        return HttpResponse.json(ledgerOf(events))
      })
    )

    await expect(
      fetchRegisteredOnlyLedgerEvents(keys, backendToken)
    ).resolves.toStrictEqual(events)
    expect(authorization).toBe('Bearer test-backend-token')
  })
})
