// // utils/getCurrentLocation.js
// import * as Location from 'expo-location'

// export const getCurrentLocation = async () => {
//   try {
//     const { status } = await Location.requestForegroundPermissionsAsync()
//     if (status !== 'granted') {
//       throw new Error('Location permission not granted')
//     }
//     const location = await Location.getCurrentPositionAsync({})
//     return {
//       latitude: location.coords.latitude,
//       longitude: location.coords.longitude,
//     }
//   } catch (error) {
//     console.error('Error getting current location:', error)
//     throw error
//   }
// }
