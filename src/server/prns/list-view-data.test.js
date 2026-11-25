import { toYear } from '#server/common/helpers/year.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { describe, expect, it, vi } from 'vitest'
import { SCOPES } from '#server/auth/scopes.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { cssClasses } from '#server/common/constants/css-classes.js'
import { createMockLocalise } from '#server/test-helpers/localise.js'
import { buildListViewData } from './list-view-data.js'

/** @param {string[]} scope */
const createMockRequest = (scope = [SCOPES.organisationLinkedWrite]) => ({
  auth: { credentials: { scope } },
  t: createMockLocalise(),
  localiseUrl: vi.fn((url) => url)
})

const stubPrns = [
  {
    id: 'prn-001',
    recipient: 'Acme Packaging Ltd',
    createdAt: '2026-01-15',
    tonnage: 50,
    status: 'awaiting_authorisation',
    isDecemberWaste: true
  },
  {
    id: 'prn-002',
    recipient: 'BigCo Waste Solutions',
    createdAt: '2026-01-18',
    tonnage: 120,
    status: 'awaiting_authorisation',
    isDecemberWaste: false
  }
]

const stubCancellationPrns = [
  {
    id: 'prn-cancel-001',
    recipient: 'TFR Facilities',
    createdAt: '2025-08-13',
    tonnage: 5,
    status: 'awaiting_cancellation',
    isDecemberWaste: true
  },
  {
    id: 'prn-cancel-002',
    recipient: 'Linton Construction',
    createdAt: '2025-08-07',
    tonnage: 25,
    status: 'awaiting_cancellation',
    isDecemberWaste: false
  }
]

const stubIssuedPrns = [
  {
    id: 'prn-003',
    prnNumber: 'ER2612345',
    recipient: 'Radar',
    issuedAt: '2026-01-29',
    status: 'awaiting_acceptance',
    isDecemberWaste: true
  },
  {
    id: 'prn-004',
    prnNumber: 'ER2654321',
    recipient: 'Renewable Products',
    issuedAt: '2026-01-26',
    status: 'awaiting_acceptance',
    isDecemberWaste: false
  }
]

const stubCancelledPrns = [
  {
    id: 'prn-005',
    prnNumber: 'ER2611111',
    recipient: 'Cancelled Corp',
    issuedAt: '2026-01-10',
    tonnage: 40,
    status: 'cancelled',
    isDecemberWaste: true
  },
  {
    id: 'prn-006',
    prnNumber: 'ER2622222',
    recipient: 'Revoked Ltd',
    issuedAt: '2026-01-12',
    tonnage: 20,
    status: 'cancelled',
    isDecemberWaste: false
  }
]

const reprocessorRegistration = {
  id: 'reg-001',
  wasteProcessingType: 'reprocessor-input'
}

const mockWasteBalance = { availableAmount: 150.5 }

const reprocessorKeys = {
  organisationNumber: toOrganisationNumber('500001'),
  registrationNumber: toRegistrationNumber('R26ER1'),
  year: toYear(2026)
}

/** @param {object} cell */
const htmlOf = (cell) => ('html' in cell ? String(cell.html) : '')

describe('#buildListViewData', () => {
  describe('for reprocessor (PRN)', () => {
    it('should return correct back URL', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.backUrl).toBe(
        '/organisations/500001/registrations/R26ER1/accreditations/2026'
      )
    })

    it('should return correct create link', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.createLink?.href).toBe(
        '/organisations/500001/registrations/R26ER1/accreditations/2026/packaging-recycling-notes/create'
      )
    })

    it('should offer no create link once the year has closed', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: false,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.createLink).toBeNull()
    })

    it('should return waste balance data', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(result.wasteBalance.amount).toBe(150.5)
    })

    it('should return table rows in govukTable format with total row', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      // 2 data rows + 1 total row
      expect(result.table.rows).toHaveLength(3)
      expect(result.table.rows[0]).toHaveLength(6)
      expect(result.table.rows[0][0]).toStrictEqual({
        text: 'Acme Packaging Ltd',
        classes: 'epr-break-word'
      })
      expect(result.table.rows[0][1]).toStrictEqual({ text: '15 January 2026' })
      expect(result.table.rows[0][2]).toStrictEqual({ text: 50 })
    })

    it('should return total row with sum of tonnage', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      const totalRow = result.table.rows[2]
      expect(totalRow[0].classes).toBe(cssClasses.fontWeight.bold)
      expect(totalRow[2].text).toBe(170) // 50 + 120
      expect(totalRow[2].classes).toBe(cssClasses.fontWeight.bold)
      expect(totalRow).toHaveLength(6)
    })

    it('should return status as govukTag HTML', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(htmlOf(result.table.rows[0][4])).toContain('govuk-tag--blue')
    })

    it('should return select link pointing to action page', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        wasteBalance: mockWasteBalance
      })

      expect(htmlOf(result.table.rows[0][5])).toContain('govuk-link')
      expect(htmlOf(result.table.rows[0][5])).toContain(
        '/organisations/500001/registrations/R26ER1/accreditations/2026/packaging-recycling-notes/prn-001'
      )
      expect(htmlOf(result.table.rows[0][5])).not.toContain('prn-001/view')
    })

    it("sends a session holding no write scope to the note's read page, because Select issues or cancels it", () => {
      const result = buildListViewData(
        createMockRequest([...IDENTITIES.operatorWithoutWrite.scopes]),
        {
          yearOpen: true,
          keys: reprocessorKeys,
          registration: reprocessorRegistration,
          prns: stubPrns,
          wasteBalance: mockWasteBalance
        }
      )

      expect(htmlOf(result.table.rows[0][5])).toContain(
        '/organisations/500001/registrations/R26ER1/accreditations/2026/packaging-recycling-notes/prn-001/view'
      )
    })

    it('keeps the view link on an issued note for a session holding no write scope, because it only reads', () => {
      const result = buildListViewData(
        createMockRequest([...IDENTITIES.operatorWithoutWrite.scopes]),
        {
          yearOpen: true,
          keys: reprocessorKeys,
          registration: reprocessorRegistration,
          prns: stubPrns,
          issuedPrns: stubIssuedPrns,
          wasteBalance: mockWasteBalance
        }
      )

      expect(result.issuedTable.rows[0][6].html).toContain('prn-003/view')
    })
  })

  describe('hasCreatedPrns flag', () => {
    it('should pass through hasCreatedPrns as true when PRNs exist', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.hasCreatedPrns).toBe(true)
    })

    it('should pass through hasCreatedPrns as false when no PRNs exist', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: [],
        hasCreatedPrns: false,
        wasteBalance: mockWasteBalance
      })

      expect(result.hasCreatedPrns).toBe(false)
    })
  })

  describe('issued table', () => {
    it('should return issued table rows with PRN number, recipient and date issued', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        issuedPrns: stubIssuedPrns,
        hasCreatedPrns: true,

        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.rows).toHaveLength(3)
      expect(result.issuedTable.rows[0][0]).toStrictEqual({
        text: 'ER2612345'
      })
      expect(result.issuedTable.rows[0][1]).toStrictEqual({
        text: 'Radar',
        classes: 'epr-break-word'
      })
      expect(result.issuedTable.rows[0][2]).toStrictEqual({
        text: '29 January 2026'
      })
    })

    it('should return issued table status as govuk-tag', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        issuedPrns: stubIssuedPrns,
        hasCreatedPrns: true,

        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.rows[0][5].html).toContain('govuk-tag')
    })

    it('should return view links for each issued PRN with target="_blank"', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        issuedPrns: stubIssuedPrns,
        hasCreatedPrns: true,

        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.rows[0][6].html).toContain('govuk-link')
      expect(result.issuedTable.rows[0][6].html).toContain(
        '/organisations/500001/registrations/R26ER1/accreditations/2026/packaging-recycling-notes/prn-003/view'
      )
      expect(result.issuedTable.rows[0][6].html).toContain('target="_blank"')
    })

    it('should return empty issued table rows when no issued PRNs', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        issuedPrns: [],
        hasCreatedPrns: true,

        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.rows).toHaveLength(0)
    })
  })

  describe('cancellation table', () => {
    it('should return cancellation table rows with status tags', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        cancellationPrns: stubCancellationPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      // 2 data rows + 1 total row
      expect(result.cancellationTable.rows).toHaveLength(3)

      // First data row
      expect(result.cancellationTable.rows[0][0]).toStrictEqual({
        text: 'TFR Facilities',
        classes: 'epr-break-word'
      })
      expect(result.cancellationTable.rows[0][1]).toStrictEqual({
        text: '13 August 2025'
      })
      expect(result.cancellationTable.rows[0][2]).toStrictEqual({
        text: 5
      })
      expect(htmlOf(result.cancellationTable.rows[0][4])).toContain(
        'govuk-tag govuk-tag--yellow epr-tag--no-max-width'
      )
    })

    it('should return cancellation table with total row', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        cancellationPrns: stubCancellationPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      const totalRow = result.cancellationTable.rows[2]
      expect(totalRow[0].classes).toBe(cssClasses.fontWeight.bold)
      expect(totalRow[2].text).toBe(30) // 5 + 25
      expect(totalRow[2].classes).toBe(cssClasses.fontWeight.bold)
      expect(totalRow).toHaveLength(6)
    })

    it('should return cancellation table with select links', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        cancellationPrns: stubCancellationPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(htmlOf(result.cancellationTable.rows[0][5])).toContain(
        'govuk-link'
      )
      expect(htmlOf(result.cancellationTable.rows[0][5])).toContain(
        '/organisations/500001/registrations/R26ER1/accreditations/2026/packaging-recycling-notes/prn-cancel-001'
      )
    })

    it('should return empty cancellation table when no cancellation PRNs', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        cancellationPrns: [],
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancellationTable.rows).toHaveLength(0)
    })

    it('should default to empty cancellation table when cancellationPrns not provided', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancellationTable.rows).toHaveLength(0)
    })
  })

  describe('cancelled table', () => {
    it('should return cancelled table rows with PRN number, recipient and date issued', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        cancelledPrns: stubCancelledPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancelledTable.rows).toHaveLength(3)
      expect(result.cancelledTable.rows[0][0]).toStrictEqual({
        text: 'ER2611111'
      })
      expect(result.cancelledTable.rows[0][1]).toStrictEqual({
        text: 'Cancelled Corp',
        classes: 'epr-break-word'
      })
      expect(result.cancelledTable.rows[0][2]).toStrictEqual({
        text: '10 January 2026'
      })
      expect(result.cancelledTable.rows[0][3]).toStrictEqual({
        text: 40
      })
    })

    it('should return cancelled table status as govuk-tag with red colour', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        cancelledPrns: stubCancelledPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancelledTable.rows[0][5].html).toContain('govuk-tag--red')
    })

    it('should return view links for each cancelled PRN with target="_blank"', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        cancelledPrns: stubCancelledPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancelledTable.rows[0][6].html).toContain('govuk-link')
      expect(result.cancelledTable.rows[0][6].html).toContain(
        '/organisations/500001/registrations/R26ER1/accreditations/2026/packaging-recycling-notes/prn-005/view'
      )
      expect(result.cancelledTable.rows[0][6].html).toContain('target="_blank"')
    })

    it('should return empty cancelled table rows when no cancelled PRNs', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        cancelledPrns: [],
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancelledTable.rows).toHaveLength(0)
    })

    it('should default to empty cancelled table when cancelledPrns not provided', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancelledTable.rows).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('should handle null waste balance', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: stubPrns,
        hasCreatedPrns: true,
        wasteBalance: null
      })

      expect(result.wasteBalance.amount).toBe(0)
    })

    it('should handle empty PRN list', () => {
      const result = buildListViewData(createMockRequest(), {
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: [],
        hasCreatedPrns: false,
        wasteBalance: mockWasteBalance
      })

      expect(result.table.rows).toHaveLength(0)
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
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: prnAwaitingAcceptance,
        wasteBalance: mockWasteBalance
      })

      expect(htmlOf(result.table.rows[0][4])).toContain('govuk-tag--purple')
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
        yearOpen: true,
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        prns: prnWithUnknownStatus,
        wasteBalance: mockWasteBalance
      })

      expect(htmlOf(result.table.rows[0][4])).toContain('unknown_status')
    })
  })
})
