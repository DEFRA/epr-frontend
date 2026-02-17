/**
 * @satisfies {Partial<ServerRoute>}
 */
export const errorController = {
  handler(request, h) {
    const { organisationId } = request.params
    const { t: localise } = request

    const homeUrl = `/organisations/${organisationId}`

    return h.view('organisations/error', {
      pageTitle: localise('organisations:error:pageTitle'),
      heading: localise('organisations:error:heading'),
      introText: localise('organisations:error:introText'),
      causesIntro: localise('organisations:error:causesIntro'),
      causesConcurrentUse: localise('organisations:error:causesConcurrentUse'),
      causesTechnicalProblem: localise(
        'organisations:error:causesTechnicalProblem'
      ),
      whatNextHeading: localise('organisations:error:whatNextHeading'),
      homePageText: {
        prefix: localise('organisations:error:homePagePrefix'),
        link: {
          href: homeUrl,
          text: localise('organisations:error:homePageLink')
        }
      },
      reportText: localise('organisations:error:reportText'),
      emailLabel: localise('common:footer:getHelp:emailLabel'),
      email: localise('common:footer:getHelp:email'),
      phoneLabel: localise('common:footer:getHelp:phoneLabel'),
      phone: localise('common:footer:getHelp:phone'),
      hours: localise('common:footer:getHelp:hours')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
