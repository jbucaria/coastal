// utils/getTravelTime.js
import { getCurrentLocation } from './getCurrentLocation'
import Constants from 'expo-constants'

const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey

export const getTravelTime = async destination => {
  try {
    // Get user's current location
    const currentLocation = await getCurrentLocation()
    const origin = `${currentLocation.latitude},${currentLocation.longitude}`

    // Replace with your API key (load this securely in production)
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(destination)}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK') {
      const leg = data.routes[0].legs[0]
      return {
        durationText: leg.duration.text, // e.g., "25 mins"
        durationValue: leg.duration.value, // in seconds
        distanceText: leg.distance.text, // e.g., "10 km"
        distanceValue: leg.distance.value,
      }
    } else {
      throw new Error(`Directions request failed: ${data.status}`)
    }
  } catch (error) {
    console.error('Error fetching travel time:', error)
    throw error
  }
}
