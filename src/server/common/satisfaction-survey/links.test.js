import { afterEach, describe, expect, it } from 'vitest'
import { config } from '#config/config.js'
import { satisfactionSurveyLinks } from '#server/common/satisfaction-survey/links.js'

describe('#satisfactionSurveyLinks', () => {
  const localise = (key) => key

  const copy = {
    title: 'common:satisfactionSurvey:title',
    body: 'common:satisfactionSurvey:body',
    linkText: 'common:satisfactionSurvey:link'
  }

  afterEach(() => {
    config.reset('satisfactionSurvey.isEnabled')
    config.reset('satisfactionSurvey.prnUrl')
    config.reset('satisfactionSurvey.reportUrl')
    config.reset('satisfactionSurvey.summaryLogUrl')
  })

  it('should offer no survey while the flag is off', () => {
    config.set('satisfactionSurvey.prnUrl', 'https://survey.example/prn')

    expect(satisfactionSurveyLinks(localise)).toStrictEqual({
      prn: { href: '', ...copy },
      report: { href: '', ...copy },
      summaryLog: { href: '', ...copy }
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
      prn: { href: 'https://survey.example/prn', ...copy },
      report: { href: 'https://survey.example/report', ...copy },
      summaryLog: { href: 'https://survey.example/summary-log', ...copy }
    })
  })

  it('should offer no survey the environment has not been given a form for', () => {
    config.set('satisfactionSurvey.isEnabled', true)
    config.set('satisfactionSurvey.reportUrl', 'https://survey.example/report')

    expect(satisfactionSurveyLinks(localise)).toStrictEqual({
      prn: { href: '', ...copy },
      report: { href: 'https://survey.example/report', ...copy },
      summaryLog: { href: '', ...copy }
    })
  })
})
