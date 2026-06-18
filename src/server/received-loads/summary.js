import { PATHS } from './journey.js'
import {
  calculateNetWeight,
  calculateTonnageForRecycling
} from './calculations.js'

const NOT_PROVIDED = 'Not provided'
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

/** @param {string | undefined} isoDate */
const formatDate = (isoDate) => {
  if (!isoDate) {
    return NOT_PROVIDED
  }
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${day} ${MONTHS[month - 1]} ${year}`
}

/** @param {number | string | undefined} value */
const formatTonnes = (value) =>
  value === undefined || value === '' ? NOT_PROVIDED : `${value} tonnes`

/** @param {string | undefined} value */
const text = (value) => (value === undefined || value === '' ? NOT_PROVIDED : value)

/**
 * Derived values for a draft: net weight and tonnage received for recycling.
 * These are the figures the spreadsheet made the user enter and validate; the
 * form computes them so they are always consistent.
 *
 * @param {Record<string, any>} draft
 */
export const deriveTotals = (draft) => {
  const netWeight = calculateNetWeight({
    grossWeight: Number(draft.grossWeight),
    tareWeight: Number(draft.tareWeight),
    palletWeight: Number(draft.palletWeight)
  })
  const tonnageForRecycling = calculateTonnageForRecycling({
    netWeight,
    nonTargetWeight: Number(draft.nonTargetWeight),
    bailingWireProtocol: draft.bailingWireProtocol,
    recyclablePercentage: Number(draft.recyclablePercentage)
  })
  return { netWeight, tonnageForRecycling }
}

const change = (path, hidden) => ({
  items: [
    {
      href: `${path}?from=check`,
      text: 'Change',
      visuallyHiddenText: hidden
    }
  ]
})

/**
 * The read-only summary of the fields taken from waste tracking, shown for
 * confirmation before the rest of the journey. None have a change link: waste
 * tracking is the source of truth for these fields.
 *
 * @param {Record<string, any>} draft
 */
export const buildWasteTrackingRows = (draft) => {
  const row = (key, value) => ({ key: { text: key }, value: { text: value } })
  return [
    row('Date received', formatDate(draft.dateReceived)),
    row('EWC code', text(draft.ewcCode)),
    row('Waste description', text(draft.wasteDescription)),
    row('Carrier name', text(draft.carrierName)),
    row('CBD registration number', text(draft.cbdRegNumber)),
    row('Vehicle registration number', text(draft.vehicleRegistration))
  ]
}

/**
 * Builds the GOV.UK summary-list rows for the check-your-answers page.
 * Derived rows (net weight, tonnage) have no change link.
 *
 * @param {Record<string, any>} draft
 */
export const buildSummaryRows = (draft) => {
  const { netWeight, tonnageForRecycling } = deriveTotals(draft)
  const row = (key, value, path, hidden) => ({
    key: { text: key },
    value: { text: value },
    ...(path ? { actions: change(path, hidden) } : {})
  })

  // Fields sourced from waste tracking are locked: they keep no change link.
  const editable = (path) => (draft.fromWasteTracking ? undefined : path)

  return [
    row('Date received', formatDate(draft.dateReceived), editable(PATHS.dateReceived), 'date received'),
    row('EWC code', text(draft.ewcCode), editable(PATHS.wasteType), 'EWC code'),
    row('Waste description', text(draft.wasteDescription), editable(PATHS.wasteType), 'waste description'),
    row('PRN or PERN issued', text(draft.prnIssued), PATHS.prn, 'whether a PRN or PERN was issued'),
    row('Gross weight', formatTonnes(draft.grossWeight), PATHS.weights, 'gross weight'),
    row('Tare weight', formatTonnes(draft.tareWeight), PATHS.weights, 'tare weight'),
    row('Pallet weight', formatTonnes(draft.palletWeight), PATHS.weights, 'pallet weight'),
    row('Net weight (calculated)', formatTonnes(netWeight)),
    row('Bailing wire protocol', text(draft.bailingWireProtocol), PATHS.recyclability, 'bailing wire protocol'),
    row('Recyclable proportion method', text(draft.calculationMethod), PATHS.recyclability, 'calculation method'),
    row('Weight of non-target materials', formatTonnes(draft.nonTargetWeight), PATHS.recyclability, 'weight of non-target materials'),
    row('Recyclable proportion', draft.recyclablePercentage === undefined ? NOT_PROVIDED : `${draft.recyclablePercentage}%`, PATHS.recyclability, 'recyclable proportion'),
    row('Tonnage received for recycling (calculated)', formatTonnes(tonnageForRecycling)),
    row('Supplier name', text(draft.supplierName), PATHS.supplier, 'supplier name'),
    row('Supplier address', text(draft.supplierAddress), PATHS.supplier, 'supplier address'),
    row('Supplier postcode', text(draft.supplierPostcode), PATHS.supplier, 'supplier postcode'),
    row('Supplier email address', text(draft.supplierEmail), PATHS.supplier, 'supplier email address'),
    row('Supplier phone number', text(draft.supplierPhone), PATHS.supplier, 'supplier phone number'),
    row('Activities carried out by supplier', text(draft.activitiesCarriedOut), PATHS.supplier, 'activities carried out by the supplier'),
    row('Carrier name', text(draft.carrierName), editable(PATHS.carrier), 'carrier name'),
    row('CBD registration number', text(draft.cbdRegNumber), editable(PATHS.carrier), 'CBD registration number'),
    row('Vehicle registration number', text(draft.vehicleRegistration), editable(PATHS.carrier), 'vehicle registration number'),
    row('Weighbridge ticket number', text(draft.weighbridgeTicket), PATHS.carrier, 'weighbridge ticket number'),
    row('Your reference', text(draft.yourReference), PATHS.carrier, 'your reference')
  ]
}
