import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { fetchPackagingRecyclingNotes } from './fetch-packaging-recycling-notes.js'

describe(fetchPackagingRecyclingNotes, () => {
  it('should get the notes of the accreditation the ids name and resolve to them', async ({
    msw
  }) => {
    const notes = [
      {
        id: 'prn-1',
        issuedToOrganisation: { id: 'org-9', name: 'Radar Compliance PLC' },
        tonnage: 100,
        status: 'awaiting_authorisation'
      }
    ]
    /** @type {string[]} */
    const pathnames = []
    msw.use(
      http.get(/packaging-recycling-notes$/, ({ request }) => {
        pathnames.push(new URL(request.url).pathname)
        return HttpResponse.json(notes)
      })
    )

    const result = await fetchPackagingRecyclingNotes(
      'org/1',
      'reg&2',
      'acc#3',
      'a-token'
    )

    expect(result).toStrictEqual([
      {
        id: 'prn-1',
        issuedToOrganisation: { id: 'org-9', name: 'Radar Compliance PLC' },
        tonnage: 100,
        status: 'awaiting_authorisation'
      }
    ])
    expect(pathnames).toStrictEqual([
      '/v1/organisations/org%2F1/registrations/reg%262/accreditations/acc%233/packaging-recycling-notes'
    ])
  })
})
