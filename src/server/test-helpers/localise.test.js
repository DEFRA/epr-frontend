import { describe, it, expect } from 'vitest'
import { createMockLocalise } from './localise.js'

describe('#createMockLocalise', () => {
  describe('passthrough mode (no translations)', () => {
    it('should return key when no translations provided', () => {
      const t = createMockLocalise()

      expect(t('prns:create:pageTitle')).toBe('prns:create:pageTitle')
    })

    it('should return key even when params provided', () => {
      const t = createMockLocalise()

      expect(t('prns:create:pageTitle', { noteType: 'PRN' })).toBe(
        'prns:create:pageTitle'
      )
    })
  })

  describe('with translations', () => {
    it('should return translated text for known key', () => {
      const t = createMockLocalise({
        'prns:create:pageTitle': 'Create a note'
      })

      expect(t('prns:create:pageTitle')).toBe('Create a note')
    })

    it('should return key for unknown translation', () => {
      const t = createMockLocalise({
        'prns:create:pageTitle': 'Create a note'
      })

      expect(t('prns:unknown:key')).toBe('prns:unknown:key')
    })
  })

  describe('interpolation', () => {
    it('should interpolate single param', () => {
      const t = createMockLocalise({
        'prns:create:pageTitle': 'Create a {{noteType}}'
      })

      expect(t('prns:create:pageTitle', { noteType: 'PRN' })).toBe(
        'Create a PRN'
      )
    })

    it('should interpolate multiple params', () => {
      const t = createMockLocalise({
        'prns:help:intro':
          '{{noteTypePlural}} can only be issued to {{recipientType}}'
      })

      expect(
        t('prns:help:intro', {
          noteTypePlural: 'PRNs',
          recipientType: 'producers'
        })
      ).toBe('PRNs can only be issued to producers')
    })

    it('should interpolate same param multiple times', () => {
      const t = createMockLocalise({
        'prns:message': 'The {{noteType}} is a valid {{noteType}}'
      })

      expect(t('prns:message', { noteType: 'PRN' })).toBe(
        'The PRN is a valid PRN'
      )
    })

    it('should convert numeric params to string', () => {
      const t = createMockLocalise({
        'prns:tonnage': 'Tonnage: {{value}} tonnes'
      })

      expect(t('prns:tonnage', { value: 100 })).toBe('Tonnage: 100 tonnes')
    })

    it('should leave unmatched placeholders unchanged', () => {
      const t = createMockLocalise({
        'prns:message': 'The {{noteType}} for {{recipient}}'
      })

      expect(t('prns:message', { noteType: 'PRN' })).toBe(
        'The PRN for {{recipient}}'
      )
    })
  })
})
