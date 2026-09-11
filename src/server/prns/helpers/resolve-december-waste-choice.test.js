import { describe, expect, it } from 'vitest'

import { DECEMBER_WASTE_CONTROL } from './december-waste-control.js'
import { resolveDecemberWasteControl } from './resolve-december-waste-choice.js'

const localise = (key, params) =>
  params ? `${key}:${JSON.stringify(params)}` : key

/**
 * Narrows a DecemberWasteControl to its pool-mode shape for assertions.
 * @param {DecemberWasteControl} control
 */
const asPoolControl = (control) => {
  expect(control.mode).toBe(DECEMBER_WASTE_CONTROL.selectPool)
  return /** @type {Extract<DecemberWasteControl, { mode: 'pool' }>} */ (
    control
  )
}

/**
 * @import { DecemberWasteControl } from './resolve-december-waste-choice.js'
 */

describe(resolveDecemberWasteControl, () => {
  describe('pool mode', () => {
    it('shows the balance radios when the accreditation accrues December and the window is open', () => {
      const result = resolveDecemberWasteControl(
        {
          accruesDecemberWasteBalance: true,
          declaresDecemberWasteManually: false,
          windowOpen: true
        },
        localise,
        'PRNs',
        {
          amount: 60,
          availableAmount: 60,
          decemberAmount: 50,
          decemberAvailableAmount: 50
        }
      )

      const control = asPoolControl(result)
      expect(control.items).toStrictEqual([
        {
          value: 'true',
          text: localise('prns:create:decemberBalanceOption', {
            balance: '50.00'
          })
        },
        {
          value: 'false',
          text: localise('prns:create:nonDecemberBalanceOption', {
            balance: '10.00'
          })
        }
      ])
      expect(control.insetText).toBe(
        localise('prns:create:wasteBalanceEitherText', {
          noteTypePlural: 'PRNs'
        })
      )
    })

    it('reserves December out of the general figure', () => {
      const result = resolveDecemberWasteControl(
        {
          accruesDecemberWasteBalance: true,
          declaresDecemberWasteManually: false,
          windowOpen: true
        },
        localise,
        'PRNs',
        { amount: 80, availableAmount: 80, decemberAvailableAmount: 50 }
      )

      expect(asPoolControl(result).items[1].text).toBe(
        localise('prns:create:nonDecemberBalanceOption', { balance: '30.00' })
      )
    })

    it('renders the December option at 0.00 when the pool is not present on the balance', () => {
      const result = resolveDecemberWasteControl(
        {
          accruesDecemberWasteBalance: true,
          declaresDecemberWasteManually: false,
          windowOpen: true
        },
        localise,
        'PRNs',
        { amount: 60, availableAmount: 60 }
      )

      expect(asPoolControl(result).items[0].text).toBe(
        localise('prns:create:decemberBalanceOption', { balance: '0.00' })
      )
    })

    it('treats a missing waste balance as zero', () => {
      const result = resolveDecemberWasteControl(
        {
          accruesDecemberWasteBalance: true,
          declaresDecemberWasteManually: false,
          windowOpen: true
        },
        localise,
        'PRNs',
        null
      )

      const control = asPoolControl(result)
      expect(control.items[0].text).toBe(
        localise('prns:create:decemberBalanceOption', { balance: '0.00' })
      )
      expect(control.items[1].text).toBe(
        localise('prns:create:nonDecemberBalanceOption', { balance: '0.00' })
      )
    })

    it('takes priority over manual declaration when both flags are somehow true', () => {
      const result = resolveDecemberWasteControl(
        {
          accruesDecemberWasteBalance: true,
          declaresDecemberWasteManually: true,
          windowOpen: true
        },
        localise,
        'PRNs',
        { amount: 10, availableAmount: 10 }
      )

      expect(result.mode).toBe(DECEMBER_WASTE_CONTROL.selectPool)
    })
  })

  describe('manual mode', () => {
    it('shows the Yes/No question when the accreditation declares manually and the window is open', () => {
      const result = resolveDecemberWasteControl(
        {
          accruesDecemberWasteBalance: false,
          declaresDecemberWasteManually: true,
          windowOpen: true
        },
        localise,
        'PRNs'
      )

      expect(result).toStrictEqual({
        mode: DECEMBER_WASTE_CONTROL.declareManually,
        legend: localise('prns:create:decemberWasteLegend'),
        items: [
          { value: 'false', text: localise('prns:decemberWasteNo') },
          { value: 'true', text: localise('prns:decemberWasteYes') }
        ]
      })
    })
  })

  describe('none mode', () => {
    it('shows no control when the window is closed', () => {
      const result = resolveDecemberWasteControl(
        {
          accruesDecemberWasteBalance: true,
          declaresDecemberWasteManually: false,
          windowOpen: false
        },
        localise,
        'PRNs'
      )

      expect(result).toStrictEqual({ mode: DECEMBER_WASTE_CONTROL.none })
    })

    it('shows no control when neither flag is set', () => {
      const result = resolveDecemberWasteControl(
        {
          accruesDecemberWasteBalance: false,
          declaresDecemberWasteManually: false,
          windowOpen: true
        },
        localise,
        'PRNs'
      )

      expect(result).toStrictEqual({ mode: DECEMBER_WASTE_CONTROL.none })
    })
  })
})
