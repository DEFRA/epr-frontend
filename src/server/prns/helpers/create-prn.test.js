import { toYear } from '#server/common/helpers/year.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { buildPrnResource } from '#server/common/test-helpers/prn-fixtures.js'
import { it } from '#vite/fixtures/server.js'

import { createPrn } from './create-prn.js'

describe(createPrn, () => {
  it('should post the payload to the accreditation and resolve to the created note', async ({
    msw
  }) => {
    const payload = {
      issuedToOrganisation: { id: 'org-9', name: 'Radar Compliance PLC' },
      tonnage: 20
    }
    /** @type {{ pathname: string, body: unknown }[]} */
    const received = []
    msw.use(
      http.post(/packaging-recycling-notes$/, async ({ request }) => {
        received.push({
          pathname: new URL(request.url).pathname,
          body: await request.json()
        })
        return HttpResponse.json(buildPrnResource({ id: 'prn-1' }), {
          status: 201
        })
      })
    )

    const result = await createPrn(
      {
        organisationNumber: toOrganisationNumber('500123'),
        registrationNumber: toRegistrationNumber('R26EN0000000001PL'),
        year: toYear(2026)
      },
      payload,
      toBackendToken('a-token')
    )

    expect(result).toMatchObject({ id: 'prn-1', status: 'draft' })
    expect(received).toStrictEqual([
      {
        pathname:
          '/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026/packaging-recycling-notes',
        body: {
          issuedToOrganisation: { id: 'org-9', name: 'Radar Compliance PLC' },
          tonnage: 20
        }
      }
    ])
  })
})
