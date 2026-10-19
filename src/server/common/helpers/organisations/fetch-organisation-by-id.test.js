import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { it } from '#vite/fixtures/server.js'

import { fetchOrganisationById } from './fetch-organisation-by-id.js'

describe(fetchOrganisationById, () => {
  it('should get the organisation the id names and resolve to it', async ({
    msw
  }) => {
    const organisation = {
      id: 'org/1',
      orgId: 50001,
      accreditations: [],
      registrations: []
    }
    /** @type {string[]} */
    const pathnames = []
    msw.use(
      http.get(/\/v1\/organisations\/[^/]+$/, ({ request }) => {
        pathnames.push(new URL(request.url).pathname)
        return HttpResponse.json(organisation)
      })
    )

    const result = await fetchOrganisationById('org/1', 'a-token')

    expect(result).toStrictEqual({
      id: 'org/1',
      orgId: 50001,
      accreditations: [],
      registrations: []
    })
    expect(pathnames).toStrictEqual(['/v1/organisations/org%2F1'])
  })
})
