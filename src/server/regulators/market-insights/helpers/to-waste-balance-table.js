import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'

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

const monthName = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  timeZone: 'UTC'
})

/**
 * Names the month a `YYYY-MM` key stands for. The key carries no day, so it is
 * read at the start of the month in UTC and the zone is stated rather than
 * left to the host, which would name the month before it west of Greenwich.
 * @param {string} month
 * @returns {string}
 */
const nameOf = (month) => monthName.format(new Date(`${month}-01T00:00:00Z`))

/**
 * Lays the served figures out the way the published Waste Balance tab is: one
 * row per material and accreditation type, the reporting months across as
 * columns, and the net credit in the cells.
 *
 * The pivot is presentation. Every figure in a cell is the one the service
 * served for that month, and the only sum is the row total across them.
 * @param {WasteBalanceFigure[]} figures
 * @param {(key: string) => string} localise
 * @returns {WasteBalanceTable}
 */
export const toWasteBalanceTable = (figures, localise) => {
  const months = [...new Set(figures.map(({ month }) => month))].sort()

  /**
   * @type {Map<string, {
   *   material: string,
   *   accreditationType: WasteBalanceFigure['accreditationType'],
   *   netCredits: Map<string, number>
   * }>}
   */
  const partitions = new Map()

  for (const { material, accreditationType, month, netCredit } of figures) {
    const key = JSON.stringify([material, accreditationType])
    const partition = partitions.get(key) ?? {
      material,
      accreditationType,
      netCredits: new Map()
    }

    partition.netCredits.set(month, netCredit)
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
      accreditationType: localise(
        `regulators:marketInsights:accreditationTypes:${accreditationType}`
      ),
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
