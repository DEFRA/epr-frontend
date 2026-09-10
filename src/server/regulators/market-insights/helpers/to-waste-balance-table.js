import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'

import { nameOf } from './reporting-period.js'

/**
 * One aggregated figure as the backend serves it: the net credit for a
 * material and accreditation type in a reporting month, alongside the
 * measures it was derived from.
 * @typedef {{
 *   material: string,
 *   accreditationType: 'reprocessor' | 'exporter',
 *   month: string,
 *   totalCredited: number,
 *   eligibleForWasteBalance: number,
 *   sentOnDeductions: number,
 *   netCredit: number
 * }} WasteBalanceFigure
 */

/**
 * @typedef {{
 *   material: string,
 *   accreditationType: string,
 *   netCredits: string[],
 *   total: string
 * }} WasteBalanceRow
 */

/**
 * @typedef {{ months: string[], rows: WasteBalanceRow[] }} WasteBalanceTable
 */

/**
 * The figures of one material and accreditation type, gathered by the month
 * they were credited in, on the way to becoming a row.
 * @typedef {{
 *   material: string,
 *   accreditationType: string,
 *   netCredits: Map<string, number>
 * }} WasteBalancePartition
 */

/**
 * Lays the served figures out the way the published Waste Balance tab is: one
 * row per material and accreditation type, the reporting months across as
 * columns, and the net credit in the cells.
 *
 * The pivot is presentation. Every figure in a cell is the one the service
 * served for that month, and the only sum is the row total across them.
 *
 * The months are given rather than read off the figures, so the columns run
 * unbroken across the reporting period and a month nothing was credited in
 * still gets one.
 * @param {WasteBalanceFigure[]} figures
 * @param {string[]} months
 * @param {(key: string) => string} localise
 * @returns {WasteBalanceTable}
 */
export const toWasteBalanceTable = (figures, months, localise) => {
  const withinPeriod = new Set(months)

  /** @type {Map<string, WasteBalancePartition>} */
  const partitions = new Map()

  const credited = figures.filter(({ month }) => withinPeriod.has(month))

  for (const { material, accreditationType, month, netCredit } of credited) {
    // The service could not resolve a material for these figures. The label
    // says so of us rather than of the operator, who did report one, and
    // heading the row with it keeps real tonnage from sitting beside a blank.
    const named =
      material || localise('regulators:marketInsights:unknownMaterial')
    const key = JSON.stringify([named, accreditationType])
    /** @type {WasteBalancePartition} */
    const partition = partitions.get(key) ?? {
      material: named,
      accreditationType: localise(
        `regulators:marketInsights:accreditationTypes:${accreditationType}`
      ),
      netCredits: new Map()
    }

    partition.netCredits.set(
      month,
      (partition.netCredits.get(month) ?? 0) + netCredit
    )
    partitions.set(key, partition)
  }

  const rows = [...partitions.values()]
    .sort(
      (one, other) =>
        one.material.localeCompare(other.material) ||
        one.accreditationType.localeCompare(other.accreditationType)
    )
    .map(({ material, accreditationType, netCredits }) => ({
      material,
      accreditationType,
      // The published tab holds its approved layout by printing a zero in every
      // month a row reported nothing, so a month missing from the aggregate
      // reads the same here as it does there.
      netCredits: months.map((month) =>
        formatTonnage(netCredits.get(month) ?? 0)
      ),
      total: formatTonnage(
        [...netCredits.values()].reduce((sum, credit) => sum + credit, 0)
      )
    }))

  return { months: months.map(nameOf), rows }
}
