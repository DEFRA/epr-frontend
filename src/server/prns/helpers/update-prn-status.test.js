import { describe, it, expect, vi, beforeEach } from 'vitest'

import { buildPrnResource } from '#server/common/test-helpers/prn-fixtures.js'
import { updatePrnStatus } from './update-prn-status.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')

describe(updatePrnStatus, () => {
  const keys = {
    organisationNumber: '500123',
    registrationNumber: 'R26EN0000000001PL',
    year: '2026'
  }
  const backendToken = 'test-token'
  const payload = { status: 'awaiting_acceptance' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the status to the note under its accreditation', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(buildPrnResource())

    await updatePrnStatus(keys, 'prn#789', payload, backendToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026/packaging-recycling-notes/prn%23789/status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${backendToken}`
        },
        body: JSON.stringify(payload)
      }
    )
  })

  it('resolves to the updated note in the page shape', async () => {
    vi.mocked(fetchJsonFromBackend).mockResolvedValue(
      buildPrnResource({
        status: { current: 'awaiting_acceptance', timeline: [] },
        prnNumber: 'ER2625001A'
      })
    )

    const result = await updatePrnStatus(keys, 'prn-789', payload, backendToken)

    expect(result).toMatchObject({
      id: 'prn-789',
      status: 'awaiting_acceptance',
      prnNumber: 'ER2625001A',
      material: 'plastic'
    })
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    vi.mocked(fetchJsonFromBackend).mockRejectedValue(
      new Error('Network error')
    )

    await expect(
      updatePrnStatus(keys, 'prn-789', payload, backendToken)
    ).rejects.toThrow('Network error')
  })
})
