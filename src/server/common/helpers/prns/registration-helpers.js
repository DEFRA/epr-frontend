/**
 * Check if a registration is for an exporter
 * @param {{wasteProcessingType: string}} registration
 * @returns {boolean}
 */
export const isExporterRegistration = (registration) =>
  registration.wasteProcessingType === 'exporter'

/**
 * Get display names for PRN/PERN based on waste processing type
 * @param {{wasteProcessingType: string}} registration
 * @returns {{isExporter: boolean, noteType: 'PRN' | 'PERN', noteTypePlural: 'PRNs' | 'PERNs', wasteAction: 'export' | 'reprocessing'}}
 */
export const getNoteTypeDisplayNames = (registration) => {
  const isExporter = isExporterRegistration(registration)

  return {
    isExporter,
    noteType: isExporter ? 'PERN' : 'PRN',
    noteTypePlural: isExporter ? 'PERNs' : 'PRNs',
    wasteAction: isExporter ? 'export' : 'reprocessing'
  }
}
