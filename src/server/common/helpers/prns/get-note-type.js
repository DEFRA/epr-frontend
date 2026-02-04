/**
 * @param {{wasteProcessingType: string}} registration
 * @returns {{noteType: 'PRN' | 'PERN', noteTypePlural: 'PRNs' | 'PERNs', noteTypeKey: 'prns' | 'perns'}}
 */
export function getNoteTypeDisplayNames(registration) {
  const isExporter = registration.wasteProcessingType === 'exporter'
  return {
    noteType: isExporter ? 'PERN' : 'PRN',
    noteTypePlural: isExporter ? 'PERNs' : 'PRNs',
    noteTypeKey: isExporter ? 'perns' : 'prns'
  }
}
