import { describe, expect, it } from 'vitest'

import { getDisplayCodeFromErrorCode } from '#server/common/constants/validation-codes.js'

import en from './en.json' with { type: 'json' }

import { CELL_PROBLEMS } from './validation-failures-view-model.js'

const WORDING_VARIANTS = /_(EXPORTED|REGISTERED_ONLY)$/

const messagesWithValues = Object.entries(en.cellReason)
  .filter(([, message]) => message.includes('{{'))
  .map(([key]) => key)

describe('cell error messages with values', () => {
  it.each(messagesWithValues)(
    'fills in the values of the %s message',
    (key) => {
      expect(CELL_PROBLEMS).toHaveProperty(key.replace(WORDING_VARIANTS, ''))
    }
  )

  it.each(Object.keys(CELL_PROBLEMS))(
    'falls back to a group message for %s',
    (errorCode) => {
      expect(getDisplayCodeFromErrorCode(errorCode)).not.toBe(errorCode)
    }
  )
})
