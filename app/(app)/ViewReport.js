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
import { TicketDetailsCard, RoomCard } from '@/components/Cards' // adjust the path as needed

const ViewReportScreen = () => {
  const params = useLocalSearchParams()
  const projectIdFromParams = params.projectId
  const { projectId: storeProjectId } = useProjectStore()

  const { ticket, error } = useTicket(projectId)
  const [pdfUri, setPdfUri] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isViewerVisible, setIsViewerVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedTicket, setEditedTicket] = useState(null)
  const router = useRouter()

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
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Report', onPress: () => setIsViewerVisible(true) },
        ]
      )
    } catch (error) {
      console.error('Error generating and uploading PDF:', error)
      Alert.alert('Error', 'Failed to generate and upload PDF report.')
    }
    setIsGenerating(false)
  }

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
          onPress: () => setIsEditMode(true),
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
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {isGenerating && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1DA1F2" />
          </View>
        )}
        {/* Render TicketDetailsCard in either view or edit mode */}
        <TicketDetailsCard
          ticket={editedTicket}
          editable={isEditMode}
          onChangeField={handleTicketFieldChange}
        />
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
          <View style={styles.floatingCloseButtonContainer}>
            <FloatingButton
              onPress={() => setIsViewerVisible(false)}
              title="Close"
              iconName="x.circle"
            />
          </View>
          {pdfUri && (
            <Pdf
              source={{ uri: pdfUri, cache: true }}
              style={styles.pdf}
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#F5F8FA',
    borderRadius: 8,
    borderColor: '#E1E8ED',
    borderWidth: 1,
    margin: 16,
    padding: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdf: {
    flex: 1,
    width: '100%',
  },
  floatingCloseButtonContainer: {
    position: 'absolute',
    bottom: 30,
    right: 10,
    zIndex: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  photo: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 5,
  },
})
