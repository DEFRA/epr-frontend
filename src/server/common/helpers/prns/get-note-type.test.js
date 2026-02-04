import { describe, expect, test } from 'vitest'

import { getNoteTypeDisplayNames } from './get-note-type.js'

describe(getNoteTypeDisplayNames, () => {
  test('returns PRN variants for reprocessor registration', () => {
    const registration = { wasteProcessingType: 'reprocessor' }

    const result = getNoteTypeDisplayNames(registration)

    expect(result).toStrictEqual({
      noteType: 'PRN',
      noteTypePlural: 'PRNs',
      noteTypeKey: 'prns'
    })
  })

  test('returns PERN variants for exporter registration', () => {
    const registration = { wasteProcessingType: 'exporter' }

    const result = getNoteTypeDisplayNames(registration)

    expect(result).toStrictEqual({
      noteType: 'PERN',
      noteTypePlural: 'PERNs',
      noteTypeKey: 'perns'
    })
  })
})
