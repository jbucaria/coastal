import React, { useState } from 'react'
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

// Ticket Details Card
const TicketDetailsCard = ({ ticket }) => {
  let createdAtStr = ''
  if (ticket.createdAt && ticket.createdAt.seconds) {
    createdAtStr = new Date(ticket.createdAt.seconds * 1000).toLocaleString()
  }
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Ticket Details</Text>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Ticket Number: </Text>
        <Text style={styles.detailValue}>{ticket.ticketNumber}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Date: </Text>
        <Text style={styles.detailValue}>{createdAtStr}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Address: </Text>
        <Text style={styles.detailValue}>
          {ticket.street}
          {ticket.apt ? `, Apt ${ticket.apt}` : ''}, {ticket.city},{' '}
          {ticket.state} {ticket.zip}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Inspector: </Text>
        <Text style={styles.detailValue}>{ticket.inspectorName}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Reason for Visit: </Text>
        <Text style={styles.detailValue}>{ticket.reason}</Text>
      </View>
    </View>
  )
}

// Room Card – displays room info and photos. onPhotoPress is passed as a prop.
const RoomCard = ({ room, onPhotoPress = () => {} }) => {
  const { roomTitle, inspectionFindings, photos } = room
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{roomTitle}</Text>
      <Text style={styles.cardText}>Findings: {inspectionFindings}</Text>
      <View style={styles.photosContainer}>
        {photos && photos.length > 0 ? (
          photos.map((photo, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => onPhotoPress(photo.downloadURL)}
            >
              <Image source={{ uri: photo.downloadURL }} style={styles.photo} />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.cardText}>No photos available.</Text>
        )}
      </View>
    </View>
  )
}

const ViewReportScreen = () => {
  const { projectId } = useProjectStore()
  const { ticket, error } = useTicket(projectId)
  const [pdfUri, setPdfUri] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isViewerVisible, setIsViewerVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const router = useRouter()

  // Handler to generate PDF, upload it, and update the ticket record
  const handleGenerateReport = async () => {
    if (!ticket) {
      Alert.alert('Error', 'Ticket data is not available.')
      return
    }
    setIsGenerating(true)
    try {
      // Generate the PDF locally
      const localPdfUri = await generatePDF(ticket)
      // Upload the PDF to Firebase Storage using the ticket address in the filename
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

  // Header options – display "Generate PDF" if no PDF exists,
  // otherwise show options to view and share the PDF.
  const headerOptions = [
    {
      label: 'Edit Report',
      onPress: () =>
        router.push({ pathname: '/EditReportScreen', params: { projectId } }),
    },
    ...(pdfUri
      ? [
          { label: 'View PDF', onPress: handleViewReport },
          { label: 'Share PDF', onPress: handleShareReport },
        ]
      : [{ label: 'Generate PDF', onPress: handleGenerateReport }]),
  ]

  // Handler for when a photo is pressed. This sets the selected photo.
  const handlePhotoPress = uri => {
    console.log('Photo pressed:', uri)
    setSelectedPhoto(uri)
  }
  const closePhoto = () => setSelectedPhoto(null)

  if (error) {
    Alert.alert('Error', 'Failed to load ticket data.')
  }
  if (!ticket) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DA1F2" />
        <Text style={styles.loadingText}>Loading ticket data...</Text>
      </SafeAreaView>
    )
  }

  const inspectionRooms = ticket.inspectionData?.rooms || []

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
        {/* <TicketDetailsCard ticket={ticket} /> */}
        {inspectionRooms.map(room => (
          <RoomCard key={room.id} room={room} onPhotoPress={handlePhotoPress} />
        ))}
        {/* Render ticket photos if available */}
        {ticket.ticketPhotos && ticket.ticketPhotos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ticket.ticketPhotos.map((photoUri, index) => (
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
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#F5F8FA',
    borderRadius: 8,
    borderColor: '#E1E8ED',
    borderWidth: 1,
    margin: 16,
    padding: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#14171A',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14171A',
  },
  detailValue: {
    fontSize: 16,
    color: '#14171A',
    marginLeft: 4,
  },
  cardText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#14171A',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  photo: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 5,
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
})
