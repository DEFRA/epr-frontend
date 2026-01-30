import { describe, expect, it, vi } from 'vitest'
import { buildCreateViewData } from './view-data.js'
import { organisations } from '../../../../../fixtures/waste-organisations/organisations.json'
import prns from '../../en.json'

const createMockRequest = () => ({
  t: vi.fn((key) => {
    const [, depth1, depth2, depth3] = key.split(':')

    return (
      prns[depth1]?.[depth2]?.[depth3] ||
      prns[depth1]?.[depth2] ||
      prns[depth1] ||
      key
    )
  })
})

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
  describe('for reprocessor (PRN)', () => {
    it('should return page title and heading with PRN text', () => {
      const result = buildCreateViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        recipients: organisations
      })

      expect(result.pageTitle).toBe('Create a PRN')
      expect(result.heading).toBe('Create a PRN')
    })

    it('should return form labels with PRN text', () => {
      const result = buildCreateViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        recipients: organisations
      })

      expect(result.tonnage.label).toBe('Enter PRN tonnage')
      expect(result.recipient.label).toBe(
        'Enter who this PRN will be issued to'
      )
      expect(result.notes.hint).toBe('These notes will appear on the PRN')
      expect(result.help.text).toContain('PRNs can only be issued')
    })

    it('should include recipient options with placeholder', () => {
      const result = buildCreateViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        recipients: organisations
      })

      expect(result.recipient.items).toStrictEqual([
        {
          text: 'Select an option',
          value: ''
        },
        {
          text: 'Acme Compliance Scheme, 37th Place, Ashfield, Chicago, W1 L3Y',
          value: '9eb099a7-bda0-456c-96ba-e0af3fdb9cde'
        },
        {
          text: 'Bigco Packaging Ltd, Zig Zag road, Box Hill, Tadworth, KT20 7LB',
          value: 'dd793573-b218-47a7-be85-1c777ca0d0d8'
        },
        {
          text: 'Green Waste Solutions, 1 Worlds End Lane, Green St Green, BR6 6AG, England',
          value: 'b7b158e1-c72f-45d4-8868-5c6e14bc10af'
        }
      ])
    })
  })

  describe('for exporter (PERN)', () => {
    it('should return page title and heading with PERN text', () => {
      const result = buildCreateViewData(createMockRequest(), {
        registration: exporterRegistration,
        recipients: organisations
      })

      expect(result.pageTitle).toBe('Create a PERN')
      expect(result.heading).toBe('Create a PERN')
    })

    it('should return form labels with PERN text', () => {
      const result = buildCreateViewData(createMockRequest(), {
        registration: exporterRegistration,
        recipients: organisations
      })

      expect(result.tonnage.label).toBe('Enter PERN tonnage')
      expect(result.recipient.label).toBe(
        'Enter who this PERN will be issued to'
      )
      expect(result.notes.hint).toBe('These notes will appear on the PERN')
      expect(result.help.text).toContain('PERNs can only be issued')
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
          registration: {
            ...reprocessorRegistration,
            wasteProcessingType: type
          },
          recipients: organisations
        })

        const isPern = result.pageTitle.includes('PERN')

        expect(isPern).toBe(expected)
      }
    )
  })
})
