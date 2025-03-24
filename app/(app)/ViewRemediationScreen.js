'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  View,
  ScrollView,
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
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'

export default function ViewRemediationScreen() {
  const params = useLocalSearchParams()
  const projectIdFromParams = params.projectId
  const { projectId: storeProjectId } = useProjectStore()

  // Use the local param if available; otherwise, fall back to the global store.
  const projectId = projectIdFromParams ?? storeProjectId

  const router = useRouter()

  const [ticket, setTicket] = useState(null)
  const [remediationData, setRemediationData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 8

  // Photo Modal State
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoModalVisible, setPhotoModalVisible] = useState(false)

  // Define header options: Edit, Export CSV, Create Invoice, and Share PDF
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
    {
      label: 'Share PDF',
      onPress: () => generatePDFReport(ticket, remediationData),
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
          setTicket(data) // Store full ticket data
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

  // Function to generate HTML for the PDF report
  const generateHTML = (ticket, remediationData) => {
    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; }
            h2 { color: #333; }
            .room { margin-bottom: 20px; }
            .photo { width: 200px; height: 200px; margin-right: 10px; }
            ul { list-style-type: none; padding-left: 0; }
          </style>
        </head>
        <body>
          <h1>Remediation Report</h1>
          <h2>Ticket Details</h2>
          <p><strong>Ticket Number:</strong> ${ticket.ticketNumber || 'N/A'}</p>
          <p><strong>Address:</strong> ${ticket.address || 'N/A'}</p>
          <p><strong>Inspector:</strong> ${ticket.inspectorName || 'N/A'}</p>
          <p><strong>Start Time:</strong> ${
            ticket.startTime?.toDate?.().toString() || 'N/A'
          }</p>
          <p><strong>End Time:</strong> ${
            ticket.endTime?.toDate?.().toString() || 'N/A'
          }</p>
          <p><strong>Job Type:</strong> ${ticket.typeOfJob || 'N/A'}</p>
          <p><strong>Occupancy:</strong> ${
            ticket.occupied ? 'Occupied' : 'Unoccupied'
          }</p>
          <h2>Remediation Data</h2>
    `

    if (!remediationData.rooms || remediationData.rooms.length === 0) {
      html += `<p>No remediation data available.</p>`
    } else {
      remediationData.rooms.forEach(room => {
        html += `
          <div class="room">
            <h3>${room.roomTitle || 'Unnamed Room'}</h3>
            <ul>
        `
        ;(room.measurements || []).forEach(measurement => {
          html += `<li>${measurement.name}: ${measurement.quantity}</li>`
        })
        html += `</ul>`
        if (room.photos && room.photos.length > 0) {
          html += `<div>`
          room.photos.forEach(photo => {
            html += `<img src="${photo.downloadURL}" class="photo" />`
          })
          html += `</div>`
        }
        html += `</div>`
      })
    }

    html += `
        </body>
      </html>
    `
    return html
  }

  // Function to generate and share the PDF report
  const generatePDFReport = async (ticket, remediationData) => {
    if (!ticket || !remediationData) {
      Alert.alert('Error', 'Data not loaded yet.')
      return
    }

    try {
      const html = generateHTML(ticket, remediationData)
      const { uri } = await Print.printToFileAsync({ html })
      await Sharing.shareAsync(uri)
    } catch (error) {
      console.error('Error generating PDF:', error)
      Alert.alert('Error', 'Failed to generate PDF. Please try again.')
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </View>
    )
  }

  if (
    !remediationData ||
    !remediationData.rooms ||
    remediationData.rooms.length === 0
  ) {
    return (
      <View style={styles.fullScreenContainer}>
        <Text style={styles.errorText}>No remediation data available.</Text>
      </View>
    )
  }

  return (
    <View style={styles.fullScreenContainer}>
      <HeaderWithOptions
        title="Remediation Report"
        onBack={() => router.back()}
        options={headerOptions}
        onHeightChange={height => setHeaderHeight(height)}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: headerHeight + marginBelowHeader },
        ]}
      >
        {remediationData.rooms.map((room, roomIndex) => {
          const roomKey = room.id
            ? room.id
            : `room-${roomIndex}-${room.roomTitle || 'Room'}`

          return (
            <View key={roomKey} style={styles.roomContainer}>
              <Text style={styles.roomTitle}>
                {room.roomTitle || 'Unnamed Room'}
              </Text>
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
              {room.photos &&
                Array.isArray(room.photos) &&
                room.photos.length > 0 && (
                  <ScrollView horizontal style={styles.photoRow}>
                    {room.photos.map((photo, index) => {
                      if (!photo || !photo.downloadURL) return null
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
      {photoModalVisible && (
        <PhotoModal
          visible={photoModalVisible}
          photo={selectedPhoto}
          onClose={() => setPhotoModalVisible(false)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#F3F5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
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
