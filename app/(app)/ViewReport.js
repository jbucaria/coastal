// ViewReportScreen.js
import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
  SafeAreaView,
  Image,
  ScrollView,
} from 'react-native'
import Pdf from 'react-native-pdf'
import * as Sharing from 'expo-sharing'
import useTicket from '@/hooks/useTicket'
import useProjectStore from '@/store/useProjectStore'
import { useRouter } from 'expo-router'
import { generatePDF } from '@/utils/pdfGenerator' // Import the PDF logic

// Card displaying ticket details at the top
const TicketDetailsCard = ({ ticket }) => {
  let createdAtStr = ''
  if (ticket.createdAt && ticket.createdAt.seconds) {
    createdAtStr = new Date(ticket.createdAt.seconds * 1000).toLocaleString()
  }
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Ticket Details</Text>
      <Text style={styles.cardText}>Ticket Number: {ticket.ticketNumber}</Text>
      <Text style={styles.cardText}>Date: {createdAtStr}</Text>
      <Text style={styles.cardText}>
        Address: {ticket.street}
        {ticket.apt ? `, Apt ${ticket.apt}` : ''}, {ticket.city}, {ticket.state}{' '}
        {ticket.zip}
      </Text>
      <Text style={styles.cardText}>Inspector: {ticket.inspectorName}</Text>
      <Text style={styles.cardText}>Reason for Visit: {ticket.reason}</Text>
    </View>
  )
}

// Card for each room in the inspection
const RoomCard = ({ room }) => {
  const { roomTitle, inspectionFindings, photos } = room
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{roomTitle}</Text>
      <Text style={styles.cardText}>Findings: {inspectionFindings}</Text>
      <View style={styles.photosContainer}>
        {photos && photos.length > 0 ? (
          photos.map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo.downloadURL }}
              style={styles.photo}
            />
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
  const router = useRouter()

  const handleGenerateReport = async () => {
    if (!ticket) {
      Alert.alert('Error', 'Ticket data is not available.')
      return
    }
    setIsGenerating(true)
    try {
      const uri = await generatePDF(ticket)
      setPdfUri(uri)
      Alert.alert('Success', 'PDF report generated.')
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF report.')
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

  const handleBack = () => {
    router.back()
  }

  const handleEditReport = () => {
    router.push({ pathname: '/EditReportScreen', params: { projectId } })
  }

  if (error) {
    Alert.alert('Error', 'Failed to load ticket data.')
  }

  if (!ticket) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DA1F2" />
        <Text style={styles.loadingText}>Loading ticket data...</Text>
      </View>
    )
  }

  const inspectionRooms = ticket.inspectionData?.rooms || []

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Navigation Buttons */}
        <View style={styles.navButtons}>
          <TouchableOpacity onPress={handleBack} style={styles.navButton}>
            <Text style={styles.navButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEditReport} style={styles.navButton}>
            <Text style={styles.navButtonText}>Edit Report</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerText}>View Report</Text>

        {/* Ticket Details Card */}
        <TicketDetailsCard ticket={ticket} />

        {/* Render a Room Card for each room */}
        {inspectionRooms.map(room => (
          <RoomCard key={room.id} room={room} />
        ))}

        {/* PDF Actions */}
        <TouchableOpacity onPress={handleGenerateReport} style={styles.button}>
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate PDF Report</Text>
          )}
        </TouchableOpacity>
        {pdfUri && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleViewReport}
              style={styles.buttonSecondary}
            >
              <Text style={styles.buttonText}>View Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShareReport}
              style={styles.buttonSecondary}
            >
              <Text style={styles.buttonText}>Share Report</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <Modal visible={isViewerVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsViewerVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
          {pdfUri ? (
            <Pdf
              source={{ uri: pdfUri, cache: true }}
              style={styles.pdf}
              onError={error => {
                console.log('PDF rendering error:', error)
                Alert.alert('Error', 'Failed to display PDF.')
              }}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

export default ViewReportScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navButton: {
    backgroundColor: '#0073BC',
    padding: 10,
    borderRadius: 5,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerText: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    color: '#0073BC',
  },
  card: {
    backgroundColor: '#F5F8FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    padding: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#14171A',
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
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#0073BC',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonSecondary: {
    backgroundColor: '#F36C21',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    width: '48%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#0073BC',
    padding: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  pdf: {
    flex: 1,
    width: '100%',
    marginTop: 60,
  },
})
