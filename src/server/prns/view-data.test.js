import { describe, expect, it, vi } from 'vitest'
import { buildRegistrationView } from '#server/common/test-helpers/organisation-view-fixtures.js'
import { mockHapiRequest } from '#server/common/test-helpers/request-fixtures.js'
import { DECEMBER_WASTE_CONTROL } from './helpers/december-waste-control.js'
import { buildCreatePrnViewData } from './view-data.js'

const noDecemberControl = { mode: DECEMBER_WASTE_CONTROL.none }

/**
 * @import { RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 */

const createMockRequest = () =>
  mockHapiRequest({
    t: vi.fn((key, params = {}) => {
      const translations = {
        'prns:create:caption': `Create ${params.noteType}`,
        'prns:create:pageTitle': `Enter ${params.noteType} details`,
        'prns:materialLabel': 'Material',
        'prns:create:tonnageLabel': `Enter ${params.noteType} tonnage`,
        'prns:tonnageHint': 'Enter a whole number without decimal places',
        'prns:tonnageSuffix': 'tonnes',
        'prns:create:recipientLabel': `Who will this ${params.noteType} be issued to?`,
        'prns:recipientHint':
          'Start typing the name of the packaging producer or compliance scheme',
        'prns:selectOption': 'Select an option',
        'prns:help:summary': "Can't find the producer or compliance scheme?",
        'prns:create:helpIntro': `${params.noteTypePlural} can only be issued to packaging producers and compliance schemes who have registered with regulators.`,
        'prns:help:listIntro':
          "If the producer or compliance scheme you're looking for is not appearing, check that:",
        'prns:help:listItemOne': 'you have spelled the name correctly',
        'prns:help:listItemTwo': 'they are registered with a regulator',
        'prns:notesLabel': 'Add issuer notes (optional)',
        'prns:create:notesHint': `These notes will appear on the ${params.noteType}`,
        'prns:create:submitButton': 'Continue'
      }
      return translations[key] || key
    })
  })

const stubRecipients = [
  { value: 'org-1', text: 'Acme Compliance Scheme' },
  { value: 'org-2', text: 'BigCo Packaging Ltd' },
  { value: 'org-3', text: 'Green Waste Solutions' }
]

const reprocessorRegistration = buildRegistrationView({
  wasteProcessingType: 'reprocessor', // PRN
  reprocessingType: 'input',
  material: 'glass_re_melt',
  site: { address: { fullAddress: 'Unit 4, Leeds' } }
})

const exporterRegistration = buildRegistrationView({
  wasteProcessingType: 'exporter', // PERN
  material: 'plastic'
})

const reprocessorKeys = {
  organisationNumber: '500123',
  registrationNumber: 'R26EN0000000001PL',
  year: '2026'
}

const exporterKeys = {
  organisationNumber: '500456',
  registrationNumber: 'E26EN0000000002PL',
  year: '2026'
}

describe('#buildCreatePrnViewData', () => {
  describe('decemberWaste', () => {
    it('is null in none mode', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        recipients: stubRecipients,
        decemberWasteControl: noDecemberControl
      })

      expect(result.decemberWaste).toBeNull()
    })

    it('is present in manual mode', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        recipients: stubRecipients,
        decemberWasteControl: {
          mode: DECEMBER_WASTE_CONTROL.declareManually,
          legend: 'Is this December waste?',
          items: [
            { value: 'false', text: 'No' },
            { value: 'true', text: 'Yes' }
          ]
        }
      })

      expect(result.decemberWaste).not.toBeNull()
      expect(result.decemberWaste.items).toStrictEqual([
        { value: 'false', text: 'No' },
        { value: 'true', text: 'Yes' }
      ])
      expect(result.wasteBalanceText).toBeNull()
    })

    it('is present in pool mode, and the inset text switches to the either-balance wording', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        recipients: stubRecipients,
        wasteBalance: { amount: 60, availableAmount: 60 },
        decemberWasteControl: {
          mode: DECEMBER_WASTE_CONTROL.selectPool,
          legend: 'Select which waste balance',
          items: [
            { value: 'true', text: 'December waste balance (50.00 tonnes)' },
            {
              value: 'false',
              text: 'Non-December waste balance (10.00 tonnes)'
            }
          ],
          insetText: 'You can create PRNs from either waste balance.'
        }
      })

      expect(result.decemberWaste.items).toStrictEqual([
        { value: 'true', text: 'December waste balance (50.00 tonnes)' },
        { value: 'false', text: 'Non-December waste balance (10.00 tonnes)' }
      ])
      expect(result.wasteBalanceText).toBe(
        'You can create PRNs from either waste balance.'
      )
    })
  })

  describe('for reprocessor (PRN)', () => {
    it('should return caption, page title and heading with PRN text', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        recipients: stubRecipients,
        decemberWasteControl: noDecemberControl
      })

      expect(result.caption).toBe('Create PRN')
      expect(result.pageTitle).toBe('Enter PRN details')
      expect(result.heading).toBe('Enter PRN details')
    })

    it('should return material with display name', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        recipients: stubRecipients,
        decemberWasteControl: noDecemberControl
      })

      expect(result.material.label).toBe('Material')
      expect(result.material.value).toBe('Glass remelt')
    })

    it('should return form labels with PRN text', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        recipients: stubRecipients,
        decemberWasteControl: noDecemberControl
      })

      expect(result.tonnage.label).toBe('Enter PRN tonnage')
      expect(result.recipient.label).toBe('Who will this PRN be issued to?')
      expect(result.notes.hint).toBe('These notes will appear on the PRN')
      expect(result.notes.maxLength).toBe(200)
      expect(result.help.intro).toContain('PRNs can only be issued')
    })

    it('should return backUrl to the registration page for the year', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        recipients: stubRecipients,
        decemberWasteControl: noDecemberControl
      })

      expect(result.backUrl).toBe(
        '/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026'
      )
    })

    it('should include recipient options with placeholder', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        recipients: stubRecipients,
        decemberWasteControl: noDecemberControl
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
    it('should return caption, page title and heading with PERN text', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: exporterKeys,
        registration: exporterRegistration,
        recipients: stubRecipients,
        decemberWasteControl: noDecemberControl
      })

      expect(result.caption).toBe('Create PERN')
      expect(result.pageTitle).toBe('Enter PERN details')
      expect(result.heading).toBe('Enter PERN details')
    })

    it('should return material with display name for non-glass', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: exporterKeys,
        registration: exporterRegistration,
        recipients: stubRecipients,
        decemberWasteControl: noDecemberControl
      })

      expect(result.material.label).toBe('Material')
      expect(result.material.value).toBe('Plastic')
    })

    it('should return form labels with PERN text', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: exporterKeys,
        registration: exporterRegistration,
        recipients: stubRecipients,
        decemberWasteControl: noDecemberControl
      })

      expect(result.tonnage.label).toBe('Enter PERN tonnage')
      expect(result.recipient.label).toBe('Who will this PERN be issued to?')
      expect(result.notes.hint).toBe('These notes will appear on the PERN')
      expect(result.help.intro).toContain('PERNs can only be issued')
    })
  })

  describe('noteType detection', () => {
    it.for([
      { type: 'exporter', expected: true },
      { type: 'reprocessor', expected: false }
    ])(
      'should detect PERN=$expected for wasteProcessingType=$type',
      ({ type, expected }) => {
        const result = buildCreatePrnViewData(createMockRequest(), {
          keys: reprocessorKeys,
          registration: /** @type {RegistrationView} */ ({
            ...reprocessorRegistration,
            wasteProcessingType: type
          }),
          recipients: stubRecipients,
          decemberWasteControl: noDecemberControl
        })

        const isPern = result.pageTitle.includes('PERN')

        expect(isPern).toBe(expected)
      }
    )
  })
})
