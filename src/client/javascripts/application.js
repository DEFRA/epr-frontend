import accessibleAutocomplete from 'accessible-autocomplete'
import {
  Accordion,
  Button,
  CharacterCount,
  Checkboxes,
  createAll,
  ErrorSummary,
  Radios,
  SkipLink,
  Tabs
} from 'govuk-frontend'

createAll(Accordion)
createAll(Button)
createAll(CharacterCount)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Radios)
createAll(SkipLink)
createAll(Tabs)

const autocompleteSelects = document.querySelectorAll(
  'select[data-autocomplete]'
)
for (const select of autocompleteSelects) {
  accessibleAutocomplete.enhanceSelectElement({
    defaultValue: '',
    minLength: 2,
    selectElement: select,
    showAllValues: false
  })
}

/**
 * Supplier search for the received-loads supplier details page. Enhances the
 * "saved suppliers" select into an accessible autocomplete that, on confirming
 * a saved supplier, fills in the detail fields so a repeat supplier does not
 * have to be retyped. The control is purely a prefill aid: leaving it blank
 * means the typed-in fields describe a new supplier.
 */
const supplierPicker = document.querySelector('select[data-supplier-picker]')
const supplierData = document.querySelector('script[data-supplier-data]')
if (supplierPicker && supplierData) {
  const suppliers = JSON.parse(supplierData.textContent)
  const supplierFields = [
    'supplierName',
    'supplierAddress',
    'supplierPostcode',
    'supplierEmail',
    'supplierPhone',
    'activitiesCarriedOut'
  ]
  accessibleAutocomplete.enhanceSelectElement({
    selectElement: supplierPicker,
    autoselect: false,
    defaultValue: '',
    minLength: 0,
    showAllValues: true,
    onConfirm: (confirmed) => {
      const supplier = suppliers.find((s) => s.supplierName === confirmed)
      if (supplier) {
        for (const id of supplierFields) {
          const field = document.getElementById(id)
          if (field) {
            field.value = supplier[id] ?? ''
          }
        }
      }
    }
  })
}

/**
 * Prevents stale uploadId errors when user navigates back to upload page.
 * When browser restores the page from bfcache (back-forward cache), the form
 * contains the old uploadId which CDP will reject. Force a reload to get a
 * fresh uploadId from the server.
 */
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload()
  }
})
