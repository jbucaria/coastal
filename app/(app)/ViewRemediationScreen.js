'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { exportCSVReport } from '@/utils/createCSVReport'
import { PhotoModal } from '@/components/PhotoModal'
import useProjectStore from '@/store/useProjectStore'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'

export default function ViewRemediationScreen() {
  const params = useLocalSearchParams()
  const projectIdFromParams = params.projectId
  const { projectId: storeProjectId } = useProjectStore()

  // Use the local param if available; otherwise, fall back to the global store.
  const projectId = projectIdFromParams ?? storeProjectId

  const router = useRouter()
  const HEADER_HEIGHT = 80

  const [remediationData, setRemediationData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Photo Modal State
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoModalVisible, setPhotoModalVisible] = useState(false)

  // Define header options: Edit, Export CSV, and Create Invoice.
  const headerOptions = [
    {
      label: 'Edit',
      onPress: () =>
        router.push({
          pathname: '/RemediationScreen',
          params: { projectId: projectId },
        }),
    },
    {
      label: 'CSV',
      onPress: () => exportCSVReport(remediationData, projectId),
    },
    {
      label: 'Invoice',
      onPress: () => router.push({ pathname: '/ViewInvoiceScreen' }),
    },
  ]

  // Fetch remediation data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(firestore, 'tickets', projectId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          // Ensure remediationData is not null and has a rooms array
          setRemediationData(data.remediationData || { rooms: [] })
        } else {
          Alert.alert('Error', 'No remediation data found.')
        }
      } catch (error) {
        console.error('Error fetching remediation data:', error)
        Alert.alert('Error', 'Failed to load data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [projectId])

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </SafeAreaView>
    )
  }

  if (
    !remediationData ||
    !remediationData.rooms ||
    remediationData.rooms.length === 0
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No remediation data available.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithOptions
        title="Remediation Report"
        onBack={() => router.back()}
        options={headerOptions}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: HEADER_HEIGHT },
        ]}
      >
        {/* Map over rooms */}
        {remediationData.rooms.map((room, roomIndex) => {
          // Use room.id if available; otherwise, combine the index and room name
          const roomKey = room.id
            ? room.id
            : `room-${roomIndex}-${room.roomTitle || 'Room'}`

          return (
            <View key={roomKey} style={styles.roomContainer}>
              {/* Room Name */}
              <Text style={styles.roomTitle}>
                {room.roomTitle || 'Unnamed Room'}
              </Text>

              {/* Measurements */}
              {room.measurements &&
                room.measurements.map((measurement, measIndex) => {
                  const measurementKey = measurement.id
                    ? measurement.id
                    : `meas-${roomKey}-${measIndex}`
                  return (
                    <View key={measurementKey} style={styles.measurementRow}>
                      <Text style={styles.measurementText}>
                        {measurement.name}: {measurement.quantity}
                      </Text>
                    </View>
                  )
                })}

              {/* Photos */}
              {room.photos &&
                Array.isArray(room.photos) &&
                room.photos.length > 0 && (
                  <ScrollView horizontal style={styles.photoRow}>
                    {room.photos.map((photo, index) => {
                      // Provide a fallback if photo is missing or invalid
                      if (!photo || !photo.downloadURL) return null

                      // Unique key for photo (use storagePath if available)
                      const photoKey = photo.storagePath || `photo-${index}`

                      return (
                        <TouchableOpacity
                          key={photoKey}
                          onPress={() => {
                            setSelectedPhoto(photo.downloadURL)
                            setPhotoModalVisible(true)
                          }}
                          style={styles.photoItem}
                        >
                          <Image
                            source={{ uri: photo.downloadURL }}
                            style={styles.photoImage}
                          />
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                )}
            </View>
          )
        })}
      </ScrollView>

      {/* Photo Modal */}
      {photoModalVisible && (
        <PhotoModal
          visible={photoModalVisible}
          photo={selectedPhoto}
          onClose={() => setPhotoModalVisible(false)}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#2C3E50',
  },
  roomContainer: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  measurementRow: {
    marginVertical: 4,
  },
  measurementText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  photoRow: {
    marginTop: 10,
  },
  photoItem: {
    marginRight: 8,
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    fontSize: 16,
    marginTop: 20,
  },
})
