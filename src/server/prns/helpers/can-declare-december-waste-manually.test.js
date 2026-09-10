import { describe, expect, it } from 'vitest'

import { resolveCanDeclareDecemberWasteManually } from './can-declare-december-waste-manually.js'

describe(resolveCanDeclareDecemberWasteManually, () => {
  it('shows when the accreditation declares manually and the window is open', () => {
    expect(
      resolveCanDeclareDecemberWasteManually({
        declaresDecemberWasteManually: true,
        windowOpen: true
      })
    ).toBe(true)
  })

  it('does not show when the accreditation declares manually but the window is closed', () => {
    expect(
      resolveCanDeclareDecemberWasteManually({
        declaresDecemberWasteManually: true,
        windowOpen: false
      })
    ).toBe(false)
  })

  it('does not show when the window is open but the accreditation never declares manually', () => {
    expect(
      resolveCanDeclareDecemberWasteManually({
        declaresDecemberWasteManually: false,
        windowOpen: true
      })
    ).toBe(false)
  })

  it('does not show when neither flag is set', () => {
    expect(
      resolveCanDeclareDecemberWasteManually({
        declaresDecemberWasteManually: false,
        windowOpen: false
      })
    ).toBe(false)
  })
})
