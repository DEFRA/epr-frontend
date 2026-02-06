import { describe, expect, it, vi } from 'vitest'
import { buildCreatePrnViewData } from './view-data.js'

const createMockRequest = () => ({
  t: vi.fn((key) => {
    const translations = {
      'lprns:prns:pageTitle': 'Create a PRN',
      'lprns:perns:pageTitle': 'Create a PERN',
      'lprns:materialLabel': 'Material',
      'lprns:prns:tonnageLabel': 'Enter PRN tonnage',
      'lprns:perns:tonnageLabel': 'Enter PERN tonnage',
      'lprns:tonnageHint': 'Enter a whole number without decimal places',
      'lprns:tonnageSuffix': 'tonnes',
      'lprns:prns:recipientLabel': 'Enter who this PRN will be issued to',
      'lprns:perns:recipientLabel': 'Enter who this PERN will be issued to',
      'lprns:recipientHint':
        'Start typing the name of the packaging waste producer or compliance scheme',
      'lprns:selectOption': 'Select an option',
      'lprns:helpSummary': "Can't find the producer or compliance scheme?",
      'lprns:prns:helpIntro':
        'PRNs can only be issued to packaging waste producers and compliance schemes who have registered with regulators.',
      'lprns:perns:helpIntro':
        'PERNs can only be issued to packaging waste producers and compliance schemes who have registered with regulators.',
      'lprns:helpListIntro':
        "If the buyer you're looking for is not appearing, check that:",
      'lprns:helpListItemOne': 'you have spelled the name correctly',
      'lprns:helpListItemTwo': 'they are registered with a regulator',
      'lprns:notesLabel': 'Add issuer notes (optional)',
      'lprns:prns:notesHint': 'These notes will appear on the PRN',
      'lprns:perns:notesHint': 'These notes will appear on the PERN',
      'lprns:prns:submitButton': 'Create PRN',
      'lprns:perns:submitButton': 'Create PERN'
    }
    return translations[key] || key
  })
})

const stubRecipients = [
  { value: 'org-1', text: 'Acme Compliance Scheme' },
  { value: 'org-2', text: 'BigCo Packaging Ltd' },
  { value: 'org-3', text: 'Green Waste Solutions' }
]

const reprocessorRegistration = {
  id: 'reg-001',
  wasteProcessingType: 'reprocessor-input', // PRN
  material: 'glass',
  glassRecyclingProcess: ['glass_re_melt']
}

const exporterRegistration = {
  id: 'reg-002',
  wasteProcessingType: 'exporter', // PERN
  material: 'plastic'
}

describe('#buildCreatePrnViewData', () => {
  describe('for reprocessor (PRN)', () => {
    it('should return page title and heading with PRN text', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        recipients: stubRecipients
      })

      expect(result.pageTitle).toBe('Create a PRN')
      expect(result.heading).toBe('Create a PRN')
    })

    it('should return material with display name', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        recipients: stubRecipients
      })

      expect(result.material.label).toBe('Material')
      expect(result.material.value).toBe('Glass remelt')
    })

    it('should return form labels with PRN text', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        recipients: stubRecipients
      })

      expect(result.tonnage.label).toBe('Enter PRN tonnage')
      expect(result.recipient.label).toBe(
        'Enter who this PRN will be issued to'
      )
      expect(result.notes.hint).toBe('These notes will appear on the PRN')
      expect(result.notes.maxLength).toBe(200)
      expect(result.help.intro).toContain('PRNs can only be issued')
    })

    it('should return backUrl from organisationId and registrationId', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        recipients: stubRecipients
      })

      expect(result.backUrl).toBe(
        '/organisations/org-123/registrations/reg-001'
      )
    })

    it('should include recipient options with placeholder', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        organisationId: 'org-123',
        registrationId: 'reg-001',
        registration: reprocessorRegistration,
        recipients: stubRecipients
      })

      expect(result.recipient.items).toHaveLength(4) // placeholder + 3 options
      expect(result.recipient.items[0]).toStrictEqual({
        value: '',
        text: 'Select an option'
      })
      expect(result.recipient.items[1]).toStrictEqual({
        value: 'org-1',
        text: 'Acme Compliance Scheme'
      })
    })
  })

  describe('for exporter (PERN)', () => {
    it('should return page title and heading with PERN text', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        registration: exporterRegistration,
        recipients: stubRecipients
      })

      expect(result.pageTitle).toBe('Create a PERN')
      expect(result.heading).toBe('Create a PERN')
    })

    it('should return material with display name for non-glass', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        registration: exporterRegistration,
        recipients: stubRecipients
      })

      expect(result.material.label).toBe('Material')
      expect(result.material.value).toBe('Plastic')
    })

    it('should return form labels with PERN text', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        organisationId: 'org-456',
        registrationId: 'reg-002',
        registration: exporterRegistration,
        recipients: stubRecipients
      })

      expect(result.tonnage.label).toBe('Enter PERN tonnage')
      expect(result.recipient.label).toBe(
        'Enter who this PERN will be issued to'
      )
      expect(result.notes.hint).toBe('These notes will appear on the PERN')
      expect(result.help.intro).toContain('PERNs can only be issued')
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
        const result = buildCreatePrnViewData(createMockRequest(), {
          organisationId: 'org-123',
          registrationId: 'reg-001',
          registration: {
            ...reprocessorRegistration,
            wasteProcessingType: type
          },
          recipients: stubRecipients
        })

        const isPern = result.pageTitle.includes('PERN')

        expect(isPern).toBe(expected)
      }
    )
  })
})
