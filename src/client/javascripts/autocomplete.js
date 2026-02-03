import accessibleAutocomplete from 'accessible-autocomplete'

/**
 * Initialise accessible autocomplete on select elements with data-module="autocomplete"
 */
export function initAutocomplete() {
  const selects = document.querySelectorAll(
    'select[data-module="autocomplete"]'
  )

  selects.forEach((selectElement) => {
    const selectId = selectElement.id

    accessibleAutocomplete.enhanceSelectElement({
      selectElement,
      showAllValues: true,
      defaultValue: '',
      onConfirm: (value) => {
        // When user confirms a selection, update the hidden recipientName field
        const hiddenNameField = document.getElementById(`${selectId}Name`)
        if (hiddenNameField && value) {
          hiddenNameField.value = value
        }

        // Also update the original select's value
        const options = Array.from(selectElement.options)
        const matchingOption = options.find((opt) => opt.text === value)
        if (matchingOption) {
          selectElement.value = matchingOption.value
        }
      }
    })
  })
}
