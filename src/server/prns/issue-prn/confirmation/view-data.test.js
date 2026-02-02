import { describe, expect, it, vi } from 'vitest'
import { buildConfirmationViewData } from './view-data.js'

const createMockRequest = () => ({
  t: vi.fn((key) => {
    const translations = {
      'prns:confirmation:prns:panelTitle': 'PRN issued to',
      'prns:confirmation:perns:panelTitle': 'PERN issued to',
      'prns:confirmation:prns:prnNumberLabel': 'PRN number:',
      'prns:confirmation:perns:prnNumberLabel': 'PERN number:',
      'prns:confirmation:prns:viewPrn': 'View PRN (opens in a new tab)',
      'prns:confirmation:perns:viewPrn': 'View PERN (opens in a new tab)',
      'prns:confirmation:prns:createPrn': 'Create a PRN',
      'prns:confirmation:perns:createPrn': 'Create a PERN',
      'prns:confirmation:prns:managePrns': 'Manage PRNs',
      'prns:confirmation:perns:managePrns': 'Manage PERNs',
      'prns:confirmation:returnToHome': 'Return to home'
    }
    return translations[key] || key
  })
})

const reprocessorRegistration = {
  id: 'reg-001',
  wasteProcessingType: 'reprocessor-input'
}

const exporterRegistration = {
  id: 'reg-002',
  wasteProcessingType: 'exporter'
}

const mockPrnData = {
  prnNumber: 'ER992415095748M',
  issuedToOrganisation: 'Nestle (SEPA)'
}

describe('#buildConfirmationViewData', () => {
  describe('for reprocessor (PRN)', () => {
    it('should return panel title with PRN and recipient name', () => {
      const result = buildConfirmationViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: mockPrnData
      })

      expect(result.panelTitle).toBe('PRN issued to Nestle (SEPA)')
      expect(result.pageTitle).toBe('PRN issued to Nestle (SEPA)')
    })

    it('should return PRN number label and value', () => {
      const result = buildConfirmationViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: mockPrnData
      })

      expect(result.prnNumberLabel).toBe('PRN number:')
      expect(result.prnNumber).toBe('ER992415095748M')
    })

    it('should return PRN-specific link text', () => {
      const result = buildConfirmationViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: mockPrnData
      })

      expect(result.viewPrnText).toBe('View PRN (opens in a new tab)')
      expect(result.createPrnText).toBe('Create a PRN')
      expect(result.managePrnsText).toBe('Manage PRNs')
    })
  })

  describe('for exporter (PERN)', () => {
    it('should return panel title with PERN and recipient name', () => {
      const result = buildConfirmationViewData(createMockRequest(), {
        registration: exporterRegistration,
        organisationId: 'org-456',
        registrationId: 'reg-002',
        prnData: mockPrnData
      })

      expect(result.panelTitle).toBe('PERN issued to Nestle (SEPA)')
      expect(result.pageTitle).toBe('PERN issued to Nestle (SEPA)')
    })

    it('should return PERN number label', () => {
      const result = buildConfirmationViewData(createMockRequest(), {
        registration: exporterRegistration,
        organisationId: 'org-456',
        registrationId: 'reg-002',
        prnData: mockPrnData
      })

      expect(result.prnNumberLabel).toBe('PERN number:')
    })

    it('should return PERN-specific link text', () => {
      const result = buildConfirmationViewData(createMockRequest(), {
        registration: exporterRegistration,
        organisationId: 'org-456',
        registrationId: 'reg-002',
        prnData: mockPrnData
      })

      expect(result.viewPrnText).toBe('View PERN (opens in a new tab)')
      expect(result.createPrnText).toBe('Create a PERN')
      expect(result.managePrnsText).toBe('Manage PERNs')
    })
  })

  describe('urls', () => {
    it('should return viewPrnUrl with prn number', () => {
      const result = buildConfirmationViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: mockPrnData
      })

      expect(result.viewPrnUrl).toBe(
        '/organisations/org-123/registrations/reg-001/prns/ER992415095748M'
      )
    })

    it('should return createPrnUrl with org and registration ids', () => {
      const result = buildConfirmationViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: mockPrnData
      })

      expect(result.createPrnUrl).toBe(
        '/organisations/org-123/registrations/reg-001/create-prn'
      )
    })

    it('should return managePrnsUrl with org and registration ids', () => {
      const result = buildConfirmationViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: mockPrnData
      })

      expect(result.managePrnsUrl).toBe(
        '/organisations/org-123/registrations/reg-001/prns'
      )
    })

    it('should return returnToHomeUrl with org id', () => {
      const result = buildConfirmationViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: mockPrnData
      })

      expect(result.returnToHomeUrl).toBe('/organisations/org-123')
    })
  })

  describe('common fields', () => {
    it('should return return to home text', () => {
      const result = buildConfirmationViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: mockPrnData
      })

      expect(result.returnToHomeText).toBe('Return to home')
    })

    it('should default to empty strings when prnData is missing', () => {
      const result = buildConfirmationViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.prnNumber).toBe('')
      expect(result.panelTitle).toBe('PRN issued to ')
    })
  })
})
