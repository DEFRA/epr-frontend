/**
 * @import { Registration } from '#domain/organisations/registration.js'
 */

/**
 * Check if a registration is for an exporter
 * @param {Pick<Registration, 'wasteProcessingType'>} registration
 * @returns {boolean}
 */
export const isExporterRegistration = (registration) =>
  registration.wasteProcessingType === 'exporter'

/**
 * Check if a registration is for a reprocessor
 * @param {Pick<Registration, 'wasteProcessingType'>} registration
 * @returns {boolean}
 */
export const isReprocessorRegistration = (registration) =>
  registration.wasteProcessingType === 'reprocessor'

/**
 * Get display names for PRN/PERN based on waste processing type
 * @param {Pick<Registration, 'wasteProcessingType'>} registration
 * @returns {{isExporter: boolean, noteType: 'PRN' | 'PERN', noteTypeFull: 'Packaging Waste Export Recycling Note' | 'Packaging Waste Recycling Note', noteTypePlural: 'PRNs' | 'PERNs', wasteAction: 'export' | 'reprocessing', wasteActionGerund: 'exporting' | 'reprocessing'}}
 */
export const getNoteTypeDisplayNames = (registration) => {
  const isExporter = isExporterRegistration(registration)

  return {
    isExporter,
    noteType: isExporter ? 'PERN' : 'PRN',
    noteTypeFull: isExporter
      ? 'Packaging Waste Export Recycling Note'
      : 'Packaging Waste Recycling Note',
    noteTypePlural: isExporter ? 'PERNs' : 'PRNs',
    wasteAction: isExporter ? 'export' : 'reprocessing',
    // 'reprocessing' is both noun and gerund in English, hence the overlap with wasteAction
    wasteActionGerund: isExporter ? 'exporting' : 'reprocessing'
  }
}
