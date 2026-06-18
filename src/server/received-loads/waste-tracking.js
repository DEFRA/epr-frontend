/**
 * Stubbed Digital Waste Tracking (DWT) lookup.
 *
 * In the full service these movement facts would be fetched from the Waste
 * Movement Receipt API using the waste tracking ID. For the prototype a small
 * set of canned movements stands in for that call, so the journey can show both
 * a successful lookup and a "not found" result.
 */

/**
 * The fields a waste movement supplies. When a load is started from a waste
 * tracking ID these are taken from the movement and locked: the reprocessor
 * cannot change them, because waste tracking is their source of truth.
 */
export const DWT_FIELDS = Object.freeze([
  'dateReceived',
  'ewcCode',
  'wasteDescription',
  'carrierName',
  'cbdRegNumber',
  'vehicleRegistration'
])

const MOVEMENTS = Object.freeze({
  'WM-2024-0001': {
    dateReceived: '2024-11-04',
    ewcCode: '15 01 01',
    wasteDescription: 'Paper - sorted mixed paper or board',
    carrierName: 'Severnside Logistics Ltd',
    cbdRegNumber: 'CBDU123456',
    vehicleRegistration: 'WX21 KLM'
  },
  'WM-2024-0002': {
    dateReceived: '2024-11-06',
    ewcCode: '15 01 02',
    wasteDescription: 'Plastic - HDPE bottles',
    carrierName: 'Mersey Haulage Co',
    cbdRegNumber: 'CBDU654321',
    vehicleRegistration: 'DK70 PRT'
  },
  'WM-2024-0003': {
    dateReceived: '2024-11-08',
    ewcCode: '15 01 07',
    wasteDescription: 'Glass - pre-sorted',
    carrierName: 'Anglia Transport Services',
    cbdRegNumber: 'CBDU246810',
    vehicleRegistration: 'AY19 GLS'
  }
})

/**
 * The waste tracking IDs the prototype recognises, for display as examples.
 */
export const EXAMPLE_WASTE_TRACKING_IDS = Object.freeze(Object.keys(MOVEMENTS))

/**
 * Looks up a waste movement by its waste tracking ID. Returns the movement's
 * DWT-sourced fields, or null if no movement matches.
 *
 * @param {string} wasteTrackingId
 * @returns {Readonly<Record<string, string>> | null}
 */
export const lookupWasteMovement = (wasteTrackingId) =>
  MOVEMENTS[(wasteTrackingId ?? '').trim().toUpperCase()] ?? null
