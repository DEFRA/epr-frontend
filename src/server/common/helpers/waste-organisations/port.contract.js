import { testGetOrganisationsBehaviour } from './contract/get-organisations.contract.js'

export const testWasteOrganisationsServiceContract = (it) => {
  testGetOrganisationsBehaviour(it)
}
