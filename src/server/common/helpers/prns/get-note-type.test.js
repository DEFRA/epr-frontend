import { describe, expect, it } from 'vitest'
import { getNoteTypeDisplayNames } from './get-note-type.js'

describe('#getNoteTypeDisplayNames', () => {
  it('should return PRN for reprocessor', () => {
    const result = getNoteTypeDisplayNames({
      wasteProcessingType: 'reprocessor'
    })

    expect(result).toStrictEqual({ noteType: 'PRN', noteTypePlural: 'PRNs' })
  })

  it('should return PERN for exporter', () => {
    const result = getNoteTypeDisplayNames({
      wasteProcessingType: 'exporter'
    })

    expect(result).toStrictEqual({ noteType: 'PERN', noteTypePlural: 'PERNs' })
  })
})
