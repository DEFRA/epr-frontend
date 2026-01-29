import { beforeEach, describe, expect, test, vi } from 'vitest'

import { fetchPackagingRecyclingNotes } from './fetch-packaging-recycling-notes.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const MOCK_TRACE_ID = 'mock-trace-id-1'

vi.mock(import('@defra/hapi-tracing'), () => ({
  withTraceId: vi.fn((headerName, headers = {}) => {
    headers[headerName] = MOCK_TRACE_ID
    return headers
  }),
  tracing: {
    plugin: {}
  }
}))

describe(fetchPackagingRecyclingNotes, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const idToken = 'test-id-token'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns packaging recycling notes when backend responds successfully', async () => {
    const mockPrnData = [
      {
        id: 'prn-001',
        issuedToOrganisation: 'Acme Ltd',
        tonnage: 100,
        material: 'plastic',
        status: 'awaiting_authorisation',
        createdAt: '2026-01-15T10:00:00.000Z'
      }
    ]

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockPrnData)
    })

    const result = await fetchPackagingRecyclingNotes(
      organisationId,
      registrationId,
      idToken
    )

    expect(result).toStrictEqual(mockPrnData)
  })

  test('calls backend with correct path including organisation and registration IDs', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([])
    })

    await fetchPackagingRecyclingNotes(organisationId, registrationId, idToken)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/v1\/organisations\/org-123\/registrations\/reg-456\/packaging-recycling-notes$/
      ),
      expect.any(Object)
    )
  })

  test('includes Authorization and tracing headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([])
    })

    await fetchPackagingRecyclingNotes(organisationId, registrationId, idToken)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-id-token',
          'x-cdp-request-id': MOCK_TRACE_ID
        }
      })
    )
  })

  test('encodes URL path parameters with special characters', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([])
    })

    await fetchPackagingRecyclingNotes('org/123', 'reg&456', idToken)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('organisations/org%2F123/registrations/reg%26456'),
      expect.any(Object)
    )
  })

  test('throws Boom error when backend returns 500', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map()
    })

    await expect(
      fetchPackagingRecyclingNotes(organisationId, registrationId, idToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })

  test('throws Boom error when backend returns 404', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map()
    })

    await expect(
      fetchPackagingRecyclingNotes(organisationId, registrationId, idToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })
})
