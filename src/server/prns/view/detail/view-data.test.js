import { describe, it, expect, vi } from 'vitest'
import { buildDetailViewData } from './view-data.js'

/**
 * Creates a mock request object with localisation
 * @param {Record<string, string>} translations - Key-value pairs for translations
 * @returns {object} Mock request object
 */
function createMockRequest(translations = {}) {
  return {
    t: vi.fn((key) => translations[key] || key)
  }
}

const translations = {
  'prns:detail:prns:pageTitle': 'PRN',
  'prns:detail:perns:pageTitle': 'PERN',
  'prns:detail:prns:issuePrn': 'Issue PRN',
  'prns:detail:perns:issuePrn': 'Issue PERN',
  'prns:detail:prns:deletePrn': 'Delete PRN',
  'prns:detail:perns:deletePrn': 'Delete PERN'
}

describe('#prnDetailViewData', () => {
  describe('prn vs pern text', () => {
    it('should return PRN page title for reprocessor-input', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildDetailViewData(request, {
        registration,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: { id: 'prn-001' }
      })

      expect(result.pageTitle).toBe('PRN')
      expect(result.heading).toBe('PRN')
    })

    it('should return PRN page title for reprocessor-output', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'reprocessor-output' }

      const result = buildDetailViewData(request, {
        registration,
        organisationId: 'org-789',
        registrationId: 'reg-003',
        prnData: { id: 'prn-001' }
      })

      expect(result.pageTitle).toBe('PRN')
      expect(result.heading).toBe('PRN')
    })

    it('should return PERN page title for exporter', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'exporter' }

      const result = buildDetailViewData(request, {
        registration,
        organisationId: 'org-456',
        registrationId: 'reg-002',
        prnData: { id: 'prn-005' }
      })

      expect(result.pageTitle).toBe('PERN')
      expect(result.heading).toBe('PERN')
    })
  })

  describe('back link', () => {
    it('should return back URL pointing to PRN dashboard', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildDetailViewData(request, {
        registration,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: { id: 'prn-001' }
      })

      expect(result.backUrl).toBe(
        '/organisations/org-123/registrations/reg-001/prns'
      )
    })
  })

  describe('action buttons', () => {
    it('should return Issue PRN text for reprocessor', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildDetailViewData(request, {
        registration,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: { id: 'prn-001' }
      })

      expect(result.issuePrnText).toBe('Issue PRN')
    })

    it('should return Issue PERN text for exporter', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'exporter' }

      const result = buildDetailViewData(request, {
        registration,
        organisationId: 'org-456',
        registrationId: 'reg-002',
        prnData: { id: 'prn-005' }
      })

      expect(result.issuePrnText).toBe('Issue PERN')
    })

    it('should return Delete PRN text for reprocessor', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildDetailViewData(request, {
        registration,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: { id: 'prn-001' }
      })

      expect(result.deletePrnText).toBe('Delete PRN')
    })

    it('should return Delete PERN text for exporter', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'exporter' }

      const result = buildDetailViewData(request, {
        registration,
        organisationId: 'org-456',
        registrationId: 'reg-002',
        prnData: { id: 'prn-005' }
      })

      expect(result.deletePrnText).toBe('Delete PERN')
    })
  })
})
