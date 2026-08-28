import { describe, expect, it } from 'vitest'
import { getByRole } from '@testing-library/dom'
import { renderComponentDom } from '#server/common/test-helpers/component-helpers.js'

describe('satisfaction survey component', () => {
  const linkName = 'What do you think of this service? (opens in a new tab)'

  const surveyLink = () =>
    getByRole(
      renderComponentDom('satisfaction-survey', {
        href: 'https://survey.example/report',
        text: linkName
      }),
      'link',
      { name: linkName }
    )

  it('should open the survey in a new tab without handing it the referrer', () => {
    const link = surveyLink()

    expect({
      href: link.getAttribute('href'),
      rel: link.getAttribute('rel'),
      target: link.getAttribute('target')
    }).toStrictEqual({
      href: 'https://survey.example/report',
      rel: 'noopener noreferrer',
      target: '_blank'
    })
  })

  it('should say in the link itself that it opens a new tab', () => {
    expect(surveyLink()).toBeDefined()
  })
})
