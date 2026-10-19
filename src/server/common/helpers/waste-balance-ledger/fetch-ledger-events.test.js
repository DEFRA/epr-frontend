import { config } from '#config/config.js'
import { test } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import {
  fetchAccreditationLedgerEvents,
  fetchRegisteredOnlyLedgerEvents
} from './fetch-ledger-events.js'

const backendUrl = config.get('eprBackendUrl')
const backendToken = 'test-backend-token'

/**
 * @param {unknown[]} events
 */
const ledgerOf = (events) => ({
  ledger: { organisationId: 'org-1', registrationId: 'reg-1' },
  events
})

const keys = {
  organisationNumber: '500001',
  registrationNumber: 'R25/SR1',
  year: '2026'
}
const naturalRegistrationPath = `${backendUrl}/organisations/500001/registrations/R25%2FSR1`

describe(fetchAccreditationLedgerEvents, () => {
  test("reads the accreditation's ledger with the session backend token", async ({
    msw
  }) => {
    const events = [{ kind: 'prn-issued' }]
    /** @type {string | null | undefined} */
    let authorization

    msw.use(
      http.get(
        `${naturalRegistrationPath}/accreditations/2026/ledger`,
        ({ request }) => {
          authorization = request.headers.get('authorization')
          return HttpResponse.json(ledgerOf(events))
        }
      )
    )

    await expect(
      fetchAccreditationLedgerEvents(keys, backendToken)
    ).resolves.toStrictEqual(events)
    expect(authorization).toBe('Bearer test-backend-token')
  })
})

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
