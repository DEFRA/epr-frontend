import { describe, it, expect, vi } from 'vitest'
import { buildListViewData } from './view-data.js'

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

// Stub PRN data matching the API contract
const stubPrns = [
  {
    id: 'prn-001',
    prnNumber: 'ER2625468U',
    issuedToOrganisation: {
      name: 'ComplyPak Ltd'
    },
    tonnageValue: 9,
    createdAt: '2026-01-21T10:30:00Z',
    status: 'awaiting_authorisation'
  },
  {
    id: 'prn-002',
    prnNumber: 'ER2612345A',
    issuedToOrganisation: {
      name: 'Nestle (SEPA)',
      tradingName: 'Nestle UK'
    },
    tonnageValue: 4,
    createdAt: '2026-01-19T14:00:00Z',
    status: 'awaiting_authorisation'
  },
  {
    id: 'prn-003',
    prnNumber: 'ER2699887B',
    issuedToOrganisation: { name: 'GreenPack Solutions' },
    tonnageValue: 7,
    createdAt: '2026-01-18T09:00:00Z',
    status: 'awaiting_acceptance'
  },
  {
    id: 'prn-004',
    prnNumber: 'ER2633221C',
    issuedToOrganisation: { name: 'EcoWaste Ltd' },
    tonnageValue: 12,
    createdAt: '2026-01-15T11:00:00Z',
    status: 'accepted'
  },
  {
    id: 'prn-005',
    prnNumber: 'ER2677654D',
    issuedToOrganisation: { name: 'RecycleCo' },
    tonnageValue: 3,
    createdAt: '2026-01-12T16:00:00Z',
    status: 'awaiting_cancellation'
  },
  {
    id: 'prn-006',
    prnNumber: 'ER2611111E',
    issuedToOrganisation: { name: 'WasteAway Inc' },
    tonnageValue: 6,
    createdAt: '2026-01-10T08:30:00Z',
    status: 'cancelled'
  }
]

const stubWasteBalance = {
  amount: 20.5,
  availableAmount: 10.3
}

describe('#prnListViewData', () => {
  describe('prn vs pern text', () => {
    const translations = {
      'prns:list:prns:pageTitle': 'PRNs',
      'prns:list:perns:pageTitle': 'PERNs',
      'prns:list:prns:selectHeading': 'Select a PRN',
      'prns:list:perns:selectHeading': 'Select a PERN',
      'prns:list:prns:balanceHint':
        'This is the balance available for creating new PRNs',
      'prns:list:perns:balanceHint':
        'This is the balance available for creating new PERNs',
      'prns:list:availableWasteBalance': 'Available waste balance'
    }

    it('should return PRN text for reprocessor-input', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: stubPrns,
        wasteBalance: stubWasteBalance
      })

      expect(result.pageTitle).toBe('PRNs')
      expect(result.selectHeading).toBe('Select a PRN')
      expect(result.balanceHint).toBe(
        'This is the balance available for creating new PRNs'
      )
      expect(result).not.toHaveProperty('cancelHint')
    })

    it('should return PRN text for reprocessor-output', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'reprocessor-output' }

      const result = buildListViewData(request, {
        registration,
        prns: stubPrns,
        wasteBalance: stubWasteBalance
      })

      expect(result.pageTitle).toBe('PRNs')
      expect(result.selectHeading).toBe('Select a PRN')
    })

    it('should return PERN text for exporter', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'exporter' }

      const result = buildListViewData(request, {
        registration,
        prns: stubPrns,
        wasteBalance: stubWasteBalance
      })

      expect(result.pageTitle).toBe('PERNs')
      expect(result.selectHeading).toBe('Select a PERN')
      expect(result.balanceHint).toBe(
        'This is the balance available for creating new PERNs'
      )
      expect(result).not.toHaveProperty('cancelHint')
    })
  })

  describe('waste balance', () => {
    it('should pass through availableAmount for display', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: stubPrns,
        wasteBalance: stubWasteBalance
      })

      // The view should receive availableAmount for display (not amount)
      expect(result.wasteBalance.availableAmount).toBe(10.3)
    })

    it('should handle null waste balance gracefully', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: stubPrns,
        wasteBalance: null
      })

      expect(result.wasteBalance).toBeNull()
    })
  })

  describe('table data', () => {
    it('should build table headers correctly', () => {
      const translations = {
        'prns:list:table:recipientHeading':
          'Packaging waste producer or compliance scheme',
        'prns:list:table:dateHeading': 'Date created',
        'prns:list:table:tonnageHeading': 'Tonnage',
        'prns:list:table:statusHeading': 'Status',
        'prns:list:table:actionHeading': 'Action'
      }
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: stubPrns,
        wasteBalance: stubWasteBalance
      })

      expect(result.table.head).toStrictEqual([
        { text: 'Packaging waste producer or compliance scheme' },
        { text: 'Date created' },
        { text: 'Tonnage', format: 'numeric' },
        { text: 'Status' },
        { html: '<span class="govuk-visually-hidden">Action</span>' }
      ])
    })

    it('should build table row with correct structure', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: [stubPrns[0]],
        wasteBalance: stubWasteBalance
      })

      expect(result.table.rows).toHaveLength(1)
      expect(result.table.rows[0]).toHaveLength(5)
    })

    it('should build table row with correct cell values', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: [stubPrns[0]],
        wasteBalance: stubWasteBalance
      })

      // First cell: recipient name
      expect(result.table.rows[0][0]).toStrictEqual({ text: 'ComplyPak Ltd' })
      // Second cell: formatted date
      expect(result.table.rows[0][1].text).toBe('21 January 2026')
      // Third cell: tonnage (numeric)
      expect(result.table.rows[0][2]).toStrictEqual({
        text: '9',
        format: 'numeric'
      })
      // Fourth cell: status as HTML tag
      expect(result.table.rows[0][3].html).toContain('govuk-tag')
    })

    it('should handle empty PRN list', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: [],
        wasteBalance: stubWasteBalance
      })

      expect(result.table.rows).toStrictEqual([])
    })
  })

  describe('status filtering', () => {
    it('should only include PRNs with awaiting_authorisation status', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: stubPrns,
        wasteBalance: stubWasteBalance
      })

      expect(result.table.rows).toHaveLength(2)
      expect(result.table.rows[0][0].text).toBe('ComplyPak Ltd')
      expect(result.table.rows[1][0].text).toBe('Nestle (SEPA)')
    })

    it('should return empty rows when no PRNs have awaiting_authorisation status', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const nonAuthPrns = stubPrns.filter(
        (p) => p.status !== 'awaiting_authorisation'
      )

      const result = buildListViewData(request, {
        registration,
        prns: nonAuthPrns,
        wasteBalance: stubWasteBalance
      })

      expect(result.table.rows).toStrictEqual([])
    })
  })

  describe('status tag formatting', () => {
    it('should format awaiting_authorisation status with blue tag', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: [stubPrns[0]],
        wasteBalance: stubWasteBalance
      })

      const statusCell = result.table.rows[0][3]

      expect(statusCell.html).toContain('govuk-tag--blue')
      expect(statusCell.html).toContain('Awaiting authorisation')
    })

    it('should apply nowrap class to tag element', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: [stubPrns[0]],
        wasteBalance: stubWasteBalance
      })

      const statusCell = result.table.rows[0][3]

      expect(statusCell.html).toContain('app-tag-nowrap')
    })

    it('should apply nowrap class to date and status cells', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: [stubPrns[0]],
        wasteBalance: stubWasteBalance
      })

      expect(result.table.rows[0][1].classes).toBe('app-table-cell-nowrap')
      expect(result.table.rows[0][3].classes).toBe('app-table-cell-nowrap')
    })
  })

  describe('back link', () => {
    it('should return back URL to registration dashboard', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: stubPrns,
        wasteBalance: stubWasteBalance,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.backUrl).toBe(
        '/organisations/org-123/registrations/reg-001'
      )
    })
  })

  describe('create button', () => {
    const translations = {
      'prns:list:prns:createText': 'Create a PRN',
      'prns:list:perns:createText': 'Create a PERN'
    }

    it('should return create PRN URL from organisationId and registrationId', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: stubPrns,
        wasteBalance: stubWasteBalance,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.createUrl).toBe(
        '/organisations/org-123/registrations/reg-001/create-prn'
      )
    })

    it('should return "Create a PRN" button text for reprocessor', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: stubPrns,
        wasteBalance: stubWasteBalance,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.createText).toBe('Create a PRN')
    })

    it('should return "Create a PERN" button text for exporter', () => {
      const request = createMockRequest(translations)
      const registration = { wasteProcessingType: 'exporter' }

      const result = buildListViewData(request, {
        registration,
        prns: stubPrns,
        wasteBalance: stubWasteBalance,
        organisationId: 'org-456',
        registrationId: 'reg-002'
      })

      expect(result.createText).toBe('Create a PERN')
    })
  })

  describe('select link', () => {
    it('should include select link with correct URL in each row', () => {
      const request = createMockRequest({
        'prns:list:table:selectLink': 'Select'
      })
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: [stubPrns[0]],
        wasteBalance: stubWasteBalance,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      const selectCell = result.table.rows[0][4]

      expect(selectCell.html).toContain(
        '/organisations/org-123/registrations/reg-001/prns/ER2625468U'
      )
    })

    it('should include visually hidden context text with organisation name', () => {
      const request = createMockRequest({
        'prns:list:table:selectLink': 'Select'
      })
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const result = buildListViewData(request, {
        registration,
        prns: [stubPrns[0]],
        wasteBalance: stubWasteBalance,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      const selectCell = result.table.rows[0][4]

      expect(selectCell.html).toContain('Select')
      expect(selectCell.html).toContain('govuk-visually-hidden')
      expect(selectCell.html).toContain('ComplyPak Ltd')
    })
  })

  describe('date formatting', () => {
    it('should format ISO date to readable UK format', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const prn = {
        id: 'test-prn',
        prnNumber: 'ER2699999Z',
        issuedToOrganisation: { name: 'Test Corp' },
        tonnageValue: 5,
        createdAt: '2026-03-15T14:30:00Z',
        status: 'awaiting_authorisation'
      }

      const result = buildListViewData(request, {
        registration,
        prns: [prn],
        wasteBalance: stubWasteBalance
      })

      expect(result.table.rows[0][1].text).toBe('15 March 2026')
    })
  })
})
