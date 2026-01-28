import { describe, it, expect, vi } from 'vitest'
import { buildListViewData } from './list-view-data.js'

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
// Note: This screen only shows PRNs with 'awaiting_authorisation' status
const stubPrns = [
  {
    id: 'prn-001',
    prnNumber: 'PRN-2026-00001',
    issuedToOrganisation: {
      name: 'ComplyPak Ltd'
    },
    tonnageValue: 9,
    createdAt: '2026-01-21T10:30:00Z',
    status: 'awaiting_authorisation'
  },
  {
    id: 'prn-002',
    prnNumber: 'PRN-2026-00002',
    issuedToOrganisation: {
      name: 'Nestle (SEPA)',
      tradingName: 'Nestle UK'
    },
    tonnageValue: 4,
    createdAt: '2026-01-19T14:00:00Z',
    status: 'awaiting_authorisation'
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
      'prns:list:prns:cancelHint':
        'If you cancel a PRN, its tonnage will be added to your available waste balance.',
      'prns:list:perns:cancelHint':
        'If you cancel a PERN, its tonnage will be added to your available waste balance.',
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
      expect(result.cancelHint).toBe(
        'If you cancel a PRN, its tonnage will be added to your available waste balance.'
      )
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
      expect(result.cancelHint).toBe(
        'If you cancel a PERN, its tonnage will be added to your available waste balance.'
      )
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
        'prns:list:table:statusHeading': 'Status'
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
        { text: 'Status' }
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
      expect(result.table.rows[0]).toHaveLength(4)
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
      expect(result.table.rows[0][1]).toStrictEqual({ text: '21 January 2026' })
      // Third cell: tonnage (numeric)
      expect(result.table.rows[0][2]).toStrictEqual({
        text: '9',
        format: 'numeric'
      })
      // Fourth cell: status as HTML tag with nowrap class
      expect(result.table.rows[0][3].html).toContain('govuk-tag')
      expect(result.table.rows[0][3].classes).toBe('epr-nowrap')
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

  describe('status tag formatting', () => {
    it('should format unknown status with grey tag as fallback', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const prn = {
        id: 'test-prn',
        prnNumber: 'PRN-TEST',
        issuedToOrganisation: { name: 'Test Corp' },
        tonnageValue: 5,
        createdAt: '2026-01-20T10:00:00Z',
        status: 'unknown_status'
      }

      const result = buildListViewData(request, {
        registration,
        prns: [prn],
        wasteBalance: stubWasteBalance
      })

      const statusCell = result.table.rows[0][3]

      expect(statusCell.html).toContain('govuk-tag--grey')
      expect(statusCell.html).toContain('Unknown')
    })

    it('should format awaiting_authorisation status with blue tag', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const prn = {
        id: 'test-prn',
        prnNumber: 'PRN-TEST',
        issuedToOrganisation: { name: 'Test Corp' },
        tonnageValue: 5,
        createdAt: '2026-01-20T10:00:00Z',
        status: 'awaiting_authorisation'
      }

      const result = buildListViewData(request, {
        registration,
        prns: [prn],
        wasteBalance: stubWasteBalance
      })

      const statusCell = result.table.rows[0][3]

      expect(statusCell.html).toContain('govuk-tag--blue')
      expect(statusCell.html).toContain('Awaiting authorisation')
    })
  })

  describe('date formatting', () => {
    it('should format ISO date to readable UK format', () => {
      const request = createMockRequest({})
      const registration = { wasteProcessingType: 'reprocessor-input' }

      const prn = {
        id: 'test-prn',
        prnNumber: 'PRN-TEST',
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
