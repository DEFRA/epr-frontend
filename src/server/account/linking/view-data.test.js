import { describe, expect, it, vi } from 'vitest'
import { buildLinkingViewData } from './view-data.js'

describe(buildLinkingViewData, () => {
  it('should build view data with current organisation and unlinked organisations', () => {
    const mockRequest = {
      t: vi.fn((key) => `translated:${key}`)
    }

    const mockOrganisations = {
      current: {
        id: 'defra-org-123',
        name: 'Test Defra Organisation'
      },
      linked: null,
      unlinked: [
        {
          id: 'org-1',
          name: 'Company One Ltd',
          orgId: '12345678'
        },
        {
          id: 'org-2',
          name: 'Company Two Ltd',
          orgId: '87654321'
        }
      ]
    }

    const result = buildLinkingViewData(mockRequest, mockOrganisations)

    expect(result.pageTitle).toBe('translated:account:linking:pageTitle')
    expect(result.unlinked).toStrictEqual([
      {
        id: 'org-1',
        displayName: 'Company One Ltd (ID: 12345678)',
        name: 'Company One Ltd'
      },
      {
        id: 'org-2',
        displayName: 'Company Two Ltd (ID: 87654321)',
        name: 'Company Two Ltd'
      }
    ])
    expect(result.organisationName).toBe('Test Defra Organisation')
    expect(result.troubleshooting).toBeDefined()
    expect(result.troubleshooting.summary).toBe(
      'translated:account:linking:troubleshooting:summary'
    )
    expect(result.troubleshooting.unlinkedOrganisations).toHaveLength(2)
    expect(result.troubleshooting.unlinkedOrganisations[0].name).toBe(
      'Company One Ltd'
    )
    expect(result.troubleshooting.unlinkedOrganisations[1].name).toBe(
      'Company Two Ltd'
    )
  })

  it('should format unlinked organisations with org-id in display-name', () => {
    const mockRequest = {
      t: vi.fn((key) => `translated:${key}`)
    }

    const mockOrganisations = {
      current: {
        id: 'defra-org-123',
        name: 'Current Org'
      },
      linked: null,
      unlinked: [
        {
          id: 'org-1',
          name: 'Waste Services Ltd',
          orgId: 'WS123456'
        }
      ]
    }

    const result = buildLinkingViewData(mockRequest, mockOrganisations)

    expect(result.unlinked).toStrictEqual([
      {
        id: 'org-1',
        displayName: 'Waste Services Ltd (ID: WS123456)',
        name: 'Waste Services Ltd'
      }
    ])
  })

  it('should handle empty unlinked organisations list', () => {
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

    const result = buildLinkingViewData(mockRequest, mockOrganisations)

    expect(result.unlinked).toStrictEqual([])
    expect(result.organisationName).toBe('Test Organisation')
  })

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

    const result = buildLinkingViewData(mockRequest, mockOrganisations, {
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

    const mockOrganisations = {
      current: {
        id: 'defra-org-123',
        name: 'Test Organisation'
      },
      linked: null,
      unlinked: []
    }

    const result = buildLinkingViewData(mockRequest, mockOrganisations)

    expect(result.errors).toBeUndefined()
    expect(result.errorSummary).toBeUndefined()
  })

  it('should use current organisation name from Defra ID token', () => {
    const mockRequest = {
      t: vi.fn((key) => `translated:${key}`)
    }

    const mockOrganisations = {
      current: {
        id: 'defra-org-uuid',
        name: 'My Defra Organisation Name'
      },
      linked: null,
      unlinked: []
    }

    const result = buildLinkingViewData(mockRequest, mockOrganisations)

    expect(result.organisationName).toBe('My Defra Organisation Name')
  })

  it('should handle multiple unlinked organisations with different data', () => {
    const mockRequest = {
      t: vi.fn((key) => `translated:${key}`)
    }

    const mockOrganisations = {
      current: {
        id: 'defra-org-123',
        name: 'Current Org'
      },
      linked: null,
      unlinked: [
        {
          id: 'org-1',
          name: 'First Company',
          orgId: 'FC111111'
        },
        {
          id: 'org-2',
          name: 'Second Company',
          orgId: 'SC222222'
        },
        {
          id: 'org-3',
          name: 'Third Company',
          orgId: 'TC333333'
        }
      ]
    }

    const result = buildLinkingViewData(mockRequest, mockOrganisations)

    expect(result.unlinked).toHaveLength(3)
    expect(result.unlinked[0].displayName).toBe('First Company (ID: FC111111)')
    expect(result.unlinked[1].displayName).toBe('Second Company (ID: SC222222)')
    expect(result.unlinked[2].displayName).toBe('Third Company (ID: TC333333)')
  })

  it('should sort unlinked organisations alphabetically by name', () => {
    const mockRequest = {
      t: vi.fn((key) => `translated:${key}`)
    }

    const mockOrganisations = {
      current: {
        id: 'defra-org-123',
        name: 'Current Org'
      },
      linked: null,
      unlinked: [
        {
          id: 'org-1',
          name: 'Zebra Waste Ltd',
          orgId: 'ZW111111'
        },
        {
          id: 'org-2',
          name: 'Alpha Recycling Ltd',
          orgId: 'AR222222'
        },
        {
          id: 'org-3',
          name: 'Mike Services Ltd',
          orgId: 'MS333333'
        }
      ]
    }

    const result = buildLinkingViewData(mockRequest, mockOrganisations)

    expect(result.unlinked[0].displayName).toBe(
      'Alpha Recycling Ltd (ID: AR222222)'
    )
    expect(result.unlinked[1].displayName).toBe(
      'Mike Services Ltd (ID: MS333333)'
    )
    expect(result.unlinked[2].displayName).toBe(
      'Zebra Waste Ltd (ID: ZW111111)'
    )
  })

  it('should build troubleshooting content with localised strings', () => {
    const mockRequest = {
      t: vi.fn((key) => `translated:${key}`)
    }

    const mockOrganisations = {
      current: {
        id: 'defra-org-123',
        name: 'Test Organisation'
      },
      linked: null,
      unlinked: [
        {
          id: 'org-1',
          name: 'Test Company Ltd',
          orgId: 'TC123456'
        }
      ]
    }

    const result = buildLinkingViewData(mockRequest, mockOrganisations)

    expect(result.troubleshooting).toBeDefined()
    expect(result.troubleshooting.summary).toBe(
      'translated:account:linking:troubleshooting:summary'
    )
    expect(result.troubleshooting.missing.heading).toBe(
      'translated:account:linking:troubleshooting:missingHeading'
    )
    expect(result.troubleshooting.missing.bodyOne).toBe(
      'translated:account:linking:troubleshooting:missingBodyOne'
    )
    expect(result.troubleshooting.missing.bodyTwo).toBe(
      'translated:account:linking:troubleshooting:missingBodyTwo'
    )
    expect(result.troubleshooting.otherProblems.heading).toBe(
      'translated:account:linking:troubleshooting:otherProblemsHeading'
    )
    expect(result.troubleshooting.otherProblems.bodyOne).toBe(
      'translated:account:linking:troubleshooting:otherProblemsBodyOne'
    )
    expect(result.troubleshooting.otherProblems.email).toBe(
      'translated:account:linking:troubleshooting:otherProblemsEmail'
    )
    expect(result.troubleshooting.unlinkedOrganisations).toHaveLength(1)
    expect(result.troubleshooting.unlinkedOrganisations[0]).toStrictEqual({
      id: 'org-1',
      displayName: 'Test Company Ltd (ID: TC123456)',
      name: 'Test Company Ltd'
    })
  })
})
