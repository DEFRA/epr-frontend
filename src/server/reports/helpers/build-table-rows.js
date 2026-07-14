import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'

/**
 * Builds a table cell for a qualitative value, falling back to the "none
 * provided" text when the value is missing (null, undefined or empty).
 * @param {string | null | undefined} value
 * @param {string} noneText
 * @returns {{ text: string }}
 */
const qualitativeCell = (value, noneText) => ({ text: value || noneText })

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
 * Used on review/submit pages where contact details replace tonnage. A missing
 * contact value renders as the "none provided" text.
 * @param {Array<{supplierName: string, facilityType: string, supplierAddress: string | null, supplierPhone: string | null, supplierEmail: string | null}>} suppliers
 * @param {string} noneText
 * @returns {Array<Array<{text: string}>>}
 */
export function buildSupplierDetailRows(suppliers, noneText) {
  return suppliers.map((supplier) => [
    { text: supplier.supplierName },
    { text: supplier.facilityType },
    qualitativeCell(supplier.supplierAddress, noneText),
    qualitativeCell(supplier.supplierPhone, noneText),
    qualitativeCell(supplier.supplierEmail, noneText)
  ])
}

/**
 * Build govukTable rows for destination details. A missing recipient or
 * facility type renders as the "none provided" text.
 * @param {Array<{recipientName: string | null, facilityType: string | null, tonnageSentOn: number}>} finalDestinations
 * @param {string} noneText
 * @returns {Array<Array<{text: string}>>}
 */
export function buildDestinationRows(finalDestinations, noneText) {
  return finalDestinations.map((finalDestination) => [
    qualitativeCell(finalDestination.recipientName, noneText),
    qualitativeCell(finalDestination.facilityType, noneText),
    { text: formatTonnage(finalDestination.tonnageSentOn) }
  ])
}

/**
 * Build govukTable rows for destinations with address. A missing recipient,
 * facility type or address renders as the "none provided" text.
 * @param {Array<{recipientName: string | null, facilityType: string | null, address: string | null, tonnageSentOn: number}>} finalDestinations
 * @param {string} noneText
 * @returns {Array<Array<{text: string}>>}
 */
export function buildDestinationDetailRows(finalDestinations, noneText) {
  return finalDestinations.map((destination) => [
    qualitativeCell(destination.recipientName, noneText),
    qualitativeCell(destination.facilityType, noneText),
    qualitativeCell(destination.address, noneText),
    { text: formatTonnage(destination.tonnageSentOn) }
  ])
}

/**
 * Build govukTable rows for overseas reprocessing sites. A missing country
 * renders as the "none provided" text.
 * @param {Array<{siteName: string, orsId: string, country: string|null, approved: boolean}>} overseasSites
 * @param {{ showApprovalColumn?: boolean }} options
 * @param {string} noneText
 * @returns {Array<Array<{text: string}>>}
 */
export function buildOverseasSiteRows(overseasSites, options, noneText) {
  return overseasSites.map((overseasSite) => {
    const row = [
      { text: overseasSite.siteName },
      { text: overseasSite.orsId },
      qualitativeCell(overseasSite.country, noneText)
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
 * @param {string} noneText
 * @returns {Array<Array<{text: string}>>}
 */
export function buildOverseasSiteDetailRows(overseasSites, options, noneText) {
  return overseasSites.map((overseasSite) => {
    const row = [
      { text: overseasSite.siteName },
      { text: formatTonnage(overseasSite.tonnageExported) },
      { text: overseasSite.orsId },
      qualitativeCell(overseasSite.country, noneText)
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
