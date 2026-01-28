/**
 * Determine if a registration is for PRN or PERN based on waste processing type
 * @param {{wasteProcessingType: string}} registration
 * @returns {'prns' | 'perns'}
 */
export function getNoteType(registration) {
  return registration.wasteProcessingType === 'exporter' ? 'perns' : 'prns'
}
