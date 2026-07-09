import { describe, expect, it, vi } from 'vitest'
import { asHapiRequest } from '#server/common/test-helpers/request-fixtures.js'
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
      asHapiRequest(mockRequest),
      mockOrganisations,
      {
        errors: {
          organisationId: {
            text: 'Select an organisation'
          },
          anotherField: {
            text: 'Another error'
          }
        }
      }
    )

    expect(result.errors).toStrictEqual({
      organisationId: {
        text: 'Select an organisation'
      },
      anotherField: {
        text: 'Another error'
      }
    })

    expect(result.errorSummary).toStrictEqual([
      {
        text: 'Select an organisation',
        href: '#organisationId'
      },
      {
        text: 'Another error',
        href: '#anotherField'
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
      asHapiRequest(mockRequest),
      mockOrganisations
    )

    expect(result.errors).toBeUndefined()
    expect(result.errorSummary).toBeUndefined()
  })
})
