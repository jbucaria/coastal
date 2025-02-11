import React, { useState, useEffect, useRef } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import * as Location from 'expo-location'
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { useSelectedDate } from '@/store/useSelectedDate'

const GOOGLE_MAPS_API_KEY = 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs' // Replace with your API Key

const TicketsMapScreen = ({ route }) => {
  const { selectedDate } = useSelectedDate()
  const [location, setLocation] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const mapRef = useRef(null)

  useEffect(() => {
    getUserLocation()
    fetchTicketsForDate(selectedDate)
  }, [selectedDate])

  // Get user's current location
  const getUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access for maps.')
        return
      }

      let userLocation = await Location.getCurrentPositionAsync({})
      setLocation({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      })
    } catch (error) {
      console.error('Error fetching location:', error)
    }
  }

  // Fetch tickets from Firestore for the selected date
  const fetchTicketsForDate = async date => {
    try {
      const startOfDay = Timestamp.fromDate(new Date(date.setHours(0, 0, 0, 0)))
      const endOfDay = Timestamp.fromDate(
        new Date(date.setHours(23, 59, 59, 999))
      )

      const ticketsQuery = query(
        collection(firestore, 'tickets'),
        where('startDate', '>=', startOfDay),
        where('startDate', '<=', endOfDay)
      )

      const snapshot = await getDocs(ticketsQuery)
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))

      const ticketLocations = await Promise.all(
        ticketData.map(async ticket => {
          const coordinates = await getGeocode(ticket.address)
          return {
            id: ticket.id,
            ...ticket,
            coordinates,
          }
        })
      )

      setTickets(ticketLocations.filter(ticket => ticket.coordinates !== null))
      setLoading(false)
    } catch (error) {
      console.error('Error fetching tickets:', error)
      Alert.alert('Error', 'Failed to fetch tickets.')
      setLoading(false)
    }
  }

  // Convert address to latitude and longitude using Google Geocoding API
  const getGeocode = async address => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${GOOGLE_MAPS_API_KEY}`
      )

      const data = await response.json()
      if (data.results.length > 0) {
        const location = data.results[0].geometry.location
        return {
          latitude: location.lat,
          longitude: location.lng,
        }
      }
      return null
    } catch (error) {
      console.error('Error getting geocode:', error)
      return null
    }
  }

  // After tickets are loaded, zoom out to show all markers
  useEffect(() => {
    if (tickets.length > 0 && mapRef.current) {
      // Extract coordinates from each ticket (ensure they exist)
      const coordinates = tickets
        .map(ticket => ticket.coordinates)
        .filter(coord => coord !== null)
      if (coordinates.length > 0) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        })
      }
    }
  }, [tickets])

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />
      ) : (
        <MapView
          style={styles.map}
          initialRegion={
            location || {
              latitude: 37.7749, // Default to San Francisco
              longitude: -122.4194,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }
          }
        >
          {/* User's Location Marker */}
          {location && (
            <Marker
              coordinate={location}
              title="Your Location"
              pinColor="blue"
            />
          )}

          {/* Ticket Markers */}
          {tickets.map(ticket => (
            <Marker
              key={ticket.id}
              coordinate={ticket.coordinates}
              title={ticket.customerName || 'Unknown'}
              description={ticket.address}
            />
          ))}
        </MapView>
      )}

      {tickets.length === 0 && !loading && (
        <View style={styles.noTicketsContainer}>
          <Text style={styles.noTicketsText}>
            No tickets found for this date
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}

export default TicketsMapScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noTicketsContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noTicketsText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})
