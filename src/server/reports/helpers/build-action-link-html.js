import { escapeHtml } from '#server/common/helpers/escape-html.js'

/**
 * A row's action link, carrying a visually-hidden label so a page of otherwise
 * identical links names the row each one acts on.
 * @param {string} actionLabel
 * @param {string} url
 * @param {string} label
 * @returns {string}
 */
export const buildActionLinkHtml = (actionLabel, url, label) =>
  `<a href="${url}" class="govuk-link">${escapeHtml(actionLabel)} <span class="govuk-visually-hidden">${escapeHtml(label)}</span></a>`
