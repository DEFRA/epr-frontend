import { describe, it, expect, vi } from 'vitest'
import { buildDetailViewData } from './detail-view-data.js'

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

describe('#prnDetailViewData', () => {
  describe('prn vs pern text', () => {
    const translations = {
      'prns:detail:prns:pageTitle': 'PRN',
      'prns:detail:perns:pageTitle': 'PERN'
    }

    it('should return PRN page title for reprocessor-input', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildDetailViewData(request, {
        registration,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnNumber: 'ER2625468U'
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
        prnNumber: 'ER2625468U'
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
        prnNumber: 'EX2625468U'
      })

      expect(result.pageTitle).toBe('PERN')
      expect(result.heading).toBe('PERN')
    })
  })
})
