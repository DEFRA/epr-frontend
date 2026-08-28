import { config } from '#config/config.js'

/**
 * The survey each completion page may link to, empty while the surveys are off.
 * Collapsing the flag and the address into one value leaves a page a single
 * truthy check to make, so it cannot link to nowhere or ask the question in one
 * place while the flag says the surveys are dark.
 * @returns {{ prnUrl: string, reportUrl: string, summaryLogUrl: string }}
 */
export const satisfactionSurveyUrls = () =>
  config.get('satisfactionSurvey.isEnabled')
    ? {
        prnUrl: config.get('satisfactionSurvey.prnUrl'),
        reportUrl: config.get('satisfactionSurvey.reportUrl'),
        summaryLogUrl: config.get('satisfactionSurvey.summaryLogUrl')
      }
    : { prnUrl: '', reportUrl: '', summaryLogUrl: '' }
