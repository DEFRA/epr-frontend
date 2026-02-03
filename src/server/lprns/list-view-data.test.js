import { describe, expect, it, vi } from 'vitest'
import { buildListViewData } from './list-view-data.js'

const createMockRequest = () => ({
  t: vi.fn((key) => {
    const translations = {
      'lprns:list:prns:pageTitle': 'PRNs',
      'lprns:list:perns:pageTitle': 'PERNs',
      'lprns:list:prns:balanceHint':
        'This is the balance available for creating PRNs',
      'lprns:list:perns:balanceHint':
        'This is the balance available for creating PERNs',
      'lprns:list:prns:cancelHint':
        'If you cancel a PRN, its tonnage will be added to your available waste balance.',
      'lprns:list:perns:cancelHint':
        'If you cancel a PERN, its tonnage will be added to your available waste balance.',
      'lprns:list:prns:createLink': 'Create a PRN',
      'lprns:list:perns:createLink': 'Create a PERN',
      'lprns:list:prns:awaitingAuthorisationHeading':
        'PRNs awaiting authorisation',
      'lprns:list:perns:awaitingAuthorisationHeading':
        'PERNs awaiting authorisation',
      'lprns:list:prns:noIssuedPrns': 'No PRNs have been issued yet.',
      'lprns:list:perns:noIssuedPrns': 'No PERNs have been issued yet.',
      'lprns:list:availableWasteBalance': 'Available waste balance',
      'lprns:list:noPrns': 'No PRNs or PERNs have been created yet.',
      'lprns:list:tabs:awaitingAction': 'Awaiting action',
      'lprns:list:tabs:issued': 'Issued',
      'lprns:list:table:recipientHeading': 'Issued to',
      'lprns:list:table:dateHeading': 'Date created',
      'lprns:list:table:tonnageHeading': 'Tonnage',
      'lprns:list:table:statusHeading': 'Status',
      'lprns:list:table:actionHeading': '',
      'lprns:list:table:selectText': 'Select',
      'lprns:list:table:totalLabel': 'Total',
      'lprns:list:status:awaitingAuthorisation': 'Awaiting authorisation',
      'lprns:list:status:awaitingAcceptance': 'Awaiting acceptance',
      'lprns:list:status:issued': 'Issued',
      'lprns:list:status:cancelled': 'Cancelled'
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
        accreditationId: 'acc-001',
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
        accreditationId: 'acc-001',
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
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.createLink.href).toBe(
        '/organisations/org-123/registrations/reg-001/accreditations/acc-001/l-packaging-recycling-notes/create'
      )
      expect(result.createLink.text).toBe('Create a PRN')
    })

    it('should return waste balance data', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
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

    it('should return tab labels', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.tabs.awaitingAction).toBe('Awaiting action')
      expect(result.tabs.issued).toBe('Issued')
    })

    it('should return cancel hint and awaiting authorisation heading', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancelHint).toBe(
        'If you cancel a PRN, its tonnage will be added to your available waste balance.'
      )
      expect(result.awaitingAuthorisationHeading).toBe(
        'PRNs awaiting authorisation'
      )
    })

    it('should return table rows in govukTable format with total row', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      // 2 data rows + 1 total row
      expect(result.table.rows).toHaveLength(3)
      expect(result.table.rows[0]).toHaveLength(5)
      expect(result.table.rows[0][0]).toStrictEqual({
        text: 'Acme Packaging Ltd'
      })
      expect(result.table.rows[0][1]).toStrictEqual({ text: '15 January 2026' })
      expect(result.table.rows[0][2]).toStrictEqual({ text: 50 })
    })

    it('should return total row with sum of tonnage', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      const totalRow = result.table.rows[2]
      expect(totalRow[0].text).toBe('Total')
      expect(totalRow[0].classes).toBe('govuk-!-font-weight-bold')
      expect(totalRow[2].text).toBe(170) // 50 + 120
      expect(totalRow[2].classes).toBe('govuk-!-font-weight-bold')
    })

    it('should return status as govukTag HTML', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.table.rows[0][3].html).toContain('govuk-tag')
      expect(result.table.rows[0][3].html).toContain('Awaiting authorisation')
    })

    it('should return select link as HTML', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.table.rows[0][4].html).toContain('govuk-link')
      expect(result.table.rows[0][4].html).toContain(
        '/organisations/org-123/registrations/reg-001/accreditations/acc-001/l-packaging-recycling-notes/prn-001/view'
      )
    })

    it('should return table headings', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.table.headings.recipient).toBe('Issued to')
      expect(result.table.headings.createdAt).toBe('Date created')
      expect(result.table.headings.tonnage).toBe('Tonnage')
      expect(result.table.headings.status).toBe('Status')
    })

    it('should return no issued text for PRNs', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.noIssuedText).toBe('No PRNs have been issued yet.')
    })
  })

  describe('for exporter (PERN)', () => {
    it('should return page title with PERN text', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        accreditationId: 'acc-002',
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
        accreditationId: 'acc-002',
        registration: exporterRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.createLink.text).toBe('Create a PERN')
    })

    it('should return cancel hint with PERN text', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        accreditationId: 'acc-002',
        registration: exporterRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancelHint).toBe(
        'If you cancel a PERN, its tonnage will be added to your available waste balance.'
      )
      expect(result.awaitingAuthorisationHeading).toBe(
        'PERNs awaiting authorisation'
      )
    })

    it('should return no issued text for PERNs', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        accreditationId: 'acc-002',
        registration: exporterRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.noIssuedText).toBe('No PERNs have been issued yet.')
    })
  })

  describe('edge cases', () => {
    it('should handle null waste balance', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
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
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: [],
        wasteBalance: mockWasteBalance
      })

      expect(result.table.rows).toHaveLength(0)
      expect(result.noPrnsText).toBe('No PRNs or PERNs have been created yet.')
    })

    it('should format awaiting_acceptance status correctly', () => {
      const prnAwaitingAcceptance = [
        {
          id: 'prn-accept',
          recipient: 'Accept Ltd',
          createdAt: '2026-01-15',
          tonnage: 25,
          status: 'awaiting_acceptance'
        }
      ]

      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: prnAwaitingAcceptance,
        wasteBalance: mockWasteBalance
      })

      expect(result.table.rows[0][3].html).toContain('Awaiting acceptance')
    })

    it('should return unknown status as-is in tag', () => {
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
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: prnWithUnknownStatus,
        wasteBalance: mockWasteBalance
      })

      expect(result.table.rows[0][3].html).toContain('unknown_status')
    })
  })
})
