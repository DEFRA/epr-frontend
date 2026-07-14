import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'

/**
 * Builds a table cell for an optional text value, falling back to the "none
 * provided" text when the value is missing (null, undefined or empty).
 * @param {string | null | undefined} value
 * @param {string} fallbackText
 * @returns {{ text: string }}
 */
const optionalTextCell = (value, fallbackText) => ({
  text: value || fallbackText
})

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
 * Build govukTable rows for supplier details. A missing name or facility type
 * renders as the "none provided" text.
 * @param {Array<{supplierName: string | null, facilityType: string | null, tonnageReceived: number}>} suppliers
 * @param {string} fallbackText
 * @returns {Array<Array<{text: string | number}>>}
 */
export function buildSupplierRows(suppliers, fallbackText) {
  return suppliers.map((supplier) => [
    optionalTextCell(supplier.supplierName, fallbackText),
    optionalTextCell(supplier.facilityType, fallbackText),
    { text: formatTonnage(supplier.tonnageReceived) }
  ])
}

/**
 * Build govukTable rows for supplier details with contact information.
 * Used on review/submit pages where contact details replace tonnage. A missing
 * contact value renders as the "none provided" text.
 * @param {Array<{supplierName: string | null, facilityType: string | null, supplierAddress: string | null, supplierPhone: string | null, supplierEmail: string | null}>} suppliers
 * @param {string} fallbackText
 * @returns {Array<Array<{text: string}>>}
 */
export function buildSupplierDetailRows(suppliers, fallbackText) {
  return suppliers.map((supplier) => [
    optionalTextCell(supplier.supplierName, fallbackText),
    optionalTextCell(supplier.facilityType, fallbackText),
    optionalTextCell(supplier.supplierAddress, fallbackText),
    optionalTextCell(supplier.supplierPhone, fallbackText),
    optionalTextCell(supplier.supplierEmail, fallbackText)
  ])
}

/**
 * Build govukTable rows for destination details. A missing recipient or
 * facility type renders as the "none provided" text.
 * @param {Array<{recipientName: string | null, facilityType: string | null, tonnageSentOn: number}>} finalDestinations
 * @param {string} fallbackText
 * @returns {Array<Array<{text: string}>>}
 */
export function buildDestinationRows(finalDestinations, fallbackText) {
  return finalDestinations.map((finalDestination) => [
    optionalTextCell(finalDestination.recipientName, fallbackText),
    optionalTextCell(finalDestination.facilityType, fallbackText),
    { text: formatTonnage(finalDestination.tonnageSentOn) }
  ])
}

/**
 * Build govukTable rows for destinations with address. A missing recipient,
 * facility type or address renders as the "none provided" text.
 * @param {Array<{recipientName: string | null, facilityType: string | null, address: string | null, tonnageSentOn: number}>} finalDestinations
 * @param {string} fallbackText
 * @returns {Array<Array<{text: string}>>}
 */
export function buildDestinationDetailRows(finalDestinations, fallbackText) {
  return finalDestinations.map((destination) => [
    optionalTextCell(destination.recipientName, fallbackText),
    optionalTextCell(destination.facilityType, fallbackText),
    optionalTextCell(destination.address, fallbackText),
    { text: formatTonnage(destination.tonnageSentOn) }
  ])
}

/**
 * Build govukTable rows for overseas reprocessing sites. A missing country
 * renders as the "none provided" text.
 * @param {Array<{siteName: string, orsId: string, country: string|null, approved: boolean}>} overseasSites
 * @param {{ showApprovalColumn?: boolean }} options
 * @param {string} fallbackText
 * @returns {Array<Array<{text: string}>>}
 */
export function buildOverseasSiteRows(overseasSites, options, fallbackText) {
  return overseasSites.map((overseasSite) => {
    const row = [
      { text: overseasSite.siteName },
      { text: overseasSite.orsId },
      optionalTextCell(overseasSite.country, fallbackText)
    ]

    if (options?.showApprovalColumn) {
      row.push({ text: overseasSite.approved ? 'Yes' : 'No' })
    }

    return row
  })
}

/**
 * Build govukTable rows for overseas sites with tonnage exported and country.
 * A missing country renders as the "none provided" text.
 * @param {Array<{siteName: string, tonnageExported: number, orsId: string, country: string|null, approved: boolean}>} overseasSites
 * @param {{ showApprovalColumn?: boolean }} options
 * @param {string} fallbackText
 * @returns {Array<Array<{text: string}>>}
 */
export function buildOverseasSiteDetailRows(
  overseasSites,
  options,
  fallbackText
) {
  return overseasSites.map((overseasSite) => {
    const row = [
      { text: overseasSite.siteName },
      { text: formatTonnage(overseasSite.tonnageExported) },
      { text: overseasSite.orsId },
      optionalTextCell(overseasSite.country, fallbackText)
    ]

    if (options?.showApprovalColumn) {
      row.push({ text: overseasSite.approved ? 'Yes' : 'No' })
    }

    return row
  })
}

/**
 * Build govukTable rows for unapproved overseas reprocessor IDs
 * with tonnage exported. Used on the detail/overview page.
 * @param {Array<{orsId: string, tonnageExported: number}>} unapprovedOverseasSites
 * @returns {Array<Array<{text: string | number}>>}
 */
export function buildUnapprovedOverseasSiteDetailRows(unapprovedOverseasSites) {
  return unapprovedOverseasSites.map((unapprovedSite) => [
    { text: formatTonnage(unapprovedSite.tonnageExported) },
    { text: unapprovedSite.orsId }
  ])
}

/**
 * Build govukTable rows for unapproved overseas reprocessor IDs
 * showing only the ORS ID. Used on the post-submission view page.
 * @param {Array<{orsId: string, tonnageExported: number}>} unapprovedOverseasSites
 * @returns {Array<Array<{text: string}>>}
 */
export function buildUnapprovedOverseasSiteRows(unapprovedOverseasSites) {
  return unapprovedOverseasSites.map((unapprovedSite) => [
    { text: unapprovedSite.orsId }
  ])
}
