import React, { useState, useRef, useEffect } from 'react'
import {
  SafeAreaView,
  Animated,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native'
import { useRouter } from 'expo-router'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { getTravelTime } from '@/utils/getTravelTime'
import { EquipmentModal } from '@/components/EquipmentModal'
import { PhotoModal } from '@/components/PhotoModal'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { deleteTicket } from '@/utils/deleteTicket'
import useProjectStore from '@/store/useProjectStore'
import { ETAButton } from '@/components/EtaButton'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { formatPhoneNumber } from '@/utils/helpers'

// A helper to open Google Maps (if needed)
const openGoogleMapsWithETA = address => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    address
  )}`
  Linking.openURL(url).catch(err => console.error('Error opening maps:', err))
}

const TicketDetailsScreen = () => {
  const router = useRouter()
  const { projectId } = useProjectStore()
  const [ticket, setTicket] = useState(null)
  const [eta, setEta] = useState(null)
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const scrollY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!projectId) return

    const ticketRef = doc(firestore, 'tickets', projectId)
    const unsubscribe = onSnapshot(
      ticketRef,
      docSnap => {
        if (docSnap.exists()) {
          setTicket({ id: docSnap.id, ...docSnap.data() })
        } else {
          router.back()
        }
      },
      error => {
        console.error('Error fetching ticket data:', error)
        Alert.alert('Error', 'Unable to fetch ticket data.')
      }
    )
    return () => unsubscribe()
  }, [projectId])

  useEffect(() => {
    if (ticket?.address) {
      getTravelTime(ticket.address)
        .then(info => setEta(info.durationText))
        .catch(error => {
          console.error('Error fetching travel time:', error)
          setEta('N/A')
        })
    } else {
      setEta(null)
    }
  }, [ticket])

  if (!ticket) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DA1F2" />
        <Text style={styles.loadingText}>Loading ticket details...</Text>
      </SafeAreaView>
    )
  }

  const handleInspection = () => {
    if (!ticket) {
      Alert.alert('Error', 'No ticket selected for inspection.')
      return
    }
    const route = ticket.inspectionComplete
      ? '/ViewReport'
      : '/InspectionScreen'
    router.push({ pathname: route, params: { projectId: ticket.projectId } })
  }

  const handleRemediation = () => {
    if (!ticket) {
      Alert.alert('Error', 'No ticket selected for remediation.')
      return
    }
    const route = ticket.remediationComplete
      ? '/ViewRemediationScreen'
      : '/RemediationScreen'
    router.push({ pathname: route, params: { projectId: ticket.projectId } })
  }

  const openNotes = () => {
    router.push({
      pathname: '/TicketNotesScreen',
      params: { projectId: ticket.id },
    })
  }

  const handleCall = phoneNumber => {
    Alert.alert('Contact Options', 'Would you like to call or text?', [
      {
        text: 'Call',
        onPress: () => {
          const phoneUrl =
            Platform.OS === 'android'
              ? `tel:${phoneNumber}`
              : `telprompt:${phoneNumber}`
          Linking.canOpenURL(phoneUrl)
            .then(supported => {
              if (!supported) {
                Alert.alert('Phone number is not available')
              } else {
                return Linking.openURL(phoneUrl)
              }
            })
            .catch(err => console.error('An error occurred', err))
        },
      },
      {
        text: 'Text',
        onPress: () => {
          const smsUrl = `sms:${phoneNumber}`
          Linking.canOpenURL(smsUrl)
            .then(supported => {
              if (!supported) {
                Alert.alert('SMS is not available')
              } else {
                return Linking.openURL(smsUrl)
              }
            })
            .catch(err => console.error('An error occurred', err))
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const handlePhotoPress = uri => setSelectedPhoto(uri)
  const closePhoto = () => setSelectedPhoto(null)

  const handleDeleteTicket = () => {
    deleteTicket(projectId, () => {
      router.push('/(tabs)')
    })
  }

  const options = [
    {
      label: 'Delete Ticket',
      onPress: () => {
        handleDeleteTicket()
      },
    },
    {
      label: ticket.siteComplete ? 'Mark Incomplete' : 'Mark Complete',
      onPress: async () => {
        const newStatus = !ticket.siteComplete
        const actionText = newStatus ? 'complete' : 'incomplete'
        Alert.alert(
          'Confirm',
          `Are you sure you want to mark this site as ${actionText}?`,
          [
            {
              text: 'Yes',
              onPress: async () => {
                try {
                  const projectRef = doc(firestore, 'tickets', ticket.id)
                  await updateDoc(projectRef, { siteComplete: newStatus })
                  Alert.alert('Success', `Site marked as ${actionText}.`)
                  router.push('/(tabs)')
                } catch (error) {
                  console.error(`Error marking site as ${actionText}:`, error)
                  Alert.alert(
                    'Error',
                    `Failed to mark the site as ${actionText}.`
                  )
                }
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => router.push('/(tabs)'),
            },
          ]
        )
      },
    },
    {
      label: ticket.inspectionComplete ? 'View Inspection' : 'Inspection',
      onPress: () => handleInspection(),
    },
    {
      label: ticket.remediationComplete ? 'View Remediation' : 'Remediation',
      onPress: () => handleRemediation(),
    },
    {
      label: ticket.messageCount ? 'View Notes' : 'Add Note',
      onPress: () => openNotes(),
    },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithOptions
        title="Ticket Details"
        onBack={() => router.back()}
        onOptions={() => {}}
        options={options}
      />
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.card}>
          <Text style={styles.addressText}>
            {ticket.street}, {ticket.city}, {ticket.state} {ticket.zip}
          </Text>
          <ETAButton
            eta={eta}
            onPress={() => openGoogleMapsWithETA(ticket.address)}
            status={eta === 'N/A' ? 'delayed' : 'normal'}
          />
        </View>
        {/* Contact Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Info</Text>
          <View style={styles.contactSection}>
            <Text style={styles.cardTitle}>Builder:</Text>

            <Text style={styles.contactValue}>
              <Text style={styles.contactLabel}>Name: </Text>
              {ticket.customerName || 'N/A'}
            </Text>
            <Text style={styles.contactValue}>
              <Text style={styles.contactLabel}>Email: </Text>
              {ticket.customerEmail || 'N/A'}
            </Text>
            <Text
              style={[styles.contactValue, styles.link]}
              onPress={() => handleCall(ticket.customerNumber)}
            >
              <Text style={styles.contactLabel}>Phone: </Text>
              {ticket.customerNumber
                ? formatPhoneNumber(ticket.customerNumber)
                : 'N/A'}
            </Text>
          </View>
          {ticket.homeOwnerName && (
            <View style={styles.contactSection}>
              <Text style={styles.cardTitle}>Homeowner</Text>
              <Text style={styles.contactValue}>
                <Text style={styles.contactLabel}>Name: </Text>
                {ticket.homeOwnerName || 'N/A'}
              </Text>
              <Text
                style={[styles.contactValue, styles.link]}
                onPress={() => handleCall(ticket.homeOwnerNumber)}
              >
                <Text style={styles.contactLabel}>Phone: </Text>
                {ticket.homeOwnerNumber
                  ? formatPhoneNumber(ticket.homeOwnerNumber)
                  : 'N/A'}
              </Text>
            </View>
          )}
        </View>
        {/* Inspector & Reason Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inspector & Reason</Text>
          <View style={styles.inspectorSection}>
            <Text style={styles.inspectorLabel}>Inspector:</Text>
            <Text style={styles.inspectorValue}>
              {ticket.inspectorName || 'N/A'}
            </Text>
          </View>
          <View style={styles.inspectorSection}>
            <Text style={styles.inspectorLabel}>Reason for Visit:</Text>
            <Text style={styles.inspectorValue}>{ticket.reason || 'N/A'}</Text>
          </View>
        </View>
        <EquipmentModal
          visible={isEquipmentModalVisible}
          onClose={() => setIsEquipmentModalVisible(false)}
          projectId={ticket.id}
        />
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Equipment Total:</Text>
            <Text style={styles.infoValue}>{ticket.equipmentTotal || 0}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Measurements Required:</Text>
            <Text style={styles.infoValue}>
              {ticket.remediationRequired ? 'True' : 'False'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Inspection Needed:</Text>
            <Text style={styles.infoValue}>
              {ticket.inspectionComplete ? 'Complete' : 'Required'}
            </Text>
          </View>
        </View>
      </Animated.ScrollView>
      <PhotoModal
        visible={selectedPhoto !== null}
        photo={selectedPhoto}
        onClose={closePhoto}
      />
    </SafeAreaView>
  )
}

export default TicketDetailsScreen

const styles = StyleSheet.create({
  addressText: {
    color: '#14171A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
  },
  card: {
    backgroundColor: '#F5F8FA',
    borderColor: '#E1E8ED',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  cardTitle: {
    color: '#14171A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  contactLabel: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactSection: {
    borderTopWidth: 1,
    borderColor: '#ddd',
    marginVertical: 5,
    paddingVertical: 5,
  },
  contactValue: {
    color: '#555555',
    fontSize: 16,
    marginBottom: 4,
  },
  container: {
    // flex: 1,
    // padding: 5,
    backgroundColor: '#ffffff',
  },
  infoLabel: {
    color: '#14171A',
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoValue: {
    color: '#14171A',
    fontSize: 14,
  },
  inspectorLabel: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  inspectorSection: {
    borderTopWidth: 1,
    borderColor: '#ddd',
    marginVertical: 5,
    paddingVertical: 5,
  },
  inspectorValue: {
    color: '#555555',
    fontSize: 16,
    marginBottom: 4,
  },
  flex1: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  modalCloseContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 5,
  },
  modalCloseText: {
    color: '#2980b9',
    fontSize: 16,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  navButton: {
    backgroundColor: '#2980b9',
    borderRadius: 5,
    elevation: 3,
    marginHorizontal: 5,
    padding: 12,
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    margin: 5,
    padding: 5,
    width: '80%',
  },
  photo: {
    borderRadius: 5,
    height: 100,
    margin: 5,
    width: 100,
  },
  photoWrapper: {
    marginRight: 5,
    position: 'relative',
  },
  photosContainer: {
    marginVertical: 5,
  },
  removePhotoButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 5,
    top: 5,
    width: 24,
  },
  removePhotoText: {
    color: 'red',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  scrollView: {
    paddingHorizontal: 5,
  },
  searchSection: {
    marginBottom: 5,
    position: 'relative',
    width: '100%',
  },
  sectionTitle: {
    color: '#14171A',
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 5,
  },
  suggestionItem: {
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    padding: 10,
  },
  suggestionText: {
    color: '#14171A',
    fontSize: 16,
  },
  suggestionsContainer: {
    maxHeight: 150,
  },
  suggestionsWrapper: {
    backgroundColor: '#ffffff',
    borderColor: '#ccc',
    borderRadius: 5,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 55,
    zIndex: 999,
  },
  timePicker: {
    flex: 1,
  },
  timePickerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 5,
  },
  toggleButton: {
    alignItems: 'center',
    backgroundColor: '#2980b9',
    borderRadius: 5,
    marginBottom: 5,
    padding: 12,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  stepContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 5,
    marginBottom: 5,
    padding: 5,
  },
  stepTitle: {
    color: '#14171A',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
})
