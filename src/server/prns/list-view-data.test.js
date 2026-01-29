import { describe, expect, it, vi } from 'vitest'
import { buildListViewData } from './list-view-data.js'

const createMockRequest = () => ({
  t: vi.fn((key) => {
    const translations = {
      'prns:list:prns:pageTitle': 'PRNs',
      'prns:list:perns:pageTitle': 'PERNs',
      'prns:list:prns:selectHeading': 'Select a PRN',
      'prns:list:perns:selectHeading': 'Select a PERN',
      'prns:list:prns:balanceHint':
        'This is the balance available for creating PRNs',
      'prns:list:perns:balanceHint':
        'This is the balance available for creating PERNs',
      'prns:list:prns:cancelHint':
        'If you cancel a PRN, its tonnage will be added to your available waste balance.',
      'prns:list:perns:cancelHint':
        'If you cancel a PERN, its tonnage will be added to your available waste balance.',
      'prns:list:prns:createLink': 'Create a PRN',
      'prns:list:perns:createLink': 'Create a PERN',
      'prns:list:availableWasteBalance': 'Available waste balance',
      'prns:list:table:recipientHeading':
        'Packaging waste producer or compliance scheme',
      'prns:list:table:dateHeading': 'Date created',
      'prns:list:table:tonnageHeading': 'Tonnage',
      'prns:list:table:statusHeading': 'Status',
      'prns:list:table:actionHeading': 'Action',
      'prns:list:table:selectText': 'Select',
      'prns:list:status:awaitingAuthorisation': 'Awaiting authorisation',
      'prns:list:status:issued': 'Issued',
      'prns:list:status:cancelled': 'Cancelled'
    }
    return translations[key] || key
  }),
  localiseUrl: vi.fn((url) => url)
})

const stubPrns = [
  {
    id: 'prn-001',
    recipient: 'Acme Packaging Ltd',
    createdAt: '2026-01-15',
    tonnage: 50,
    status: 'awaiting_authorisation'
  },
  {
    id: 'prn-002',
    recipient: 'BigCo Waste Solutions',
    createdAt: '2026-01-18',
    tonnage: 120,
    status: 'issued'
  }
]

const reprocessorRegistration = {
  id: 'reg-001',
  wasteProcessingType: 'reprocessor-input'
}

const exporterRegistration = {
  id: 'reg-002',
  wasteProcessingType: 'exporter'
}

const mockWasteBalance = { availableAmount: 150.5 }

describe('#buildListViewData', () => {
  describe('for reprocessor (PRN)', () => {
    it('should return page title with PRN text', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.pageTitle).toBe('PRNs')
      expect(result.heading).toBe('PRNs')
    })

    it('should return correct back URL', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.backUrl).toBe(
        '/organisations/org-123/registrations/reg-001'
      )
    })

    it('should return correct create link', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.createLink.href).toBe(
        '/organisations/org-123/registrations/reg-001/packaging-recycling-notes/create'
      )
      expect(result.createLink.text).toBe('Create a PRN')
    })

    it('should return waste balance data', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.wasteBalance.amount).toBe(150.5)
      expect(result.wasteBalance.label).toBe('Available waste balance')
      expect(result.wasteBalance.hint).toBe(
        'This is the balance available for creating PRNs'
      )
    })

    it('should return select heading with PRN text', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.selectHeading).toBe('Select a PRN')
    })

    it('should return cancel hint with PRN text', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancelHint).toBe(
        'If you cancel a PRN, its tonnage will be added to your available waste balance.'
      )
    })

    it('should return table headings', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.table.headings.recipient).toBe(
        'Packaging waste producer or compliance scheme'
      )
      expect(result.table.headings.createdAt).toBe('Date created')
      expect(result.table.headings.tonnage).toBe('Tonnage')
      expect(result.table.headings.status).toBe('Status')
      expect(result.table.headings.action).toBe('Action')
    })

    it('should return table rows with formatted data', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.table.rows).toHaveLength(2)
      expect(result.table.rows[0]).toStrictEqual({
        recipient: 'Acme Packaging Ltd',
        createdAt: '15 January 2026',
        tonnage: 50,
        status: 'Awaiting authorisation',
        selectUrl:
          '/organisations/org-123/registrations/reg-001/packaging-recycling-notes/prn-001/view'
      })
    })

    it('should return select text', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.selectText).toBe('Select')
    })
  })

  describe('for exporter (PERN)', () => {
    it('should return page title with PERN text', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        registration: exporterRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.pageTitle).toBe('PERNs')
      expect(result.heading).toBe('PERNs')
    })

    it('should return create link with PERN text', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        registration: exporterRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.createLink.text).toBe('Create a PERN')
    })

    it('should return select heading with PERN text', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        registration: exporterRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.selectHeading).toBe('Select a PERN')
    })

    it('should return cancel hint with PERN text', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        registration: exporterRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancelHint).toBe(
        'If you cancel a PERN, its tonnage will be added to your available waste balance.'
      )
    })
  })

  describe('edge cases', () => {
    it('should handle null waste balance', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: null
      })

      expect(result.wasteBalance.amount).toBe(0)
    })

    it('should handle empty PRN list', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        prns: [],
        wasteBalance: mockWasteBalance
      })

      expect(result.table.rows).toHaveLength(0)
    })

    it('should return unknown status as-is', () => {
      const prnWithUnknownStatus = [
        {
          id: 'prn-unknown',
          recipient: 'Test Ltd',
          createdAt: '2026-01-15',
          tonnage: 10,
          status: 'unknown_status'
        }
      ]

      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        prns: prnWithUnknownStatus,
        wasteBalance: mockWasteBalance
      })

      expect(result.table.rows[0].status).toBe('unknown_status')
    })
  })
})
