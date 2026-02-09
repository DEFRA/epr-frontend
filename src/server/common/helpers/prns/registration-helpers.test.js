import { describe, expect, it } from 'vitest'
import {
  getNoteTypeDisplayNames,
  isExporterRegistration
} from './registration-helpers.js'

describe('#isExporterRegistration', () => {
  it('should return true for exporter', () => {
    const result = isExporterRegistration({ wasteProcessingType: 'exporter' })

    expect(result).toBe(true)
  })

  it('should return false for reprocessor', () => {
    const result = isExporterRegistration({
      wasteProcessingType: 'reprocessor'
    })

    expect(result).toBe(false)
  })
})

describe('#getNoteTypeDisplayNames', () => {
  it('should return PRN values for reprocessor', () => {
    const result = getNoteTypeDisplayNames({
      wasteProcessingType: 'reprocessor'
    })

    expect(result).toStrictEqual({
      isExporter: false,
      noteType: 'PRN',
      noteTypeFull: 'Packaging Waste Recycling Note',
      noteTypePlural: 'PRNs',
      wasteAction: 'reprocessing'
    })
  })

  it('should return PERN values for exporter', () => {
    const result = getNoteTypeDisplayNames({
      wasteProcessingType: 'exporter'
    })

    expect(result).toStrictEqual({
      isExporter: true,
      noteType: 'PERN',
      noteTypeFull: 'Packaging Waste Export Recycling Note',
      noteTypePlural: 'PERNs',
      wasteAction: 'export'
    })
  })
})
