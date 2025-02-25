import React, { useState, useEffect } from 'react'
import { useLocalSearchParams } from 'expo-router'
import {
  SafeAreaView,
  ScrollView,
  View,
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

  const HEADER_HEIGHT = 80

  // When the ticket loads or changes, update the editedTicket state.
  useEffect(() => {
    if (ticket) {
      setEditedTicket(ticket)
    }
  }, [ticket])

  // Handler for field changes in TicketDetailsCard.
  const handleTicketFieldChange = (field, value) => {
    setEditedTicket({ ...editedTicket, [field]: value })
  }

  // For room changes, implement a similar handler if needed.
  const handleRoomFieldChange = (roomId, newFindings) => {
    // Update the findings for the room with the given id.
    const updatedRooms = editedTicket.inspectionData.rooms.map(room =>
      room.id === roomId ? { ...room, inspectionFindings: newFindings } : room
    )
    setEditedTicket({
      ...editedTicket,
      inspectionData: { ...editedTicket.inspectionData, rooms: updatedRooms },
    })
  }

  // Handler to generate PDF, upload it, and update the ticket record
  // 1. Update local state in handleGenerateReport
  const handleGenerateReport = async () => {
    if (!ticket) {
      Alert.alert('Error', 'Ticket data is not available.')
      return
    }
    setIsGenerating(true)
    try {
      const localPdfUri = await generatePDF(ticket)
      const uploadedPdfUrl = await uploadPDFToFirestore(ticket, localPdfUri)
      // Update Firestore field
      await updateTicketPdfUrl(ticket.id, uploadedPdfUrl)
      // Update local state immediately
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

  // 2. Sync local state when ticket changes:
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

  // Save updated ticket data to the database.
  const handleSaveChanges = async () => {
    try {
      // Assume updateTicketData is a function that updates ticket details in your database.
      await updateTicketData(editedTicket.id, editedTicket)
      Alert.alert('Success', 'Ticket updated successfully.')
      setIsEditMode(false)
    } catch (error) {
      Alert.alert('Error', 'Failed to update ticket.')
    }
  }

  // Header options: if editing, show Cancel/Save; otherwise show Edit Report and PDF options.
  const headerOptions = isEditMode
    ? [
        {
          label: 'Cancel',
          onPress: () => {
            setIsEditMode(false)
            setEditedTicket(ticket) // discard changes
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

  // Handler for when a photo is pressed.
  const handlePhotoPress = uri => {
    setSelectedPhoto(uri)
  }
  const closePhoto = () => setSelectedPhoto(null)

  if (error) {
    Alert.alert('Error', 'Failed to load ticket data.')
  }
  if (!ticket || !editedTicket) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DA1F2" />
        <Text style={styles.loadingText}>Loading ticket data...</Text>
      </SafeAreaView>
    )
  }

  const inspectionRooms = editedTicket.inspectionData?.rooms || []

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithOptions
        title="View Report"
        onBack={() => router.back()}
        options={headerOptions}
        showHome={true}
      />
      <ScrollView
        style={{ paddingTop: HEADER_HEIGHT }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {isGenerating && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1DA1F2" />
          </View>
        )}
        {/* Render TicketDetailsCard in either view or edit mode */}
        {/* <TicketDetailsCard
          ticket={editedTicket}
          editable={isEditMode}
          onChangeField={handleTicketFieldChange}
        /> */}
        {inspectionRooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            editable={isEditMode}
            onChangeField={handleRoomFieldChange}
            onPhotoPress={handlePhotoPress}
          />
        ))}
        {editedTicket.ticketPhotos && editedTicket.ticketPhotos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {editedTicket.ticketPhotos.map((photoUri, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handlePhotoPress(photoUri)}
                >
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* PDF Modal */}
      <Modal
        visible={isViewerVisible}
        animationType="slide"
        onRequestClose={() => setIsViewerVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <HeaderWithOptions
            title="PDF Report"
            onBack={() => setIsViewerVisible(false)}
            options={[
              { label: 'Share', onPress: handleShareReport },
              // you can add other options if needed
            ]}
            showHome={false}
          />
          {pdfUri && (
            <Pdf
              source={{ uri: pdfUri, cache: true }}
              style={[styles.pdf, { paddingTop: HEADER_HEIGHT }]}
              onError={error => {
                console.log('PDF rendering error:', error)
                Alert.alert('Error', 'Failed to display PDF.')
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Photo Modal */}
      <PhotoModal
        visible={selectedPhoto !== null}
        photo={selectedPhoto}
        onClose={closePhoto}
      />
    </SafeAreaView>
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  deleteRoomText: {
    color: '#E0245E',
    fontWeight: '600',
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

  modalContainer: {
    backgroundColor: '#fff',
    flex: 1,
  },
  pdf: {
    flex: 1,
    width: '100%',
  },
  photo: {
    borderRadius: 5,
    height: 100,
    margin: 5,
    width: 100,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
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
