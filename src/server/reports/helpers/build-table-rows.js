import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'

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
    { text: formatTonnage(supplier.tonnageReceived) }
  ])
}

/**
 * Build govukTable rows for supplier details with contact information.
 * Used on review/submit pages where contact details replace tonnage.
 * @property {Array<{supplierName: string, facilityType: string, tonnageReceived: number, supplierAddress: string, supplierPhone: string|null, supplierEmail: string|null}>} suppliers
 * @returns {Array<Array<{text: string}>>}
 */
export function buildSupplierDetailRows(suppliers) {
  return suppliers.map((supplier) => [
    { text: supplier.supplierName },
    { text: supplier.facilityType },
    { text: supplier.supplierAddress },
    { text: supplier.supplierPhone },
    { text: supplier.supplierEmail }
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
    { text: formatTonnage(finalDestination.tonnageSentOn) }
  ])
}

/**
 * Build govukTable rows for destinations with address.
 * @param {Array<{recipientName: string, facilityType: string, address: string, tonnageSentOn: number}>} finalDestinations
 * @returns {Array<Array<{text: string | number}>>}
 */
export function buildDestinationDetailRows(finalDestinations) {
  return finalDestinations.map((destination) => [
    { text: destination.recipientName },
    { text: destination.facilityType },
    { text: destination.address },
    { text: formatTonnage(destination.tonnageSentOn) }
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

/**
 * Build govukTable rows for overseas sites with tonnage exported.
 * @param {Array<{siteName: string, tonnageExported: number, orsId: string}>} overseasSites
 * @returns {Array<Array<{text: string | number}>>}
 */
export function buildOverseasSiteDetailRows(overseasSites) {
  return overseasSites.map((overseasSite) => [
    { text: overseasSite.siteName },
    { text: overseasSite.tonnageExported },
    { text: overseasSite.orsId }
  ])
}
