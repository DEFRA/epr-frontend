import { TONNAGE_BAND } from '#domain/organisations/model.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'

import { nameOf } from './reporting-period.js'

/** @import { TonnageBand } from '#domain/organisations/model.js' */

/**
 * The returns owed and not submitted in each tonnage band. Every band is
 * served, at zero where nothing is outstanding.
 * @typedef {Record<TonnageBand, number>} OutstandingByBand
 */

/**
 * One reporting month as the backend serves it, keyed by material. A material
 * this app does not know still shows, under its own name, as it does on the
 * other market insights pages.
 * @typedef {{ figures: Record<string, OutstandingByBand> }} OutstandingReturnsMonth
 */

/** @typedef {{ months: Record<string, OutstandingReturnsMonth> }} OutstandingReturnsData */

/** @typedef {{ band: string, counts: string[] }} OutstandingReturnsRow */

/**
 * One material as the page lays it out: a row per tonnage band, with the count
 * for each month of the period across.
 * @typedef {{ material: string, rows: OutstandingReturnsRow[] }} OutstandingReturnsTable
 */

/** @typedef {{ months: string[], materials: OutstandingReturnsTable[] }} OutstandingReturnsTables */

/** @typedef {(key: string, values?: Record<string, string | number>) => string} Localise */

/**
 * The bands smallest first, which is the order the published tab lists them
 * and the order the accreditation thresholds run in. Sorting them by their
 * words would put "Over 10,000 tonnes" at the top.
 */
const BANDS = Object.values(TONNAGE_BAND)

/**
 * Lays the served counts out the way the published outstanding returns tab is:
 * a table per material, the tonnage bands down the side and the reporting
 * months across, holding the number of returns owed and not submitted.
 *
 * The pivot is presentation. Every count in a cell is the one the service
 * served for that month, material and band, and nothing is summed here.
 *
 * The months are the page's period, so a served month outside it is not shown.
 * @param {OutstandingReturnsData} data
 * @param {string[]} months
 * @param {Localise} localise
 * @returns {OutstandingReturnsTables}
 */
export const toOutstandingReturnsTables = (
  { months: served },
  months,
  localise
) => ({
  months: months.map(nameOf),
  materials: Object.keys(served[months[0]].figures)
    .map((material) => ({
      material: getMaterialDisplayName(material),
      rows: BANDS.map((band) => ({
        band: localise(
          `regulators:marketInsights:outstandingReturns:bands:${band}`
        ),
        counts: months.map((month) =>
          String(served[month].figures[material][band])
        )
      }))
    }))
    .sort((one, other) => one.material.localeCompare(other.material))
})
