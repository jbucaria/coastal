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

  const projectId = projectIdFromParams ?? storeProjectId

  const router = useRouter()

  const [ticket, setTicket] = useState(null)
  const [remediationData, setRemediationData] = useState(null)
  const [filteredRooms, setFilteredRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 8

  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoModalVisible, setPhotoModalVisible] = useState(false)

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(firestore, 'tickets', projectId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setTicket(data)
          const remData = data.remediationData || { rooms: [] }
          // Filter rooms with actual line items (excluding room name line items)
          const roomsWithLineItems = remData.rooms.filter(room => {
            const actualMeasurements = (room.measurements || []).filter(
              m => !m.isRoomName
            )
            return actualMeasurements.length > 0
          })
          setRemediationData({ ...remData, rooms: roomsWithLineItems })
          setFilteredRooms(roomsWithLineItems)
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

  const generateHTML = (ticket, remediationData) => {
    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; }
            h2 { color: #333; }
            h3 { color: #555; }
            .room { margin-bottom: 20px; }
            .photo { width: 200px; height: 200px; margin-right: 10px; }
            .photo-label { font-size: 12px; color: #666; margin-bottom: 10px; }
            ul { list-style-type: none; padding-left: 0; }
            li { margin-bottom: 5px; }
            .notes { font-style: italic; color: #666; }
            .fans { color: #17BF63; }
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
        `
        if (room.notes) {
          html += `<p class="notes"><strong>Notes:</strong> ${room.notes}</p>`
        }
        if (room.numberOfFans > 0) {
          html += `<p class="fans"><strong>Number of Fans:</strong> ${room.numberOfFans}</p>`
        }
        html += `<ul>`
        ;(room.measurements || []).forEach(measurement => {
          if (measurement.isRoomName) {
            html += `<li><strong>${measurement.name}</strong> (Taxable)</li>`
          } else {
            html += `<li>${measurement.name}${
              measurement.description ? ` - ${measurement.description}` : ''
            }: ${measurement.quantity}</li>`
          }
        })
        html += `</ul>`
        if (room.photos && room.photos.length > 0) {
          html += `<div>`
          room.photos.forEach(photo => {
            html += `<img src="${photo.downloadURL}" class="photo" />`
            if (photo.label) {
              html += `<p class="photo-label">${photo.label}</p>`
            }
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

  if (!remediationData || !filteredRooms || filteredRooms.length === 0) {
    return (
      <View style={styles.fullScreenContainer}>
        <HeaderWithOptions
          title="Remediation Report"
          onBack={() => router.back()}
          options={headerOptions}
          onHeightChange={height => setHeaderHeight(height)}
        />
        <Text style={styles.errorText}>
          No remediation data with line items available.
        </Text>
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
        {filteredRooms.map((room, roomIndex) => {
          const roomKey = room.id
            ? room.id
            : `room-${roomIndex}-${room.roomTitle || 'Room'}`

          return (
            <View key={roomKey} style={styles.roomContainer}>
              <Text style={styles.roomTitle}>
                {room.roomTitle || 'Unnamed Room'}
              </Text>
              {room.notes && (
                <Text style={styles.notesText}>
                  <Text style={styles.label}>Notes: </Text>
                  {room.notes}
                </Text>
              )}
              {room.numberOfFans > 0 && (
                <Text style={styles.fansText}>
                  <Text style={styles.label}>Number of Fans: </Text>
                  {room.numberOfFans}
                </Text>
              )}
              {room.measurements &&
                room.measurements.map((measurement, measIndex) => {
                  const measurementKey = measurement.id
                    ? measurement.id
                    : `meas-${roomKey}-${measIndex}`
                  return (
                    <View key={measurementKey} style={styles.measurementRow}>
                      {measurement.isRoomName ? (
                        <Text style={styles.roomNameMeasurement}>
                          {measurement.name} (Taxable)
                        </Text>
                      ) : (
                        <Text style={styles.measurementText}>
                          {measurement.name}
                          {measurement.description
                            ? ` - ${measurement.description}`
                            : ''}
                          : {measurement.quantity}
                        </Text>
                      )}
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
                          {photo.label && (
                            <Text style={styles.photoLabel}>{photo.label}</Text>
                          )}
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
  notesText: {
    fontSize: 14,
    color: '#657786',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  fansText: {
    fontSize: 14,
    color: '#17BF63',
    marginBottom: 4,
  },
  label: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  measurementRow: {
    marginVertical: 4,
  },
  roomNameMeasurement: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
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
    alignItems: 'center',
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  photoLabel: {
    fontSize: 12,
    color: '#657786',
    marginTop: 4,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    fontSize: 16,
    marginTop: 20,
  },
})
