/**
 * Get display names for PRN/PERN based on waste processing type
 * @param {{wasteProcessingType: string}} registration
 * @returns {{noteType: 'PRN' | 'PERN', noteTypePlural: 'PRNs' | 'PERNs'}}
 */
export function getNoteTypeDisplayNames(registration) {
  const isExporter = registration.wasteProcessingType === 'exporter'
  return {
    noteType: isExporter ? 'PERN' : 'PRN',
    noteTypePlural: isExporter ? 'PERNs' : 'PRNs'
  }
}
