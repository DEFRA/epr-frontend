import { describe, expect, it } from 'vitest'

import {
  REPROCESSING_TYPE,
  WASTE_PROCESSING_TYPE
} from '#domain/organisations/model.js'
import { showDecemberWasteQuestion } from './show-december-waste-question.js'

/** @import { Registration } from '#domain/organisations/registration.js' */

const outputRegistration = /** @type {Registration} */ ({
  id: 'reg-output',
  wasteProcessingType: WASTE_PROCESSING_TYPE.REPROCESSOR,
  reprocessingType: REPROCESSING_TYPE.OUTPUT
})

const inputRegistration = /** @type {Registration} */ ({
  id: 'reg-input',
  wasteProcessingType: WASTE_PROCESSING_TYPE.REPROCESSOR,
  reprocessingType: REPROCESSING_TYPE.INPUT
})

const exporterRegistration = /** @type {Registration} */ ({
  id: 'reg-exporter',
  wasteProcessingType: WASTE_PROCESSING_TYPE.EXPORTER
})

describe(showDecemberWasteQuestion, () => {
  it('shows for an output reprocessor when eligible', () => {
    expect(
      showDecemberWasteQuestion(outputRegistration, { eligible: true })
    ).toBe(true)
  })

  it('does not show for an output reprocessor when not eligible', () => {
    expect(
      showDecemberWasteQuestion(outputRegistration, { eligible: false })
    ).toBe(false)
  })

  it('never shows for an input reprocessor, even when eligible', () => {
    expect(
      showDecemberWasteQuestion(inputRegistration, { eligible: true })
    ).toBe(false)
  })

  it('never shows for an exporter, even when eligible', () => {
    expect(
      showDecemberWasteQuestion(exporterRegistration, { eligible: true })
    ).toBe(false)
  })
})
