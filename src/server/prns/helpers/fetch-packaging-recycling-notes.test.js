import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { buildPrnResource } from '#server/common/test-helpers/prn-fixtures.js'
import { it } from '#vite/fixtures/server.js'

import { fetchPackagingRecyclingNotes } from './fetch-packaging-recycling-notes.js'

describe(fetchPackagingRecyclingNotes, () => {
  const keys = {
    organisationNumber: '500123',
    registrationNumber: 'R26/1',
    year: '2026'
  }

  it('should get the notes of the accreditation the keys name, in the page shape', async ({
    msw
  }) => {
    /** @type {{ authorization: string | null, pathname: string }[]} */
    const received = []
    msw.use(
      http.get(/packaging-recycling-notes$/, ({ request }) => {
        received.push({
          authorization: request.headers.get('authorization'),
          pathname: new URL(request.url).pathname
        })
        return HttpResponse.json({
          items: [
            buildPrnResource({
              id: 'prn-001',
              status: { current: 'awaiting_authorisation', timeline: [] }
            })
          ]
        })
      })
    )

    const result = await fetchPackagingRecyclingNotes(keys, 'a-token')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'prn-001',
      status: 'awaiting_authorisation',
      material: 'plastic',
      wasteProcessingType: 'reprocessor'
    })
    expect(received).toStrictEqual([
      {
        authorization: 'Bearer a-token',
        pathname:
          '/organisations/500123/registrations/R26%2F1/accreditations/2026/packaging-recycling-notes'
      }
    ])
  })

  it('should list the notes in the order they were raised', async ({ msw }) => {
    msw.use(
      http.get(/packaging-recycling-notes$/, () =>
        HttpResponse.json({
          items: [
            buildPrnResource({
              id: 'newer',
              createdAt: '2026-03-01T00:00:00.000Z'
            }),
            buildPrnResource({
              id: 'older',
              createdAt: '2026-02-01T00:00:00.000Z'
            })
          ]
        })
      )
    )

    const result = await fetchPackagingRecyclingNotes(keys, 'a-token')

    expect(result.map(({ id }) => id)).toStrictEqual(['older', 'newer'])
  })
})
