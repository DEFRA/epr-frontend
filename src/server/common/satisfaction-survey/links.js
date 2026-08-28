import { config } from '#config/config.js'

const LINK_TEXT_KEY = 'common:satisfactionSurvey:link'

/**
 * @typedef {'satisfactionSurvey.prnUrl'
 *   | 'satisfactionSurvey.reportUrl'
 *   | 'satisfactionSurvey.summaryLogUrl'} SurveyUrlKey
 */

/**
 * @param {SurveyUrlKey} key
 * @returns {string}
 */
const href = (key) =>
  config.get('satisfactionSurvey.isEnabled') ? config.get(key) : ''

/**
 * The survey each completion page may link to, with the copy it is asked with.
 * The address is empty while the surveys are off, so a page has a single truthy
 * check to make and cannot link to nowhere, ask the question while the flag says
 * the surveys are dark, or pair one journey's address with another's copy.
 * @param {(key: string) => string} localise
 * @returns {{
 *   prn: SatisfactionSurveyLink,
 *   report: SatisfactionSurveyLink,
 *   summaryLog: SatisfactionSurveyLink
 * }}
 */
export const satisfactionSurveyLinks = (localise) => {
  const text = localise(LINK_TEXT_KEY)

  return {
    prn: { href: href('satisfactionSurvey.prnUrl'), text },
    report: { href: href('satisfactionSurvey.reportUrl'), text },
    summaryLog: { href: href('satisfactionSurvey.summaryLogUrl'), text }
  }
}

/**
 * @typedef {{ href: string, text: string }} SatisfactionSurveyLink
 */
