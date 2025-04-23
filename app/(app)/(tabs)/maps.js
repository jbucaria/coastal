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
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { useSelectedDate } from '@/store/useSelectedDate'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'

const GOOGLE_MAPS_API_KEY = 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs'

const TicketsMapScreen = () => {
  const { selectedDate } = useSelectedDate()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [location, setLocation] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [routeCoords, setRouteCoords] = useState([])
  const [orderedTickets, setOrderedTickets] = useState([])
  const [showDetailsSheet, setShowDetailsSheet] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)

  const mapRef = useRef(null)
  const [optimizeRoute, setOptimizeRoute] = useState(true)

  // Get user location
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
        latitudeDelta: 1.5, // Increased delta for zoomed out view
        longitudeDelta: 1.5,
      })
    } catch (error) {
      console.error('Error fetching location:', error)
    }
  }

  // Fetch tickets for selected date with proper UTC date comparison
  const fetchTicketsForDate = async date => {
    try {
      const startOfDayUTC = new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          0,
          0,
          0,
          0
        )
      )
      const endOfDayUTC = new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          23,
          59,
          59,
          999
        )
      )
      const startStr = startOfDayUTC.toISOString()
      const endStr = endOfDayUTC.toISOString()

      const ticketsQuery = query(
        collection(firestore, 'tickets'),
        where('startDate', '>=', startStr),
        where('startDate', '<=', endStr)
      )

      const snapshot = await getDocs(ticketsQuery)
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Geocode tickets
      const ticketLocations = await Promise.all(
        ticketData.map(async ticket => {
          const coordinates = await getGeocode(ticket.address)
          return { id: ticket.id, ...ticket, coordinates }
        })
      )
      const validTickets = ticketLocations.filter(
        ticket => ticket.coordinates !== null
      )
      setTickets(validTickets)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching tickets:', error)
      Alert.alert('Error', 'Failed to fetch tickets: ' + error.message)
      setLoading(false)
    }
  }

  const getGeocode = async address => {
    try {
      // Try to build a full address with state and zip if available
      const ticket = tickets.find(t => t.address === address) || {}
      const fullAddress = `${address}, ${ticket.state || ''} ${
        ticket.zip || ''
      }`.trim()
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          fullAddress
        )}&key=${GOOGLE_MAPS_API_KEY}`
      )
      const data = await response.json()
      if (data.results.length > 0) {
        const loc = data.results[0].geometry.location
        return { latitude: loc.lat, longitude: loc.lng }
      }
      return null
    } catch (error) {
      console.error('Error getting geocode:', error)
      return null
    }
  }

  // Decode polyline from directions API
  const decodePolyline = encoded => {
    let points = []
    let index = 0,
      lat = 0,
      lng = 0
    while (index < encoded.length) {
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
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 })
    }
    return points
  }

  // Fetch driving route using Google Directions API
  useEffect(() => {
    const fetchRoute = async () => {
      if (!location || tickets.length === 0) return
      const origin = `${location.latitude},${location.longitude}`
      const waypointsStr = tickets
        .map(
          ticket =>
            `${ticket.coordinates.latitude},${ticket.coordinates.longitude}`
        )
        .join('|')
      const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${origin}&waypoints=optimize:true|${waypointsStr}&key=${GOOGLE_MAPS_API_KEY}`
      try {
        const response = await fetch(directionsUrl)
        const data = await response.json()
        if (data.routes && data.routes.length > 0) {
          const encodedPolyline = data.routes[0].overview_polyline.points
          const coords = decodePolyline(encodedPolyline)
          setRouteCoords(coords)
          if (
            optimizeRoute &&
            data.routes[0].waypoint_order?.length === tickets.length
          ) {
            const order = data.routes[0].waypoint_order
            setOrderedTickets(order.map(idx => tickets[idx]))
          } else {
            const scheduled = [...tickets].sort(
              (a, b) => new Date(a.startDate) - new Date(b.startDate)
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

  // Fit map to markers
  useEffect(() => {
    if (tickets.length > 0 && mapRef.current) {
      const coordinates = tickets
        .map(ticket => ticket.coordinates)
        .filter(coord => coord !== null)
      if (coordinates.length > 0) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        })
      }
    }
  }, [tickets])

  // Build order map for marker numbering
  const orderMap = {}
  if (orderedTickets.length > 0) {
    orderedTickets.forEach((ticket, index) => {
      orderMap[ticket.id] = index + 1
    })
  }

  // Initialization
  useEffect(() => {
    getUserLocation()
    const dateToUse = selectedDate ? new Date(selectedDate) : new Date()
    fetchTicketsForDate(dateToUse)
  }, [selectedDate])

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
      {/* Details Bottom Sheet Button */}
      <View style={[styles.buttonContainer, { bottom: insets.bottom + 30 }]}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => setShowDetailsSheet(true)}
        >
          <Text style={styles.detailsButtonText}>Route Details</Text>
        </TouchableOpacity>
      </View>
      {/* Toggle Route Order */}
      <View style={[styles.switchContainer, { top: insets.top + 80 }]}>
        <Text style={styles.switchLabel}>
          {optimizeRoute ? 'Optimized' : 'Scheduled'}
        </Text>
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setOptimizeRoute(!optimizeRoute)}
        >
          <Text style={styles.switchButtonText}>Toggle Order</Text>
        </TouchableOpacity>
      </View>
      {/* Redesigned Bottom Sheet for Details */}
      <Modal
        visible={showDetailsSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetailsSheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Route Details</Text>
              <TouchableOpacity
                onPress={() => setShowDetailsSheet(false)}
                style={styles.sheetCloseButton}
              >
                <Text style={styles.sheetCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent}>
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
        </View>
      </Modal>
    </View>
  )
}

export default TicketsMapScreen

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  map: { flex: 1 },
  customMarker: {
    backgroundColor: '#1DA1F2',
    borderRadius: 15,
    padding: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  markerNumber: { color: '#fff', fontWeight: '700', fontSize: 12 },
  noTicketsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    position: 'absolute',
    left: '50%',
    top: '50%',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    transform: [{ translateX: -100 }, { translateY: -50 }],
  },
  noTicketsText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  buttonContainer: {
    position: 'absolute',
    right: 25,
  },
  detailsButton: {
    backgroundColor: '#007BFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  detailsButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  switchContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    position: 'absolute',
    left: 25,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', marginRight: 8 },
  switchButton: {
    backgroundColor: '#007BFF',
    borderRadius: 6,
    padding: 8,
  },
  switchButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  // Bottom Sheet Styles
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#14171A' },
  sheetCloseButton: {
    backgroundColor: '#007BFF',
    borderRadius: 4,
    padding: 8,
  },
  sheetCloseButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sheetContent: { padding: 16 },
  ticketDetail: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 3,
    marginBottom: 12,
    padding: 8,
    minWidth: 200,
  },
  ticketIndex: { fontSize: 16, fontWeight: 'bold', marginRight: 4 },
  ticketInfo: { flex: 1 },
  ticketName: { fontSize: 16, fontWeight: 'bold' },
  ticketAddress: { fontSize: 12, color: '#333' },
})
