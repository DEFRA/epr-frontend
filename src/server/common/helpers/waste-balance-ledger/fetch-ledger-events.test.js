import { config } from '#config/config.js'
import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { test } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import {
  fetchAccreditationLedgerEvents,
  fetchRegisteredOnlyLedgerEvents
} from './fetch-ledger-events.js'

const backendUrl = config.get('eprBackendUrl')
const backendToken = toBackendToken('test-backend-token')

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
  test("reads the accreditation's ledger", async ({ msw }) => {
    const events = [{ kind: 'prn-issued' }]

    msw.use(
      http.get(`${naturalRegistrationPath}/accreditations/2026/ledger`, () =>
        HttpResponse.json(ledgerOf(events))
      )
    )

    await expect(
      fetchAccreditationLedgerEvents(keys, backendToken)
    ).resolves.toStrictEqual(events)
  })
})

describe(fetchRegisteredOnlyLedgerEvents, () => {
  test("reads the year's registered-only ledger", async ({ msw }) => {
    const events = [{ kind: 'summary-log-submitted' }]

    msw.use(
      http.get(`${naturalRegistrationPath}/ledger/2026`, () =>
        HttpResponse.json(ledgerOf(events))
      )
    )

    await expect(
      fetchRegisteredOnlyLedgerEvents(keys, backendToken)
    ).resolves.toStrictEqual(events)
  })
})
