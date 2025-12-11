import * as fetchUserOrganisationsModule from '#server/auth/helpers/fetch-user-organisations.js'
import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import { describe, expect, it, vi } from 'vitest'
import { provideUserOrganisations } from './provide-user-organisations.js'

vi.mock(import('#server/auth/helpers/get-user-session.js'))
vi.mock(import('#server/auth/helpers/fetch-user-organisations.js'))

describe(provideUserOrganisations, () => {
  it('should fetch and return organisations when session exists', async () => {
    const mockOrganisations = {
      current: {
        id: 'defra-org-123',
        name: 'Test Organisation'
      },
      linked: null,
      unlinked: []
    }

    vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
      ok: true,
      value: {
        idToken: 'mock-id-token'
      }
    })

    vi.mocked(
      fetchUserOrganisationsModule.fetchUserOrganisations
    ).mockResolvedValue(mockOrganisations)

    const mockRequest = {}

    const result = await provideUserOrganisations.method(mockRequest)

    expect(getUserSessionModule.getUserSession).toHaveBeenCalledExactlyOnceWith(
      mockRequest
    )
    expect(
      fetchUserOrganisationsModule.fetchUserOrganisations
    ).toHaveBeenCalledExactlyOnceWith('mock-id-token')
    expect(result).toStrictEqual(mockOrganisations)
  })

  it('should return null when session does not exist', async () => {
    vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
      ok: true,
      value: null
    })

    const mockRequest = {}

    const result = await provideUserOrganisations.method(mockRequest)

    expect(getUserSessionModule.getUserSession).toHaveBeenCalledExactlyOnceWith(
      mockRequest
    )
    expect(
      fetchUserOrganisationsModule.fetchUserOrganisations
    ).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('should return null when getUserSession returns error', async () => {
    vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
      ok: false
    })

    const mockRequest = {}

    const result = await provideUserOrganisations.method(mockRequest)

    expect(getUserSessionModule.getUserSession).toHaveBeenCalledExactlyOnceWith(
      mockRequest
    )
    expect(
      fetchUserOrganisationsModule.fetchUserOrganisations
    ).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('should have userOrganisations as assign property', () => {
    expect(provideUserOrganisations.assign).toBe('userOrganisations')
  })
})
