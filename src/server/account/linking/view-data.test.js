import { describe, expect, it, vi } from 'vitest'
import { mockHapiRequest } from '#server/common/test-helpers/request-fixtures.js'
import { buildLinkingViewData } from './view-data.js'

describe(buildLinkingViewData, () => {
  it('should include errors and error summary when provided', () => {
    const mockRequest = {
      t: vi.fn((key) => `translated:${key}`)
    }

    const mockOrganisations = {
      current: {
        id: 'defra-org-123',
        name: 'Test Organisation'
      },
      linked: null,
      unlinked: []
    }

    const result = buildLinkingViewData(
      mockHapiRequest(mockRequest),
      mockOrganisations,
      {
        errors: {
          organisationNumber: {
            text: 'Select an organisation'
          },
          anotherField: {
            text: 'Another error'
          }
        }
      }
    )

    expect(result.errors).toStrictEqual({
      organisationNumber: {
        text: 'Select an organisation'
      },
      anotherField: {
        text: 'Another error'
      }
    })

    expect(result.errorSummary).toStrictEqual([
      {
        text: 'Select an organisation',
        href: '#organisationNumber'
      },
      {
        text: 'Another error',
        href: '#anotherField'
      }
    ])
  })

  it('should carry the organisation number and reference number on each unlinked entry', () => {
    const mockRequest = {
      t: vi.fn((key) => `translated:${key}`)
    }

    const result = buildLinkingViewData(mockHapiRequest(mockRequest), {
      current: { id: 'defra-org-123', name: 'Test Organisation' },
      linked: null,
      unlinked: [
        {
          id: 'org-1',
          name: 'First Company',
          orgId: 'FC111111',
          referenceNumber: 'org-1'
        }
      ]
    })

    expect(result.unlinked).toStrictEqual([
      {
        displayName: 'First Company (ID: FC111111)',
        name: 'First Company',
        organisationNumber: 'FC111111',
        referenceNumber: 'org-1'
      }
    ])
  })

  it('should not include errors when not provided', () => {
    const mockRequest = {
      t: vi.fn((key) => `translated:${key}`)
    }

    const mockOrganisations = {
      current: {
        id: 'defra-org-123',
        name: 'Test Organisation'
      },
      linked: null,
      unlinked: []
    }

    const result = buildLinkingViewData(
      mockHapiRequest(mockRequest),
      mockOrganisations
    )

    expect(result.errors).toBeUndefined()
    expect(result.errorSummary).toBeUndefined()
  })
})
