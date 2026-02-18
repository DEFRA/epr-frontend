import { describe, expect, it, vi } from 'vitest'
import { cssClasses } from '#server/common/constants/css-classes.js'
import { buildListViewData } from './list-view-data.js'

const createMockRequest = () => ({
  t: vi.fn((key, params = {}) => {
    const translations = {
      'prns:list:pageTitle': params.noteTypePlural,
      'prns:list:balanceHint': `This is the balance available for creating new ${params.noteTypePlural}`,
      'prns:list:cancelHint': `If you delete or cancel a ${params.noteType}, its tonnage will be added to your available waste balance.`,
      'prns:list:createLink': `Create a ${params.noteType}`,
      'prns:list:awaitingAuthorisationHeading': `${params.noteTypePlural} awaiting authorisation`,
      'prns:list:awaitingCancellationHeading': `${params.noteTypePlural} awaiting cancellation`,
      'prns:list:noIssuedPrns': `No ${params.noteTypePlural} have been issued yet.`,
      'prns:list:availableWasteBalance': 'Available waste balance',
      'prns:list:noPrns': 'No PRNs or PERNs have been created yet.',
      'prns:list:tabs:awaitingAction': 'Awaiting action',
      'prns:list:tabs:issued': 'Issued',
      'prns:list:selectHeading': `Select a ${params.noteType}`,
      'prns:list:table:recipientHeading': 'Producer or compliance scheme',
      'prns:list:table:dateHeading': 'Date created',
      'prns:list:table:tonnageHeading': 'Tonnage',
      'prns:list:table:statusHeading': 'Status',
      'prns:list:table:actionHeading': '',
      'prns:list:table:selectText': 'Select',
      'prns:list:table:totalLabel': 'Total',
      'prns:list:noPrnsCreated': `You have not created any ${params.noteTypePlural}.`,
      'prns:list:status:awaitingAuthorisation': 'Awaiting authorisation',
      'prns:list:status:awaitingAcceptance': 'Awaiting acceptance',
      'prns:list:status:accepted': 'Accepted',
      'prns:list:status:awaitingCancellation': 'Awaiting cancellation',
      'prns:list:status:cancelled': 'Cancelled',
      'prns:list:issuedHeading': `Issued ${params.noteTypePlural}`,
      'prns:list:issuedTable:noteNumberHeading': `${params.noteType} number`,
      'prns:list:issuedTable:recipientHeading': 'Producer or compliance scheme',
      'prns:list:issuedTable:dateIssuedHeading': 'Date issued',
      'prns:list:issuedTable:statusHeading': 'Status',
      'prns:list:issuedTable:tonnageHeading': 'Tonnage',
      'prns:list:issuedTable:actionHeading': 'View in new tab',
      'prns:list:issuedTable:selectText': 'Select'
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
    status: 'awaiting_authorisation'
  }
]

const stubCancellationPrns = [
  {
    id: 'prn-cancel-001',
    recipient: 'TFR Facilities',
    createdAt: '2025-08-13',
    tonnage: 5,
    status: 'awaiting_cancellation'
  },
  {
    id: 'prn-cancel-002',
    recipient: 'Linton Construction',
    createdAt: '2025-08-07',
    tonnage: 25,
    status: 'awaiting_cancellation'
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
        '/organisations/org-123/registrations/reg-001/accreditations/acc-001/packaging-recycling-notes/create'
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
        'This is the balance available for creating new PRNs'
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
      expect(result.table.rows[0][2]).toStrictEqual({ text: '50.00' })
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
      expect(totalRow[0].classes).toBe(cssClasses.fontWeightBold)
      expect(totalRow[2].text).toBe('170.00') // 50 + 120
      expect(totalRow[2].classes).toBe(cssClasses.fontWeightBold)
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

      expect(result.table.rows[0][3].html).toContain('govuk-tag--blue')
      expect(result.table.rows[0][3].html).toContain('Awaiting authorisation')
    })

    it('should return select link pointing to action page', () => {
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
        '/organisations/org-123/registrations/reg-001/accreditations/acc-001/packaging-recycling-notes/prn-001'
      )
      expect(result.table.rows[0][4].html).not.toContain('prn-001/view')
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
        'Producer or compliance scheme'
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

        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.rows).toHaveLength(3)
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

        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.rows[0][4].html).toContain(
        'Awaiting acceptance'
      )
      expect(result.issuedTable.rows[0][4].html).toContain('govuk-tag')
    })

    it('should return issued table headings for PRNs', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        issuedPrns: stubIssuedPrns,
        hasCreatedPrns: true,

        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.headings).toStrictEqual({
        prnNumber: 'PRN number',
        recipient: 'Producer or compliance scheme',
        dateIssued: 'Date issued',
        tonnage: 'Tonnage',
        status: 'Status',
        action: 'View in new tab'
      })
    })

    it('should return issued table headings for PERNs', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: exporterRegistration,
        prns: stubPrns,
        issuedPrns: stubIssuedPrns,
        hasCreatedPrns: true,

        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.headings).toStrictEqual({
        prnNumber: 'PERN number',
        recipient: 'Producer or compliance scheme',
        dateIssued: 'Date issued',
        tonnage: 'Tonnage',
        status: 'Status',
        action: 'View in new tab'
      })
    })

    it('should return view links for each issued PRN with target="_blank"', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        issuedPrns: stubIssuedPrns,
        hasCreatedPrns: true,

        wasteBalance: mockWasteBalance
      })

      expect(result.issuedTable.rows[0][5].html).toContain('govuk-link')
      expect(result.issuedTable.rows[0][5].html).toContain(
        '/organisations/org-123/registrations/reg-001/accreditations/acc-001/packaging-recycling-notes/prn-003/view'
      )
      expect(result.issuedTable.rows[0][5].html).toContain('target="_blank"')
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

        wasteBalance: mockWasteBalance
      })

      expect(result.issuedHeading).toBe('Issued PERNs')
    })
  })

  describe('cancellation table', () => {
    it('should return awaiting cancellation heading for PRNs', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        cancellationPrns: stubCancellationPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.awaitingCancellationHeading).toBe(
        'PRNs awaiting cancellation'
      )
    })

    it('should return awaiting cancellation heading for PERNs', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        accreditationId: 'acc-002',
        registration: exporterRegistration,
        prns: stubPrns,
        cancellationPrns: stubCancellationPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.awaitingCancellationHeading).toBe(
        'PERNs awaiting cancellation'
      )
    })

    it('should return cancellation table with correct headings', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        cancellationPrns: stubCancellationPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancellationTable.headings.recipient).toBe(
        'Producer or compliance scheme'
      )
      expect(result.cancellationTable.headings.createdAt).toBe('Date created')
      expect(result.cancellationTable.headings.tonnage).toBe('Tonnage')
      expect(result.cancellationTable.headings.status).toBe('Status')
    })

    it('should return cancellation table rows with status tags', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
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
        text: 'TFR Facilities'
      })
      expect(result.cancellationTable.rows[0][1]).toStrictEqual({
        text: '13 August 2025'
      })
      expect(result.cancellationTable.rows[0][2]).toStrictEqual({
        text: '5.00'
      })
      expect(result.cancellationTable.rows[0][3]).toStrictEqual({
        html: '<strong class="govuk-tag govuk-tag--yellow epr-tag--no-max-width">Awaiting cancellation</strong>'
      })
    })

    it('should return cancellation table with total row', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        cancellationPrns: stubCancellationPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      const totalRow = result.cancellationTable.rows[2]
      expect(totalRow[0].text).toBe('Total')
      expect(totalRow[0].classes).toBe(cssClasses.fontWeightBold)
      expect(totalRow[2].text).toBe('30.00') // 5 + 25
      expect(totalRow[2].classes).toBe(cssClasses.fontWeightBold)
    })

    it('should return cancellation table with select links', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        cancellationPrns: stubCancellationPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancellationTable.rows[0][4].html).toContain('govuk-link')
      expect(result.cancellationTable.rows[0][4].html).toContain(
        '/organisations/org-123/registrations/reg-001/accreditations/acc-001/packaging-recycling-notes/prn-cancel-001'
      )
    })

    it('should return empty cancellation table when no cancellation PRNs', () => {
      const result = buildListViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
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
        organisationId: 'org-123',
        registrationId: 'reg-001',
        accreditationId: 'acc-001',
        registration: reprocessorRegistration,
        prns: stubPrns,
        hasCreatedPrns: true,
        wasteBalance: mockWasteBalance
      })

      expect(result.cancellationTable.rows).toHaveLength(0)
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

      expect(result.table.rows[0][3].html).toContain('govuk-tag--purple')
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
