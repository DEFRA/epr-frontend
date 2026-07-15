/**
 * Builds the view model for the generic "something has gone wrong" error page.
 * @param {(key: string) => string} localise
 * @param {string} homeUrl
 */
export const genericErrorViewModel = (localise, homeUrl) => ({
  pageTitle: localise('error:page:pageTitle'),
  heading: localise('error:page:heading'),
  introText: localise('error:page:introText'),
  causes: {
    intro: localise('error:page:causes:intro'),
    items: [
      localise('error:page:causes:concurrentUse'),
      localise('error:page:causes:technicalProblem')
    ]
  },
  whatNextHeading: localise('error:page:whatNextHeading'),
  homePageLink: {
    prefix: localise('error:page:homePageLink:prefix'),
    text: localise('error:page:homePageLink:text'),
    href: homeUrl
  },
  reportText: localise('error:page:reportText'),
  getHelp: {
    email: {
      label: localise('common:footer:getHelp:emailLabel'),
      value: localise('common:footer:getHelp:email')
    },
    phone: {
      label: localise('common:footer:getHelp:phoneLabel'),
      value: localise('common:footer:getHelp:phone')
    },
    hours: localise('common:footer:getHelp:hours')
  }
})
