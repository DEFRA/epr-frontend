import { afterAll, describe, expect, test, vi } from 'vitest'
import { fetchWasteOrganisations } from './fetch-waste-organisations.js'
import { config } from '#config/config.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('fetchWasteOrganisation()', () => {
  afterAll(() => {
    config.reset('isDevelopment')
    config.reset('wasteOrganisationsApi.key')
  })

  test('returns waste organisations (producers)', async () => {
    const data = {
      organisations: [
        {
          id: '46d4e28f-3f34-4a5a-a729-a4690e23ebab',
          name: 'Test Packaging Corp',
          tradingName: 'Test Pack',
          businessCountry: 'GB-ENG',
          companieHouseNumber: '06191086',
          address: {
            addressLine1: 'Test Lane',
            addressLine2: 'Nursling',
            town: 'Southampton',
            county: 'Hampshire',
            postcode: 'SO16 9JW',
            country: 'United Kingdom'
          },
          registrations: [
            {
              status: 'REGISTERED',
              type: 'LARGE_PRODUCER',
              registrationYear: '2026'
            }
          ]
        }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(data)
    })

    const response = await fetchWasteOrganisations()

    expect(response).toStrictEqual(data)
    expect(mockFetch.mock.calls).toStrictEqual([
      [
        'https://{env-path}/waste-organisations/organisations?registrations=LARGE_PRODUCER%2CCOMPLIANCE_SCHEME&registrationYears=2026&statuses=REGISTERED',
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: 'Basic Og=='
          }
        }
      ]
    ])
  })

  test('uses x-api-key header in development', async () => {
    config.set('isDevelopment', true)
    config.set('wasteOrganisationsApi.key', 'let-me-in')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchWasteOrganisations()

    expect(mockFetch.mock.calls).toStrictEqual([
      [
        'https://{env-path}/waste-organisations/organisations?registrations=LARGE_PRODUCER%2CCOMPLIANCE_SCHEME&registrationYears=2026&statuses=REGISTERED',
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: 'Basic Og==',
            'x-api-key': 'let-me-in'
          }
        }
      ]
    ])
  })
})
