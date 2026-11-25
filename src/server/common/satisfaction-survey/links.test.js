import { afterEach, describe, expect, it } from 'vitest'
import { config } from '#config/config.js'
import { satisfactionSurveyLinks } from '#server/common/satisfaction-survey/links.js'

describe('#satisfactionSurveyLinks', () => {
  const localise = (key) => key

  /** @param {ReturnType<typeof satisfactionSurveyLinks>} links */
  const hrefsOf = (links) =>
    Object.fromEntries(
      Object.entries(links).map(([journey, { href }]) => [journey, href])
    )

  afterEach(() => {
    config.reset('satisfactionSurvey.isEnabled')
    config.reset('satisfactionSurvey.prnUrl')
    config.reset('satisfactionSurvey.reportUrl')
    config.reset('satisfactionSurvey.summaryLogUrl')
  })

  it('should offer no survey while the flag is off', () => {
    config.set('satisfactionSurvey.prnUrl', 'https://survey.example/prn')

    expect(hrefsOf(satisfactionSurveyLinks(localise))).toStrictEqual({
      prn: '',
      report: '',
      summaryLog: ''
    })
  })

  it('should ask every journey the same question, at its own address', () => {
    config.set('satisfactionSurvey.isEnabled', true)
    config.set('satisfactionSurvey.prnUrl', 'https://survey.example/prn')
    config.set('satisfactionSurvey.reportUrl', 'https://survey.example/report')
    config.set(
      'satisfactionSurvey.summaryLogUrl',
      'https://survey.example/summary-log'
    )

    expect(hrefsOf(satisfactionSurveyLinks(localise))).toStrictEqual({
      prn: 'https://survey.example/prn',
      report: 'https://survey.example/report',
      summaryLog: 'https://survey.example/summary-log'
    })
  })

  it('should offer no survey the environment has not been given a form for', () => {
    config.set('satisfactionSurvey.isEnabled', true)
    config.set('satisfactionSurvey.reportUrl', 'https://survey.example/report')

    expect(hrefsOf(satisfactionSurveyLinks(localise))).toStrictEqual({
      prn: '',
      report: 'https://survey.example/report',
      summaryLog: ''
    })
  })
})
