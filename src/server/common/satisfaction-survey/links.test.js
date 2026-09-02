import { afterEach, describe, expect, it } from 'vitest'
import { config } from '#config/config.js'
import { satisfactionSurveyLinks } from '#server/common/satisfaction-survey/links.js'

describe('#satisfactionSurveyLinks', () => {
  const localise = (key) =>
    key === 'common:satisfactionSurvey:link'
      ? 'What do you think of this service? (opens in a new tab)'
      : key

  const linkText = 'What do you think of this service? (opens in a new tab)'

  afterEach(() => {
    config.reset('satisfactionSurvey.isEnabled')
    config.reset('satisfactionSurvey.prnUrl')
    config.reset('satisfactionSurvey.reportUrl')
    config.reset('satisfactionSurvey.summaryLogUrl')
  })

  it('should offer no survey while the flag is off', () => {
    config.set('satisfactionSurvey.prnUrl', 'https://survey.example/prn')

    expect(satisfactionSurveyLinks(localise)).toStrictEqual({
      prn: { href: '', text: linkText },
      report: { href: '', text: linkText },
      summaryLog: { href: '', text: linkText }
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

    expect(satisfactionSurveyLinks(localise)).toStrictEqual({
      prn: { href: 'https://survey.example/prn', text: linkText },
      report: { href: 'https://survey.example/report', text: linkText },
      summaryLog: {
        href: 'https://survey.example/summary-log',
        text: linkText
      }
    })
  })

  it('should offer no survey the environment has not been given a form for', () => {
    config.set('satisfactionSurvey.isEnabled', true)
    config.set('satisfactionSurvey.reportUrl', 'https://survey.example/report')

    expect(satisfactionSurveyLinks(localise)).toStrictEqual({
      prn: { href: '', text: linkText },
      report: { href: 'https://survey.example/report', text: linkText },
      summaryLog: { href: '', text: linkText }
    })
  })
})
