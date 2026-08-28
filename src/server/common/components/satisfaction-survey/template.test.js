import { describe, expect, it } from 'vitest'
import { getByRole, getByText, queryByText } from '@testing-library/dom'
import { renderComponentDom } from '#server/common/test-helpers/component-helpers.js'

describe('satisfaction survey component', () => {
  const linkText = 'What do you think of this service? (opens in a new tab)'

  /**
   * @param {string} href
   */
  const render = (href) =>
    renderComponentDom('satisfaction-survey', { href, text: linkText })

  it('should ask the user what they think, and say the survey opens a new tab', () => {
    const body = render('https://survey.example/report')

    expect(getByText(body, linkText)).toBeDefined()
  })

  it('should send the user to the survey in a new tab without handing it the referrer', () => {
    const link = getByRole(render('https://survey.example/report'), 'link', {
      name: linkText
    })

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

  it('should ask nothing when there is no survey to send the user to', () => {
    expect(queryByText(render(''), linkText)).toBeNull()
  })
})
