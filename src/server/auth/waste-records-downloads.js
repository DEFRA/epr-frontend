import { config } from '#config/config.js'
import { readsAsARegulator } from './reads-as-a-regulator.js'

/**
 * Whether the waste records CSV surface is lit. The regulator-only pages sit
 * behind their own gate already, so the flag is the whole question for them.
 * @returns {boolean}
 */
export const offersWasteRecordsDownloads = () =>
  config.get('featureFlags.wasteRecordsDownload')

/**
 * Whether this session may fetch waste records as CSV.
 * @param {{ role?: string | null } | null} [credentials]
 * @returns {boolean}
 */
export const readsWasteRecordsDownloads = (credentials) =>
  offersWasteRecordsDownloads() && readsAsARegulator(credentials)
