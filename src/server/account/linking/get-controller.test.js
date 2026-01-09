import { describe, expect, it, vi } from 'vitest'
import { controller } from './controller.js'

describe('account linking GET controller', () => {
  describe('when user has unlinked organisations', () => {
    it('should render linking page with organisation radio buttons including companies house numbers', () => {
      const mockOrganisations = {
        current: {
          id: 'defra-org-123',
          name: 'My Defra Organisation',
          relationshipId: 'rel-456'
        },
        linked: null,
        unlinked: [
          {
            id: 'org-1',
            name: 'Test Company Ltd',
            orgId: '12345678'
          },
          {
            id: 'org-2',
            name: 'Another Company Ltd',
            orgId: '87654321'
          }
        ]
      }

      const mockRequest = {
        pre: {
          userOrganisations: mockOrganisations
        },
        t: vi.fn((key) => {
          const translations = {
            'account:linking:pageTitle': 'Link Organisation',
            'account:linking:legend':
              'Select the organisation you want to link to {{organisationName}}',
            'account:linking:submitButton': 'Confirm'
          }
          return translations[key] || key
        })
      }

      const mockView = vi.fn().mockReturnValue('view-response')
      const mockH = {
        view: mockView
      }

      const result = controller.handler(mockRequest, mockH)

      expect(mockView).toHaveBeenCalledWith(
        'account/linking/index',
        expect.objectContaining({
          pageTitle: 'Link Organisation',
          unlinked: [
            {
              id: 'org-2',
              displayName: 'Another Company Ltd (ID: 87654321)',
              name: 'Another Company Ltd'
            },
            {
              id: 'org-1',
              displayName: 'Test Company Ltd (ID: 12345678)',
              name: 'Test Company Ltd'
            }
          ],
          organisationName: 'My Defra Organisation'
        })
      )
      expect(result).toBe('view-response')
    })

    it('should display current Defra organisation name in view data', () => {
      const mockOrganisations = {
        current: {
          id: 'defra-org-123',
          name: 'My Defra Organisation Name',
          relationshipId: 'rel-456'
        },
        linked: null,
        unlinked: [
          {
            id: 'org-1',
            name: 'Test Company Ltd',
            orgId: '12345678'
          }
        ]
      }

      const mockRequest = {
        pre: {
          userOrganisations: mockOrganisations
        },
        t: vi.fn((key) => key)
      }

      const mockView = vi.fn()
      const mockH = {
        view: mockView
      }

      controller.handler(mockRequest, mockH)

      expect(mockView).toHaveBeenCalledWith(
        'account/linking/index',
        expect.objectContaining({
          organisationName: 'My Defra Organisation Name'
        })
      )
    })

    it('should render multiple unlinked organisations with unique IDs', () => {
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

      const mockRequest = {
        pre: {
          userOrganisations: mockOrganisations
        },
        t: vi.fn((key) => key)
      }

      const mockView = vi.fn()
      const mockH = {
        view: mockView
      }

      controller.handler(mockRequest, mockH)

      expect(mockView).toHaveBeenCalledWith(
        'account/linking/index',
        expect.objectContaining({
          unlinked: [
            {
              id: 'org-1',
              displayName: 'First Company (ID: FC111111)',
              name: 'First Company'
            },
            {
              id: 'org-2',
              displayName: 'Second Company (ID: SC222222)',
              name: 'Second Company'
            },
            {
              id: 'org-3',
              displayName: 'Third Company (ID: TC333333)',
              name: 'Third Company'
            }
          ]
        })
      )
    })

    it('should pass unlinked organisations data for troubleshooting panel', () => {
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
          }
        ]
      }

      const mockRequest = {
        pre: {
          userOrganisations: mockOrganisations
        },
        t: vi.fn((key) => key)
      }

      const mockView = vi.fn()
      const mockH = {
        view: mockView
      }

      controller.handler(mockRequest, mockH)

      const viewData = mockView.mock.calls[0][1]

      expect(viewData.unlinked).toHaveLength(2)
      expect(viewData.unlinked[0]).toStrictEqual({
        id: 'org-1',
        displayName: 'First Company (ID: FC111111)',
        name: 'First Company'
      })
      expect(viewData.unlinked[1]).toStrictEqual({
        id: 'org-2',
        displayName: 'Second Company (ID: SC222222)',
        name: 'Second Company'
      })
    })
  })

  describe('when user has no unlinked organisations', () => {
    it('should redirect to email-not-recognised', () => {
      const mockOrganisations = {
        current: {
          id: 'defra-org-123',
          name: 'Test Organisation',
          relationshipId: 'rel-456'
        },
        linked: null,
        unlinked: []
      }

      const mockRequest = {
        pre: {
          userOrganisations: mockOrganisations
        }
      }

      const mockRedirect = vi.fn().mockReturnValue('redirect-response')
      const mockH = {
        redirect: mockRedirect
      }

      const result = controller.handler(mockRequest, mockH)

      expect(mockRedirect).toHaveBeenCalledExactlyOnceWith(
        '/email-not-recognised'
      )
      expect(result).toBe('redirect-response')
    })

    it('should redirect to email-not-recognised when unlinked is null', () => {
      const mockOrganisations = {
        current: {
          id: 'defra-org-123',
          name: 'Test Organisation'
        },
        linked: null,
        unlinked: null
      }

      const mockRequest = {
        pre: {
          userOrganisations: mockOrganisations
        }
      }

      const mockRedirect = vi.fn().mockReturnValue('redirect-response')
      const mockH = {
        redirect: mockRedirect
      }

      const result = controller.handler(mockRequest, mockH)

      expect(mockRedirect).toHaveBeenCalledExactlyOnceWith(
        '/email-not-recognised'
      )
      expect(result).toBe('redirect-response')
    })
  })
})
