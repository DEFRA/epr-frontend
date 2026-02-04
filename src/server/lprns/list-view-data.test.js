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
        'If you delete or cancel a PRN, its tonnage will be added to your available waste balance.',
      'lprns:list:perns:cancelHint':
        'If you delete or cancel a PERN, its tonnage will be added to your available waste balance.',
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
      'lprns:list:prns:selectHeading': 'Select a PRN',
      'lprns:list:perns:selectHeading': 'Select a PERN',
      'lprns:list:table:recipientHeading':
        'Packaging waste producer or compliance scheme',
      'lprns:list:table:dateHeading': 'Date created',
      'lprns:list:table:tonnageHeading': 'Tonnage',
      'lprns:list:table:statusHeading': 'Status',
      'lprns:list:table:actionHeading': '',
      'lprns:list:table:selectText': 'Select',
      'lprns:list:table:totalLabel': 'Total',
      'lprns:list:prns:noPrnsCreated': 'You have not created any PRNs.',
      'lprns:list:perns:noPrnsCreated': 'You have not created any PERNs.',
      'lprns:list:status:awaitingAuthorisation': 'Awaiting authorisation',
      'lprns:list:status:awaitingAcceptance': 'Awaiting acceptance',
      'lprns:list:status:issued': 'Issued',
      'lprns:list:status:cancelled': 'Cancelled',
      'lprns:list:prns:issuedHeading': 'Issued PRNs',
      'lprns:list:perns:issuedHeading': 'Issued PERNs',
      'lprns:list:issuedTable:prnNumberHeading': 'PRN number',
      'lprns:list:issuedTable:recipientHeading':
        'Producer or compliance scheme',
      'lprns:list:issuedTable:dateIssuedHeading': 'Date issued',
      'lprns:list:issuedTable:statusHeading': 'Status',
      'lprns:list:issuedTable:actionHeading': 'View in new tab',
      'lprns:list:issuedTable:selectText': 'Select'
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

const stubIssuedPrns = [
  {
    id: 'prn-003',
    prnNumber: 'ER2612345',
    recipient: 'Radar',
    issuedAt: '2026-01-29',
    status: 'awaiting_acceptance'
  },
  {
    id: 'prn-004',
    prnNumber: 'ER2654321',
    recipient: 'Renewable Products',
    issuedAt: '2026-01-26',
    status: 'awaiting_acceptance'
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

    it('should return select heading and awaiting authorisation heading', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.selectHeading).toBe('Select a PRN')
      expect(result.awaitingAuthorisationHeading).toBe(
        'PRNs awaiting authorisation'
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

    it('should return cancel hint with delete wording', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancelHint).toBe(
        'If you delete or cancel a PRN, its tonnage will be added to your available waste balance.'
      )
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

      expect(result.table.headings.recipient).toBe(
        'Packaging waste producer or compliance scheme'
      )
      expect(result.table.headings.createdAt).toBe('Date created')
      expect(result.table.headings.tonnage).toBe('Tonnage')
      expect(result.table.headings.status).toBe('Status')
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

    it('should return select heading and awaiting authorisation heading with PERN text', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        accreditationId: 'acc-002',
        registration: exporterRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.selectHeading).toBe('Select a PERN')
      expect(result.awaitingAuthorisationHeading).toBe(
        'PERNs awaiting authorisation'
      )
    })

    it('should return cancel hint with PERN text and delete wording', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        accreditationId: 'acc-002',
        registration: exporterRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancelHint).toBe(
        'If you delete or cancel a PERN, its tonnage will be added to your available waste balance.'
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

  describe('hasCreatedPrns flag', () => {
    it('should pass through hasCreatedPrns as true when PRNs exist', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.hasCreatedPrns).toBe(true)
    })

    it('should pass through hasCreatedPrns as false when no PRNs exist', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: [],
        hasCreatedPrns: false,
        wasteBalance: mockWasteBalance
      })

      expect(result.hasCreatedPrns).toBe(false)
    })

    it('should return type-specific noPrnsCreatedText for PRNs', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: [],
        hasCreatedPrns: false,
        wasteBalance: mockWasteBalance
      })

      expect(result.noPrnsCreatedText).toBe('You have not created any PRNs.')
    })

    it('should return type-specific noPrnsCreatedText for PERNs', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        accreditationId: 'acc-002',
        registration: exporterRegistration,
        prns: [],
        hasCreatedPrns: false,
        wasteBalance: mockWasteBalance
      })

      expect(result.noPrnsCreatedText).toBe('You have not created any PERNs.')
    })
  })

  describe('showTabs', () => {
    it('should return showTabs false when hasIssuedPrns is false', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance,
        hasIssuedPrns: false
      })

      expect(result.showTabs).toBe(false)
    })

    it('should return showTabs true when hasIssuedPrns is true', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance,
        hasIssuedPrns: true
      })

      expect(result.showTabs).toBe(true)
    })
  })

  describe('issued table', () => {
    it('should return issued table rows with PRN number, recipient and date issued', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        issuedPrns: stubIssuedPrns,
        hasCreatedPrns: true,
        hasIssuedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.rows).toHaveLength(2)
      expect(result.issuedTable.rows[0][0]).toStrictEqual({
        text: 'ER2612345'
      })
      expect(result.issuedTable.rows[0][1]).toStrictEqual({
        text: 'Radar'
      })
      expect(result.issuedTable.rows[0][2]).toStrictEqual({
        text: '29 January 2026'
      })
    })

    it('should return issued table status as govuk-tag', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        issuedPrns: stubIssuedPrns,
        hasCreatedPrns: true,
        hasIssuedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.rows[0][3].html).toContain(
        'Awaiting acceptance'
      )
      expect(result.issuedTable.rows[0][3].html).toContain('govuk-tag')
    })

    it('should return issued table headings matching mockup', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        issuedPrns: stubIssuedPrns,
        hasCreatedPrns: true,
        hasIssuedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.headings.prnNumber).toBe('PRN number')
      expect(result.issuedTable.headings.recipient).toBe(
        'Producer or compliance scheme'
      )
      expect(result.issuedTable.headings.dateIssued).toBe('Date issued')
      expect(result.issuedTable.headings.status).toBe('Status')
      expect(result.issuedTable.headings.action).toBe('View in new tab')
    })

    it('should return view links for each issued PRN', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        issuedPrns: stubIssuedPrns,
        hasCreatedPrns: true,
        hasIssuedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.rows[0][4].html).toContain('govuk-link')
      expect(result.issuedTable.rows[0][4].html).toContain(
        '/organisations/org-123/registrations/reg-001/accreditations/acc-001/l-packaging-recycling-notes/prn-003/view'
      )
    })

    it('should return empty issued table rows when no issued PRNs', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        issuedPrns: [],
        hasCreatedPrns: true,
        hasIssuedPrns: false,
        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.rows).toHaveLength(0)
    })

    it('should return issued heading for PRNs', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        issuedPrns: stubIssuedPrns,
        hasCreatedPrns: true,
        hasIssuedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.issuedHeading).toBe('Issued PRNs')
    })

    it('should return issued heading for PERNs', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        accreditationId: 'acc-002',
        registration: exporterRegistration,
        prns: stubPrns,
        issuedPrns: stubIssuedPrns,
        hasCreatedPrns: true,
        hasIssuedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.issuedHeading).toBe('Issued PERNs')
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
        hasCreatedPrns: true,
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
        hasCreatedPrns: false,
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
