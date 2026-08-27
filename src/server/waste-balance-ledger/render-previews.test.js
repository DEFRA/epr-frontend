import { writeFileSync } from 'node:fs'

import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { findRegistrationAndAccreditation } from '#server/common/test-helpers/organisation-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, beforeEach, describe, vi } from 'vitest'

import fixtureData from '../../../fixtures/organisation/organisationData.json' with { type: 'json' }

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)

const backendUrl = config.get('eprBackendUrl')

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001-glass-approved'
const accreditationId = 'acc-001-glass-approved'

const base = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`
const ledgerUrl = `${backendUrl}/v1${base}/waste-balance-ledger`

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'regulator@example.com' },
  backendToken: 'regulator-backend-token',
  ...sessionIdentity(IDENTITIES.regulator)
})

const priya = {
  id: '01JB4KQ7WZ8V3N5X',
  name: 'Priya Shah',
  email: 'priya.shah@kirkbyplastics.example.com'
}
const sam = {
  id: '01JB4KQ8XA9W4P6Y',
  name: 'Sam Okafor',
  email: 'sam.okafor@environment-agency.gov.uk'
}
const backfill = { id: 'system', name: 'backfill' }

const noteA = { id: '01JC7MB2QK4T8H1D', prnNumber: '240000123' }
const noteB = { id: '01JC7MB3RL5U9J2E', prnNumber: null }

/** @param {object} p */
const balance = ({ from, to }) => ({
  opening: { total: from[0], available: from[1] },
  closing: { total: to[0], available: to[1] }
})

const events = [
  {
    number: 1,
    kind: 'summary-log-submitted',
    createdAt: '2026-02-27T15:20:00.000Z',
    createdBy: backfill,
    summaryLog: { id: '01JD2PC4TN6W2K3F', creditTotal: 150 },
    balance: balance({ from: [0, 0], to: [150, 150] })
  },
  {
    number: 2,
    kind: 'summary-log-submitted',
    createdAt: '2026-03-02T10:30:00.000Z',
    createdBy: priya,
    summaryLog: { id: '01JD2PC5UP7X3L4G', creditTotal: 200 },
    balance: balance({ from: [150, 150], to: [200, 200] })
  },
  {
    number: 3,
    kind: 'prn-created',
    createdAt: '2026-03-04T09:12:00.000Z',
    createdBy: priya,
    prn: { ...noteA, tonnage: 25 },
    balance: balance({ from: [200, 200], to: [200, 175] })
  },
  {
    number: 4,
    kind: 'prn-issued',
    createdAt: '2026-03-05T11:30:00.000Z',
    createdBy: priya,
    prn: { ...noteA, tonnage: 25 },
    balance: balance({ from: [200, 175], to: [175, 175] })
  },
  {
    number: 5,
    kind: 'prn-accepted',
    createdAt: '2026-03-06T09:40:00.000Z',
    createdBy: backfill,
    prn: { ...noteA, tonnage: 25 },
    balance: balance({ from: [175, 175], to: [175, 175] })
  },
  {
    number: 6,
    kind: 'prn-created',
    createdAt: '2026-03-08T11:02:00.000Z',
    createdBy: priya,
    prn: { ...noteB, tonnage: 40 },
    balance: balance({ from: [175, 175], to: [175, 135] })
  },
  {
    number: 7,
    kind: 'prn-creation-cancelled',
    createdAt: '2026-03-09T14:15:00.000Z',
    createdBy: priya,
    prn: { ...noteB, tonnage: 40 },
    balance: balance({ from: [175, 135], to: [175, 175] })
  },
  {
    number: 8,
    kind: 'summary-log-submitted',
    createdAt: '2026-03-10T08:05:00.000Z',
    createdBy: priya,
    summaryLog: { id: '01JD2PC6VQ8Y4M5H', creditTotal: 200 },
    balance: balance({ from: [175, 175], to: [175, 175] })
  },
  {
    number: 9,
    kind: 'prn-cancelled-after-issue',
    createdAt: '2026-03-12T16:45:00.000Z',
    createdBy: sam,
    prn: { ...noteA, tonnage: 25 },
    balance: balance({ from: [175, 175], to: [200, 200] })
  }
]

describe('ledger design previews', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  beforeEach(() => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      findRegistrationAndAccreditation(fixtureData, registrationId)
    )
  })

  it('dumps the three views', async ({ msw, server }) => {
    msw.use(
      http.get(ledgerUrl, () =>
        HttpResponse.json({
          ledger: { organisationId, registrationId, accreditationId },
          events
        })
      )
    )

    const render = async (/** @type {string} */ url) => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url,
        auth: regulator
      })
      // eslint-disable-next-line no-console
      console.log(url, statusCode)
      return result
    }

    writeFileSync(
      '/tmp/ledger-overview.html',
      await render(`${base}/ledger-overview`)
    )
    writeFileSync(
      '/tmp/ledger-all-events.html',
      await render(`${base}/waste-balance-ledger/all`)
    )
    writeFileSync(
      '/tmp/ledger-event.html',
      await render(`${base}/waste-balance-ledger/events/4`)
    )
  })
})
