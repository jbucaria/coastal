'use client'

import React, { useState, useEffect } from 'react'
import { useLocalSearchParams } from 'expo-router'
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native'
import Pdf from 'react-native-pdf'
import * as Sharing from 'expo-sharing'
import useTicket from '@/hooks/useTicket'
import useProjectStore from '@/store/useProjectStore'
import { useRouter } from 'expo-router'
import { generatePDF } from '@/utils/pdfGenerator'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { FloatingButton } from '@/components/FloatingButton'
import { uploadPDFToFirestore } from '@/utils/pdfUploader'
import { updateTicketPdfUrl } from '@/utils/firestoreUtils'
import { PhotoModal } from '@/components/PhotoModal'
import { TicketDetailsCard, RoomCard } from '@/components/Cards'

const ViewReportScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const projectIdFromParams = params.projectId
  const { projectId: storeProjectId } = useProjectStore()

  const projectId = projectIdFromParams ?? storeProjectId

  const { ticket, error } = useTicket(projectId)
  const [pdfUri, setPdfUri] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isViewerVisible, setIsViewerVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedTicket, setEditedTicket] = useState(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 8

  useEffect(() => {
    if (ticket) {
      setEditedTicket(ticket)
    }
  }, [ticket])

  const handleTicketFieldChange = (field, value) => {
    setEditedTicket({ ...editedTicket, [field]: value })
  }

  const handleRoomFieldChange = (roomId, newFindings) => {
    const updatedRooms = editedTicket.inspectionData.rooms.map(room =>
      room.id === roomId ? { ...room, inspectionFindings: newFindings } : room
    )
    setEditedTicket({
      ...editedTicket,
      inspectionData: { ...editedTicket.inspectionData, rooms: updatedRooms },
    })
  }

  const handleGenerateReport = async () => {
    if (!ticket) {
      Alert.alert('Error', 'Ticket data is not available.')
      return
    }
    setIsGenerating(true)
    try {
      const localPdfUri = await generatePDF(ticket)
      const uploadedPdfUrl = await uploadPDFToFirestore(ticket, localPdfUri)
      await updateTicketPdfUrl(ticket.id, uploadedPdfUrl)
      setPdfUri(uploadedPdfUrl)
      Alert.alert(
        'Success',
        'PDF report generated and uploaded. Would you like to view the report now?',
        [
          { text: 'Home', onPress: () => router.push({ pathname: '/(tabs)' }) },
          { text: 'View Report', onPress: () => setIsViewerVisible(true) },
        ]
      )
    } catch (error) {
      console.error('Error generating and uploading PDF:', error)
      Alert.alert('Error', 'Failed to generate and upload PDF report.')
    }
    setIsGenerating(false)
  }

  useEffect(() => {
    if (ticket && ticket.pdfUrl) {
      setPdfUri(ticket.pdfUrl)
    }
  }, [ticket])

  const handleViewReport = () => {
    if (pdfUri) {
      setIsViewerVisible(true)
    } else {
      Alert.alert('No Report', 'Please generate a report first.')
    }
  }

  const handleShareReport = async () => {
    if (pdfUri) {
      const available = await Sharing.isAvailableAsync()
      if (available) {
        await Sharing.shareAsync(pdfUri)
      } else {
        Alert.alert('Share Report', 'Sharing is not available on this device.')
      }
    } else {
      Alert.alert('No Report', 'Please generate a report first.')
    }
  }

  const handleSaveChanges = async () => {
    try {
      await updateTicketData(editedTicket.id, editedTicket)
      Alert.alert('Success', 'Ticket updated successfully.')
      setIsEditMode(false)
    } catch (error) {
      Alert.alert('Error', 'Failed to update ticket.')
    }
  }

  const headerOptions = isEditMode
    ? [
        {
          label: 'Cancel',
          onPress: () => {
            setIsEditMode(false)
            setEditedTicket(ticket)
          },
        },
        { label: 'Save', onPress: handleSaveChanges },
      ]
    : [
        {
          label: 'Edit Report',
          onPress: () => {
            router.push({
              pathname: '/InspectionScreen',
              params: { ticketData: JSON.stringify(editedTicket) },
            })
          },
        },
        ...(pdfUri
          ? [
              { label: 'View PDF', onPress: handleViewReport },
              { label: 'Share PDF', onPress: handleShareReport },
            ]
          : [{ label: 'Generate PDF', onPress: handleGenerateReport }]),
      ]

  const handlePhotoPress = uri => {
    setSelectedPhoto(uri)
  }
  const closePhoto = () => setSelectedPhoto(null)

  if (error) {
    Alert.alert('Error', 'Failed to load ticket data.')
  }
  if (!ticket || !editedTicket) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DA1F2" />
        <Text style={styles.loadingText}>Loading ticket data...</Text>
      </View>
    )
  }

  const inspectionRooms = editedTicket.inspectionData?.rooms || []

  return (
    <View style={styles.fullScreenContainer}>
      <HeaderWithOptions
        title="View Report"
        onBack={() => router.back()}
        options={headerOptions}
        showHome={true}
        onHeightChange={height => setHeaderHeight(height)}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: headerHeight + marginBelowHeader },
        ]}
      >
        {isGenerating && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1DA1F2" />
          </View>
        )}
        {inspectionRooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            editable={isEditMode}
            onChangeField={handleRoomFieldChange}
            onPhotoPress={handlePhotoPress}
          />
        ))}
      </ScrollView>

      <Modal
        visible={isViewerVisible}
        animationType="slide"
        onRequestClose={() => setIsViewerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <HeaderWithOptions
            title="PDF Report"
            onBack={() => setIsViewerVisible(false)}
            options={[{ label: 'Share', onPress: handleShareReport }]}
            showHome={false}
            onHeightChange={height => setHeaderHeight(height)}
          />
          {pdfUri && (
            <Pdf
              source={{ uri: pdfUri, cache: true }}
              style={[
                styles.pdf,
                { paddingTop: headerHeight + marginBelowHeader },
              ]}
              onError={error => {
                console.log('PDF rendering error:', error)
                Alert.alert('Error', 'Failed to display PDF.')
              }}
            />
          )}
        </View>
      </Modal>

      <PhotoModal
        visible={selectedPhoto !== null}
        photo={selectedPhoto}
        onClose={closePhoto}
      />
    </View>
  )
}

export default ViewReportScreen

const styles = StyleSheet.create({
  combinedButtonContainer: {
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  halfButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 12,
  },
  halfButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  leftButton: {
    backgroundColor: '#1DA1F2',
    borderRightWidth: 1,
    borderColor: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdf: {
    flex: 1,
    width: '100%',
  },
  rightButton: {
    backgroundColor: '#1DA1F2',
  },
  addPhotoButton: {
    backgroundColor: '#0073BC',
    alignSelf: 'flex-start',
    borderRadius: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addPhotoButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#F5F8FA',
    borderColor: '#E1E8ED',
    borderRadius: 8,
    borderWidth: 1,
    margin: 16,
    padding: 12,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    justifyContent: 'center',
    zIndex: 999,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  photo: {
    borderRadius: 5,
    height: 100,
    margin: 5,
    width: 100,
  },
  shareButton: {
    backgroundColor: '#1DA1F2',
    borderRadius: 4,
    padding: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
})
