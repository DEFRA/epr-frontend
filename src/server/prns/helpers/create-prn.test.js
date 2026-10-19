import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

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
        organisationNumber: '500123',
        registrationNumber: 'R26EN0000000001PL',
        year: '2026'
      },
      payload,
      'a-token'
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
