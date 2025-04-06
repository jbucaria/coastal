'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native'
import MapView, { Marker, Polyline } from 'react-native-maps'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'

// Note: This key is still used for HTTP requests; MapView uses the manifest key
const GOOGLE_MAPS_API_KEY = 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs'
const TicketsMapScreen = ({ route }) => {
  const { selectedDate } = useSelectedDate()
  const router = useRouter()
  const [location, setLocation] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [routeCoords, setRouteCoords] = useState([])
  const [orderedTickets, setOrderedTickets] = useState([])
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0) // Added for dynamic header
  const marginBelowHeader = 8 // Added for spacing
  const mapRef = useRef(null)
  const insets = useSafeAreaInsets()

  const [optimizeRoute, setOptimizeRoute] = useState(true)

  useEffect(() => {
    getUserLocation()
    fetchTicketsForDate(new Date(selectedDate))
  }, [selectedDate])

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access for maps.')
        return
      }
      const userLocation = await Location.getCurrentPositionAsync({})
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

  const fetchTicketsForDate = async date => {
    try {
      const startOfDay = Timestamp.fromDate(
        new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          0,
          0,
          0,
          0
        )
      )
      const endOfDay = Timestamp.fromDate(
        new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          23,
          59,
          59,
          999
        )
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

  const getGeocode = async address => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${GOOGLE_MAPS_API_KEY}`
      )
      const data = await response.json()
      if (data.results.length > 0) {
        const loc = data.results[0].geometry.location
        return {
          latitude: loc.lat,
          longitude: loc.lng,
        }
      }
      return null
    } catch (error) {
      console.error('Error getting geocode:', error)
      return null
    }
  }

  const decodePolyline = encoded => {
    let points = []
    let index = 0,
      len = encoded.length,
      lat = 0,
      lng = 0
    while (index < len) {
      let b,
        shift = 0,
        result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      let dlat = result & 1 ? ~(result >> 1) : result >> 1
      lat += dlat
      shift = 0
      result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      let dlng = result & 1 ? ~(result >> 1) : result >> 1
      lng += dlng
      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      })
    }
    return points
  }

  useEffect(() => {
    const fetchRoute = async () => {
      if (!location || tickets.length === 0) return
      const origin = `${location.latitude},${location.longitude}`
      const destination = origin
      const waypoints = tickets
        .map(
          ticket =>
            `${ticket.coordinates.latitude},${ticket.coordinates.longitude}`
        )
        .join('|')
      const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${waypoints}&key=${GOOGLE_MAPS_API_KEY}`
      try {
        const response = await fetch(directionsUrl)
        const data = await response.json()

        if (data.routes && data.routes.length > 0) {
          const encodedPolyline = data.routes[0].overview_polyline.points
          const coords = decodePolyline(encodedPolyline)
          setRouteCoords(coords)
          if (
            optimizeRoute &&
            data.routes[0].waypoint_order &&
            data.routes[0].waypoint_order.length === tickets.length
          ) {
            const order = data.routes[0].waypoint_order
            const ordered = order.map(idx => tickets[idx])
            setOrderedTickets(ordered)
          } else {
            const scheduled = [...tickets].sort(
              (a, b) => a.startDate.seconds - b.startDate.seconds
            )
            setOrderedTickets(scheduled)
          }
        }
      } catch (error) {
        console.error('Error fetching directions:', error)
      }
    }
    fetchRoute()
  }, [tickets, location, optimizeRoute])

  useEffect(() => {
    if (tickets.length > 0 && mapRef.current) {
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

  const orderMap = {}
  if (orderedTickets.length > 0) {
    orderedTickets.forEach((ticket, index) => {
      orderMap[ticket.id] = index + 1
    })
  }

  return (
    <View style={styles.container}>
      <HeaderWithOptions
        title="Tickets Map"
        onBack={() => router.back()}
        options={[]}
        onHeightChange={height => setHeaderHeight(height)}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={
            location || {
              latitude: 37.7749,
              longitude: -122.4194,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }
          }
        >
          {location && (
            <Marker
              coordinate={location}
              title="Your Location"
              pinColor="blue"
            />
          )}
          {tickets.map(ticket => (
            <Marker
              key={ticket.id}
              coordinate={ticket.coordinates}
              title={ticket.customerName || 'Unknown'}
              description={ticket.address}
            >
              {orderMap[ticket.id] && (
                <View style={styles.customMarker}>
                  <Text style={styles.markerNumber}>{orderMap[ticket.id]}</Text>
                </View>
              )}
            </Marker>
          ))}
          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#007BFF"
              strokeWidth={3}
            />
          )}
        </MapView>
      )}
      {tickets.length === 0 && !loading && (
        <View style={styles.noTicketsContainer}>
          <Text style={styles.noTicketsText}>
            No tickets found for this date
          </Text>
        </View>
      )}
      <View
        style={{ position: 'absolute', right: 25, bottom: insets.bottom + 60 }}
      >
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => setShowDetailsModal(true)}
        >
          <Text style={styles.detailsButtonText}>Route Details</Text>
        </TouchableOpacity>
      </View>
      <View style={{ position: 'absolute', left: 25, top: insets.top + 80 }}>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>
            {optimizeRoute ? 'Optimized' : 'Scheduled'}
          </Text>
          <TouchableOpacity
            onPress={() => setOptimizeRoute(!optimizeRoute)}
            style={styles.switchButton}
          >
            <Text style={styles.switchButtonText}>Toggle Order</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Modal
        visible={showDetailsModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.detailsModalContainer}>
          <View style={styles.detailsModalHeader}>
            <Text style={styles.detailsModalTitle}>Route Details</Text>
            <TouchableOpacity
              onPress={() => setShowDetailsModal(false)}
              style={styles.detailsModalCloseButton}
            >
              <Text style={styles.detailsModalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.detailsModalContent}>
            {(orderedTickets.length > 0 ? orderedTickets : tickets).map(
              (ticket, index) => (
                <View key={ticket.id} style={styles.ticketDetail}>
                  <Text style={styles.ticketIndex}>{index + 1}.</Text>
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketName}>
                      {ticket.customerName || 'Unknown'}
                    </Text>
                    <Text style={styles.ticketAddress}>{ticket.address}</Text>
                  </View>
                </View>
              )
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

export default TicketsMapScreen

const styles = StyleSheet.create({
  container: { flex: 1 },
  customMarker: {
    backgroundColor: '#1DA1F2',
    borderRadius: 15,
    padding: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  detailsButton: {
    backgroundColor: '#007BFF',
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsModalCloseButton: {
    backgroundColor: '#007BFF',
    borderRadius: 4,
    padding: 8,
  },
  detailsModalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    height: '60%', // Reduced height for iPhone
    marginTop: 'auto', // Align modal to the bottom
    borderTopLeftRadius: 16, // Rounded corners for better appearance
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  detailsModalContent: {
    padding: 16,
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#E1E8ED',
  },
  detailsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14171A',
  },
  loader: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  map: { flex: 1 },
  noTicketsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    left: '50%',
    padding: 16,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    top: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
  },
  noTicketsText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  switchButton: {
    backgroundColor: '#007BFF',
    borderRadius: 4,
    padding: 8,
  },
  switchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  switchContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 4,
    flexDirection: 'row',
    padding: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  ticketAddress: { fontSize: 12, color: '#333' },
  ticketDetail: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 3,
    marginHorizontal: 8,
    padding: 8,
    minWidth: 200,
  },
  ticketIndex: { fontSize: 16, fontWeight: 'bold', marginRight: 4 },
  ticketInfo: { flex: 1 },
  ticketName: { fontSize: 16, fontWeight: 'bold' },
  markerNumber: { color: '#fff', fontWeight: '700', fontSize: 12 },
})
