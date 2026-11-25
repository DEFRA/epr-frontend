import { toYear } from '#server/common/helpers/year.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { describe, expect, it } from 'vitest'
import { buildRegistrationView } from '#server/common/test-helpers/organisation-view-fixtures.js'
import { mockHapiRequest } from '#server/common/test-helpers/request-fixtures.js'
import { createMockLocalise } from '#server/test-helpers/localise.js'
import { DECEMBER_WASTE_CONTROL } from './helpers/december-waste-control.js'
import { buildCreatePrnViewData } from './view-data.js'

const noDecemberControl = { mode: DECEMBER_WASTE_CONTROL.none }

const createMockRequest = () => mockHapiRequest({ t: createMockLocalise() })

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
  organisationNumber: toOrganisationNumber('500123'),
  registrationNumber: toRegistrationNumber('R26EN0000000001PL'),
  year: toYear(2026)
}

const exporterKeys = {
  organisationNumber: toOrganisationNumber('500456'),
  registrationNumber: toRegistrationNumber('E26EN0000000002PL'),
  year: toYear(2026)
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
    it('should return material with display name', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        recipients: stubRecipients,
        decemberWasteControl: noDecemberControl
      })

      expect(result.material.value).toBe('Glass remelt')
    })

    it('should cap notes at 200 characters', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: reprocessorKeys,
        registration: reprocessorRegistration,
        recipients: stubRecipients,
        decemberWasteControl: noDecemberControl
      })

      expect(result.notes.maxLength).toBe(200)
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
      expect(result.recipient.items[0].value).toBe('')
      expect(result.recipient.items[1]).toStrictEqual({
        value: 'org-1',
        text: 'Acme Compliance Scheme'
      })
    })
  })

  describe('for exporter (PERN)', () => {
    it('should return material with display name for non-glass', () => {
      const result = buildCreatePrnViewData(createMockRequest(), {
        keys: exporterKeys,
        registration: exporterRegistration,
        recipients: stubRecipients,
        decemberWasteControl: noDecemberControl
      })

      expect(result.material.value).toBe('Plastic')
    })
  })
})
