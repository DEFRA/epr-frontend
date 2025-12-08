import { describe, expect, it, vi } from 'vitest'
import { buildLinkingViewData } from './view-data.js'

describe(buildLinkingViewData, () => {
  it('should build view data with organisations', () => {
    const mockRequest = {
      t: vi.fn((key) => `translated:${key}`)
    }

    const mockAuthedUser = {
      displayName: 'Test User',
      organisations: {
        unlinked: [
          {
            id: 'org-1',
            companyDetails: {
              tradingName: 'Company One'
            }
          },
          {
            id: 'org-2',
            companyDetails: {
              tradingName: 'Company Two'
            }
          }
        ]
      }
    }

    const result = buildLinkingViewData(mockRequest, mockAuthedUser)

    expect(result).toStrictEqual({
      pageTitle: 'translated:account:linking:pageTitle',
      session: mockAuthedUser,
      unlinked: [
        {
          id: 'org-1',
          companyDetails: {
            tradingName: 'Company One'
          }
        },
        {
          id: 'org-2',
          companyDetails: {
            tradingName: 'Company Two'
          }
        }
      ],
      organisationName: '[PLACEHOLDER] Gaskells Waste Services'
    })
  })

  it('should handle null authedUser', () => {
    const mockRequest = {
      t: vi.fn((key) => `translated:${key}`)
    }

    const result = buildLinkingViewData(mockRequest, null)

    expect(result).toStrictEqual({
      pageTitle: 'translated:account:linking:pageTitle',
      session: null,
      unlinked: [],
      organisationName: '[PLACEHOLDER] Gaskells Waste Services'
    })
  })

  it('should handle authedUser with no organisations', () => {
    const mockRequest = {
      t: vi.fn((key) => `translated:${key}`)
    }

    const mockAuthedUser = {
      displayName: 'Test User'
    }

    const result = buildLinkingViewData(mockRequest, mockAuthedUser)

    expect(result).toStrictEqual({
      pageTitle: 'translated:account:linking:pageTitle',
      session: mockAuthedUser,
      unlinked: [],
      organisationName: '[PLACEHOLDER] Gaskells Waste Services'
    })
  })

  it('should include errors when provided', () => {
    const mockRequest = {
      t: vi.fn((key) => `translated:${key}`)
    }

    const mockAuthedUser = {
      organisations: {
        unlinked: []
      }
    }

    const result = buildLinkingViewData(mockRequest, mockAuthedUser, {
      errors: {
        organisationId: {
          text: 'Select an organisation'
        },
        anotherField: {
          text: 'Another error'
        }
      }
    })

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

    const mockAuthedUser = {
      organisations: {
        unlinked: []
      }
    }

    const result = buildLinkingViewData(mockRequest, mockAuthedUser)

    expect(result.errors).toBeUndefined()
    expect(result.errorSummary).toBeUndefined()
  })
})
