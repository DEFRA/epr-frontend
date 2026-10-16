import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { year } from '#server/common/helpers/year.js'
import { test } from '#vite/fixtures/server.js'

import { fetchOrganisation } from './fetch-organisation.js'

const backendUrl = config.get('eprBackendUrl')

const organisation = {
  organisationNumber: 50002,
  name: 'ACME ltd',
  registrations: {}
}

describe(fetchOrganisation, () => {
  test('returns the organisation from the backend', async ({ msw }) => {
    msw.use(
      http.get(`${backendUrl}/organisations/50002`, () =>
        HttpResponse.json(organisation)
      )
    )

    const result = await fetchOrganisation(
      organisationNumber(50002),
      'test-id-token'
    )

    expect(result).toStrictEqual(organisation)
  })

  test('asks for no year unless given one', async ({ msw }) => {
    let search
    msw.use(
      http.get(`${backendUrl}/organisations/50002`, ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json(organisation)
      })
    )

    await fetchOrganisation(organisationNumber(50002), 'test-id-token')

    expect(search).toBe('')
  })

  test('asks for the organisation as it stood in the year given', async ({
    msw
  }) => {
    let search
    msw.use(
      http.get(`${backendUrl}/organisations/50002`, ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json(organisation)
      })
    )

    await fetchOrganisation(organisationNumber(50002), 'test-id-token', {
      year: year(2026)
    })

    expect(search).toBe('?year=2026')
  })

  test('nests a flat status and statusTimeline as status.current and status.timeline', async ({
    msw
  }) => {
    const timeline = { '2026-01-01T00:00:00.000Z': { status: 'approved' } }
    msw.use(
      http.get(`${backendUrl}/organisations/50002`, () =>
        HttpResponse.json({
          ...organisation,
          registrations: {
            R25SR500000912PL: {
              material: 'plastic',
              status: 'approved',
              statusTimeline: timeline,
              accreditations: {
                2026: {
                  accreditationNumber: 'ACC-1',
                  status: 'approved',
                  statusTimeline: timeline
                }
              }
            }
          }
        })
      )
    )

    const result = await fetchOrganisation(
      organisationNumber(50002),
      'test-id-token'
    )

    expect(result.registrations).toStrictEqual({
      R25SR500000912PL: {
        material: 'plastic',
        status: { current: 'approved', timeline },
        accreditations: {
          2026: {
            accreditationNumber: 'ACC-1',
            status: { current: 'approved', timeline }
          }
        }
      }
    })
  })

  test('keeps a status already nested', async ({ msw }) => {
    const status = {
      current: 'approved',
      timeline: { '2026-01-01T00:00:00.000Z': { status: 'approved' } }
    }
    const registrations = {
      R25SR500000912PL: {
        material: 'plastic',
        status,
        accreditations: { 2026: { accreditationNumber: 'ACC-1', status } }
      }
    }
    msw.use(
      http.get(`${backendUrl}/organisations/50002`, () =>
        HttpResponse.json({ ...organisation, registrations })
      )
    )

    const result = await fetchOrganisation(
      organisationNumber(50002),
      'test-id-token'
    )

    expect(result.registrations).toStrictEqual(registrations)
  })

  test('sends the backend token as a bearer token', async ({ msw }) => {
    let authorization
    msw.use(
      http.get(`${backendUrl}/organisations/50002`, ({ request }) => {
        authorization = request.headers.get('Authorization')
        return HttpResponse.json(organisation)
      })
    )

    await fetchOrganisation(organisationNumber(50002), 'test-id-token')

    expect(authorization).toBe('Bearer test-id-token')
  })
})
