import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { createPrn } from './create-prn.js'

describe(createPrn, () => {
  it('should post the payload to the accreditation the ids name and resolve to the created note', async ({
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
        return HttpResponse.json(
          { id: 'prn-1', status: 'draft' },
          { status: 201 }
        )
      })
    )

    const result = await createPrn(
      'org/1',
      'reg&2',
      'acc#3',
      payload,
      'a-token'
    )

    expect(result).toStrictEqual({ id: 'prn-1', status: 'draft' })
    expect(received).toStrictEqual([
      {
        pathname:
          '/v1/organisations/org%2F1/registrations/reg%262/accreditations/acc%233/packaging-recycling-notes',
        body: {
          issuedToOrganisation: { id: 'org-9', name: 'Radar Compliance PLC' },
          tonnage: 20
        }
      }
    ])
  })
})
