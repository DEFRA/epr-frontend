import { describe, expect, it, vi } from 'vitest'

import { createMockLocalise } from '#server/test-helpers/localise.js'
import { organisations } from '../../../../../fixtures/waste-organisations/organisations.json'
import { buildCreateViewData } from './view-data.js'

const translations = {
  'prns:selectOption': 'Select an option',
  'prns:create:pageTitle': 'Create a {{noteType}}',
  'prns:create:tonnageLabel': 'Enter {{noteType}} tonnage',
  'prns:create:recipientLabel': 'Enter who this {{noteType}} will be issued to',
  'prns:create:notesHint': 'These notes will appear on the {{noteType}}',
  'prns:create:helpSummary': "Can't find the producer or compliance scheme?",
  'prns:create:help:intro':
    '{{noteTypePlural}} can only be issued to packaging waste producers and compliance schemes who have registered with regulators.',
  'prns:create:help:listIntro':
    "If the buyer you're looking for is not appearing, check that:",
  'prns:create:help:listItemOne': 'you have spelled the name correctly',
  'prns:create:help:listItemTwo': 'they are registered with a regulator'
}

const createMockRequest = () => ({
  t: vi.fn(createMockLocalise(translations))
})

const stubOrganisationId = 'org-123'
const stubRegistrationId = 'reg-456'

const reprocessorRegistration = {
  id: 'reg-001',
  wasteProcessingType: 'reprocessor-input', // PRN
  material: 'glass'
}

const exporterRegistration = {
  id: 'reg-002',
  wasteProcessingType: 'exporter', // PERN
  material: 'plastic'
}

describe('#buildCreateViewData', () => {
  it('should return backUrl using organisation and registration IDs', () => {
    const result = buildCreateViewData(createMockRequest(), {
      organisationId: stubOrganisationId,
      recipients: organisations,
      registration: reprocessorRegistration,
      registrationId: stubRegistrationId
    })

    expect(result.backUrl).toBe(
      `/organisations/${stubOrganisationId}/registrations/${stubRegistrationId}`
    )
  })

  describe('for reprocessor (PRN)', () => {
    it('should return page title and heading with PRN text', () => {
      const result = buildCreateViewData(createMockRequest(), {
        organisationId: stubOrganisationId,
        recipients: organisations,
        registration: reprocessorRegistration,
        registrationId: stubRegistrationId
      })

      expect(result.pageTitle).toBe('Create a PRN')
      expect(result.heading).toBe('Create a PRN')
    })

    it('should return form labels with PRN text', () => {
      const result = buildCreateViewData(createMockRequest(), {
        organisationId: stubOrganisationId,
        recipients: organisations,
        registration: reprocessorRegistration,
        registrationId: stubRegistrationId
      })

      expect(result.tonnage.label).toBe('Enter PRN tonnage')
      expect(result.recipient.label).toBe(
        'Enter who this PRN will be issued to'
      )
      expect(result.notes.hint).toBe('These notes will appear on the PRN')
      expect(result.help).toStrictEqual({
        summary: "Can't find the producer or compliance scheme?",
        intro:
          'PRNs can only be issued to packaging waste producers and compliance schemes who have registered with regulators.',
        listIntro:
          "If the buyer you're looking for is not appearing, check that:",
        listItemOne: 'you have spelled the name correctly',
        listItemTwo: 'they are registered with a regulator'
      })
    })

    it('should include recipient options with placeholder', () => {
      const result = buildCreateViewData(createMockRequest(), {
        organisationId: stubOrganisationId,
        recipients: organisations,
        registration: reprocessorRegistration,
        registrationId: stubRegistrationId
      })

      expect(result.recipient.items).toHaveLength(4) // placeholder + 3 options
      expect(result.recipient.items).toStrictEqual([
        {
          selected: false,
          text: 'Select an option',
          value: ''
        },
        {
          selected: false,
          text: 'Acme Compliance Scheme, 37th Place, Ashfield, Chicago, W1 L3Y',
          value: '9eb099a7-bda0-456c-96ba-e0af3fdb9cde'
        },
        {
          selected: false,
          text: 'Bigco Packaging Ltd, Zig Zag road, Box Hill, Tadworth, KT20 7LB',
          value: 'dd793573-b218-47a7-be85-1c777ca0d0d8'
        },
        {
          selected: false,
          text: 'Green Waste Solutions, 1 Worlds End Lane, Green St Green, BR6 6AG, England',
          value: 'b7b158e1-c72f-45d4-8868-5c6e14bc10af'
        }
      ])
    })
  })

  describe('for exporter (PERN)', () => {
    it('should return page title and heading with PERN text', () => {
      const result = buildCreateViewData(createMockRequest(), {
        organisationId: stubOrganisationId,
        registration: exporterRegistration,
        registrationId: stubRegistrationId,
        recipients: organisations
      })

      expect(result.pageTitle).toBe('Create a PERN')
      expect(result.heading).toBe('Create a PERN')
    })

    it('should return form labels with PERN text', () => {
      const result = buildCreateViewData(createMockRequest(), {
        organisationId: stubOrganisationId,
        recipients: organisations,
        registration: exporterRegistration,
        registrationId: stubRegistrationId
      })

      expect(result.tonnage.label).toBe('Enter PERN tonnage')
      expect(result.recipient.label).toBe(
        'Enter who this PERN will be issued to'
      )
      expect(result.notes.hint).toBe('These notes will appear on the PERN')
      expect(result.help).toStrictEqual({
        summary: "Can't find the producer or compliance scheme?",
        intro:
          'PERNs can only be issued to packaging waste producers and compliance schemes who have registered with regulators.',
        listIntro:
          "If the buyer you're looking for is not appearing, check that:",
        listItemOne: 'you have spelled the name correctly',
        listItemTwo: 'they are registered with a regulator'
      })
    })
  })

  describe('recipient sorting', () => {
    it('should sort recipient options alphabetically by name', () => {
      const unsortedRecipients = [
        {
          id: 'zebra-id',
          name: 'Zebra Corp',
          tradingName: null,
          address: {
            addressLine1: '1 Zoo Lane',
            town: 'London',
            postcode: 'Z1 1ZZ'
          }
        },
        {
          id: 'alpha-id',
          name: 'Alpha Ltd',
          tradingName: null,
          address: {
            addressLine1: '1 First St',
            town: 'Bristol',
            postcode: 'A1 1AA'
          }
        },
        {
          id: 'middle-id',
          name: 'Middle Inc',
          tradingName: null,
          address: {
            addressLine1: '1 Mid Road',
            town: 'Leeds',
            postcode: 'M1 1MM'
          }
        }
      ]

      const result = buildCreateViewData(createMockRequest(), {
        organisationId: stubOrganisationId,
        recipients: unsortedRecipients,
        registration: reprocessorRegistration,
        registrationId: stubRegistrationId
      })

      const recipientNames = result.recipient.items.map(
        (item) => item.text.split(',')[0]
      )

      expect(recipientNames).toStrictEqual([
        'Select an option',
        'Alpha Ltd',
        'Middle Inc',
        'Zebra Corp'
      ])
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
        const result = buildCreateViewData(createMockRequest(), {
          organisationId: stubOrganisationId,
          recipients: organisations,
          registration: {
            ...reprocessorRegistration,
            wasteProcessingType: type
          },
          registrationId: stubRegistrationId
        })

        const isPern = result.pageTitle.includes('PERN')

        expect(isPern).toBe(expected)
      }
    )
  })
})
