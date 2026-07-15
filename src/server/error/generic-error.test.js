import { describe, expect, it } from 'vitest'

import { genericErrorViewModel } from '#server/error/generic-error.js'

describe(genericErrorViewModel, () => {
  const localise = (key) => key

  it('builds the grouped view model with the given home url', () => {
    const model = genericErrorViewModel(localise, '/')

    expect(model).toStrictEqual({
      pageTitle: 'error:page:pageTitle',
      heading: 'error:page:heading',
      introText: 'error:page:introText',
      causes: {
        intro: 'error:page:causes:intro',
        items: [
          'error:page:causes:concurrentUse',
          'error:page:causes:technicalProblem'
        ]
      },
      whatNextHeading: 'error:page:whatNextHeading',
      homePageLink: {
        prefix: 'error:page:homePageLink:prefix',
        text: 'error:page:homePageLink:text',
        href: '/'
      },
      reportText: 'error:page:reportText',
      getHelp: {
        email: {
          label: 'common:footer:getHelp:emailLabel',
          value: 'common:footer:getHelp:email'
        },
        phone: {
          label: 'common:footer:getHelp:phoneLabel',
          value: 'common:footer:getHelp:phone'
        },
        hours: 'common:footer:getHelp:hours'
      }
    })
  })

  it('threads an organisation-specific home url through unchanged', () => {
    const model = genericErrorViewModel(localise, '/organisations/org-123')

    expect(model.homePageLink.href).toBe('/organisations/org-123')
  })
})
