import { afterEach, describe, expect, it } from 'vitest'
import { config } from '#config/config.js'
import { satisfactionSurveyUrls } from '#server/common/satisfaction-survey/urls.js'

describe('#satisfactionSurveyUrls', () => {
  afterEach(() => {
    config.reset('satisfactionSurvey.isEnabled')
    config.reset('satisfactionSurvey.prnUrl')
    config.reset('satisfactionSurvey.reportUrl')
    config.reset('satisfactionSurvey.summaryLogUrl')
  })

  it('should offer no survey while the flag is off', () => {
    expect(satisfactionSurveyUrls()).toStrictEqual({
      prnUrl: '',
      reportUrl: '',
      summaryLogUrl: ''
    })
  })

  it('should offer the configured survey for each journey once the flag is on', () => {
    config.set('satisfactionSurvey.isEnabled', true)
    config.set('satisfactionSurvey.prnUrl', 'https://survey.example/prn')
    config.set('satisfactionSurvey.reportUrl', 'https://survey.example/report')
    config.set(
      'satisfactionSurvey.summaryLogUrl',
      'https://survey.example/summary-log'
    )

    expect(satisfactionSurveyUrls()).toStrictEqual({
      prnUrl: 'https://survey.example/prn',
      reportUrl: 'https://survey.example/report',
      summaryLogUrl: 'https://survey.example/summary-log'
    })
  })

  it('should offer no survey the environment has not been given a form for', () => {
    config.set('satisfactionSurvey.isEnabled', true)
    config.set('satisfactionSurvey.reportUrl', 'https://survey.example/report')

    expect(satisfactionSurveyUrls()).toStrictEqual({
      prnUrl: '',
      reportUrl: 'https://survey.example/report',
      summaryLogUrl: ''
    })
  })
})
