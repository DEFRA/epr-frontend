/**
 * Calculate total tonnage sent on from the waste sent breakdown.
 * @param {{ tonnageSentToReprocessor: number, tonnageSentToExporter: number, tonnageSentToAnotherSite: number }} wasteSent
 * @returns {number}
 */
export function getTotalTonnageSentOn(wasteSent) {
  return (
    wasteSent.tonnageSentToReprocessor +
    wasteSent.tonnageSentToExporter +
    wasteSent.tonnageSentToAnotherSite
  )
}

/**
 * Build govukTable rows for supplier details.
 * @param {Array<{supplierName: string, facilityType: string, tonnageReceived: number}>} suppliers
 * @returns {Array<Array<{text: string | number}>>}
 */
export function buildSupplierRows(suppliers) {
  return suppliers.map((supplier) => [
    { text: supplier.supplierName },
    { text: supplier.facilityType },
    { text: supplier.tonnageReceived }
  ])
}

/**
 * Build govukTable rows for destination details.
 * @param {Array<{recipientName: string, facilityType: string, tonnageSentOn: number}>} finalDestinations
 * @returns {Array<Array<{text: string | number}>>}
 */
export function buildDestinationRows(finalDestinations) {
  return finalDestinations.map((finalDestination) => [
    { text: finalDestination.recipientName },
    { text: finalDestination.facilityType },
    { text: finalDestination.tonnageSentOn }
  ])
}

/**
 * Build govukTable rows for overseas reprocessing sites.
 * @param {Array<{siteName: string, orsId: string}>} overseasSites
 * @returns {Array<Array<{text: string}>>}
 */
export function buildOverseasSiteRows(overseasSites) {
  return overseasSites.map((overseasSite) => [
    { text: overseasSite.siteName },
    { text: overseasSite.orsId }
  ])
}
