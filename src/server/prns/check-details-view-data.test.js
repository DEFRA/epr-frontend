import { describe, expect, it, vi } from 'vitest'
import { buildCheckDetailsViewData } from './check-details-view-data.js'

const createMockRequest = () => ({
  t: vi.fn((key) => {
    const translations = {
      'prns:checkDetails:prns:pageTitle': 'Check before creating PRN',
      'prns:checkDetails:perns:pageTitle': 'Check before creating PERN',
      'prns:checkDetails:prns:leadParagraph':
        'Check the following information is correct before creating this PRN.',
      'prns:checkDetails:perns:leadParagraph':
        'Check the following information is correct before creating this PERN.',
      'prns:checkDetails:insetText':
        'Any information not shown here will be automatically populated when the PRN is issued.',
      'prns:checkDetails:prns:detailsHeading': 'PRN details',
      'prns:checkDetails:perns:detailsHeading': 'PERN details',
      'prns:checkDetails:recipient':
        'Packaging waste producer or compliance scheme',
      'prns:checkDetails:tonnage': 'Tonnage',
      'prns:checkDetails:tonnageInWords': 'Tonnage in words',
      'prns:checkDetails:processToBeUsed': 'Process to be used',
      'prns:checkDetails:decemberWaste': 'December waste',
      'prns:checkDetails:issuedDate': 'Issued date',
      'prns:checkDetails:issuedBy': 'Issued by',
      'prns:checkDetails:authorisedBy': 'Authorised by',
      'prns:checkDetails:position': 'Position',
      'prns:checkDetails:issuerNotes': 'Issuer notes',
      'prns:checkDetails:notProvided': 'Not provided',
      'prns:checkDetails:accreditationDetailsHeading': 'Accreditation details',
      'prns:checkDetails:material': 'Material',
      'prns:checkDetails:accreditationNumber': 'Accreditation number',
      'prns:checkDetails:accreditationAddress': 'Accreditation address',
      'prns:checkDetails:prns:createButton': 'Create PRN',
      'prns:checkDetails:perns:createButton': 'Create PERN',
      'prns:checkDetails:cancelButton': 'Cancel without saving'
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

const mockAccreditation = {
  material: 'Plastic',
  accreditationNumber: '090925',
  address: 'South Road, Liverpool, L22 3DH'
}

describe('#buildCheckDetailsViewData', () => {
  describe('for reprocessor (PRN)', () => {
    it('should return page title and heading with PRN text', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.pageTitle).toBe('Check before creating PRN')
      expect(result.heading).toBe('Check before creating PRN')
    })

    it('should return lead paragraph with PRN text', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.leadParagraph).toBe(
        'Check the following information is correct before creating this PRN.'
      )
    })

    it('should return PRN details heading', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.prnDetailsHeading).toBe('PRN details')
    })

    it('should return create button text with PRN', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.createButtonText).toBe('Create PRN')
    })
  })

  describe('for exporter (PERN)', () => {
    it('should return page title and heading with PERN text', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: exporterRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-456',
        registrationId: 'reg-002'
      })

      expect(result.pageTitle).toBe('Check before creating PERN')
      expect(result.heading).toBe('Check before creating PERN')
    })

    it('should return lead paragraph with PERN text', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: exporterRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-456',
        registrationId: 'reg-002'
      })

      expect(result.leadParagraph).toBe(
        'Check the following information is correct before creating this PERN.'
      )
    })

    it('should return PERN details heading', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: exporterRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-456',
        registrationId: 'reg-002'
      })

      expect(result.prnDetailsHeading).toBe('PERN details')
    })

    it('should return create button text with PERN', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: exporterRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-456',
        registrationId: 'reg-002'
      })

      expect(result.createButtonText).toBe('Create PERN')
    })
  })

  describe('common fields', () => {
    it('should return inset text', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.insetText).toBe(
        'Any information not shown here will be automatically populated when the PRN is issued.'
      )
    })

    it('should return cancel button text', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.cancelButtonText).toBe('Cancel without saving')
    })

    it('should return accreditation details heading', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.accreditationDetailsHeading).toBe('Accreditation details')
    })
  })

  describe('prn details summary list', () => {
    it('should return 10 rows with correct keys for first 5 fields', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.prnDetails).toHaveLength(10)
      expect(result.prnDetails[0].key.text).toBe(
        'Packaging waste producer or compliance scheme'
      )
      expect(result.prnDetails[1].key.text).toBe('Tonnage')
      expect(result.prnDetails[2].key.text).toBe('Tonnage in words')
      expect(result.prnDetails[3].key.text).toBe('Process to be used')
    })

    it('should return correct keys for remaining fields', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.prnDetails[4].key.text).toBe('December waste')
      expect(result.prnDetails[5].key.text).toBe('Issued date')
      expect(result.prnDetails[6].key.text).toBe('Issued by')
      expect(result.prnDetails[7].key.text).toBe('Authorised by')
      expect(result.prnDetails[8].key.text).toBe('Position')
    })

    it('should return correct key for issuer notes', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.prnDetails[9].key.text).toBe('Issuer notes')
    })

    it('should have width class on all keys', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      result.prnDetails.forEach((row) => {
        expect(row.key.classes).toBe('govuk-!-width-one-half')
      })
    })

    it('should show "Not provided" for issuer notes when empty', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.prnDetails[9].value.text).toBe('Not provided')
    })
  })

  describe('accreditation details summary list', () => {
    it('should return 3 rows with correct keys', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.accreditationDetails).toHaveLength(3)
      expect(result.accreditationDetails[0].key.text).toBe('Material')
      expect(result.accreditationDetails[1].key.text).toBe(
        'Accreditation number'
      )
      expect(result.accreditationDetails[2].key.text).toBe(
        'Accreditation address'
      )
    })

    it('should have width class on all keys', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      result.accreditationDetails.forEach((row) => {
        expect(row.key.classes).toBe('govuk-!-width-one-half')
      })
    })

    it('should populate values from accreditation data', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.accreditationDetails[0].value.text).toBe('Plastic')
      expect(result.accreditationDetails[1].value.text).toBe('090925')
      expect(result.accreditationDetails[2].value.text).toBe(
        'South Road, Liverpool, L22 3DH'
      )
    })

    it('should handle missing accreditation gracefully', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: undefined,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.accreditationDetails[0].value.text).toBe('')
      expect(result.accreditationDetails[1].value.text).toBe('')
      expect(result.accreditationDetails[2].value.text).toBe('')
    })

    it('should handle partial accreditation data', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: { material: 'Glass' },
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.accreditationDetails[0].value.text).toBe('Glass')
      expect(result.accreditationDetails[1].value.text).toBe('')
      expect(result.accreditationDetails[2].value.text).toBe('')
    })
  })

  describe('urls', () => {
    it('should build correct createUrl', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.createUrl).toBe(
        '/organisations/org-123/registrations/reg-001/create-prn/check-details'
      )
    })

    it('should build correct cancelUrl', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.cancelUrl).toBe(
        '/organisations/org-123/registrations/reg-001'
      )
    })

    it('should build correct backUrl', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001'
      })

      expect(result.backUrl).toBe(
        '/organisations/org-123/registrations/reg-001/create-prn'
      )
    })
  })

  describe('noteType detection', () => {
    it.for([
      { type: 'exporter', expected: true },
      { type: 'reprocessor-input', expected: false },
      { type: 'reprocessor-output', expected: false }
    ])(
      'should detect PERN=$expected for wasteProcessingType=$type',
      ({ type, expected }) => {
        const result = buildCheckDetailsViewData(createMockRequest(), {
          registration: {
            ...reprocessorRegistration,
            wasteProcessingType: type
          },
          accreditation: mockAccreditation,
          organisationId: 'org-123',
          registrationId: 'reg-001'
        })

        const isPern = result.pageTitle.includes('PERN')

        expect(isPern).toBe(expected)
      }
    )
  })
})
