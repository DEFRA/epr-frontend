import {
  formatTonnage,
  formatWholeNumberTonnage
} from '#config/nunjucks/filters/format-tonnage.js'
import { formatCurrency } from '#server/common/helpers/format-currency.js'
import { orDash } from './format-or-dash.js'

export const tonnageOrDash = orDash(formatTonnage)
export const wholeTonnageOrDash = orDash(formatWholeNumberTonnage)
export const currencyOrDash = orDash(formatCurrency)
