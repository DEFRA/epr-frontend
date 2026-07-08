import {
  formatTonnage,
  formatWholeNumberTonnage
} from '#config/nunjucks/filters/format-tonnage.js'
import { formatCurrency } from '#server/common/helpers/format-currency.js'
import { orDash } from './format-or-dash.js'

export const dashTonnes = orDash(formatTonnage)
export const dashWholeTonnes = orDash(formatWholeNumberTonnage)
export const dashCurrency = orDash(formatCurrency)
