// helpers.js

// Formats a phone number as (xxx) xxx-xxxx
export function formatPhoneNumber(number) {
  console.log('formatPhoneNumber', number)
  if (!number) return ''
  const numStr = String(number)
  const cleaned = numStr.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/)
  if (!match) return number
  let formatted = ''
  if (match[1]) formatted = '(' + match[1]
  if (match[2]) formatted += ') ' + match[2]
  if (match[3]) formatted += '-' + match[3]
  return formatted
}

// Parses address components from Google Places
export function parseAddressComponents(addressComponents) {
  const components = { street: '', city: '', state: '', zip: '' }
  addressComponents.forEach(component => {
    if (component.types.includes('street_number')) {
      components.street = component.long_name + ' '
    }
    if (component.types.includes('route')) {
      components.street += component.long_name
    }
    if (component.types.includes('locality')) {
      components.city = component.long_name
    }
    if (component.types.includes('administrative_area_level_1')) {
      components.state = component.short_name
    }
    if (component.types.includes('postal_code')) {
      components.zip = component.long_name
    }
  })
  return components
}

// Sets the time of a base date to match the time of another Date object
export function setTimeToDate(baseDate, timeDate) {
  const newDate = new Date(baseDate)
  newDate.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0)
  return newDate
}
