import { describe, expect, it } from 'vitest'

import { hasDetailView } from './has-detail-view.js'

describe(hasDetailView, () => {
  it('should return true for registered-only reprocessor', () => {
    const registration = { wasteProcessingType: 'reprocessor' }

    expect(hasDetailView(registration, undefined)).toBe(true)
  })

  it('should return false for accredited reprocessor', () => {
    const registration = { wasteProcessingType: 'reprocessor' }
    const accreditation = { id: 'acc-001' }

    expect(hasDetailView(registration, accreditation)).toBe(false)
  })

  it('should return false for registered-only exporter', () => {
    const registration = { wasteProcessingType: 'exporter' }

    expect(hasDetailView(registration, undefined)).toBe(false)
  })

  it('should return false for accredited exporter', () => {
    const registration = { wasteProcessingType: 'exporter' }
    const accreditation = { id: 'acc-001' }

    expect(hasDetailView(registration, accreditation)).toBe(false)
  })
})
