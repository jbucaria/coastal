import React, { useState, useEffect, useRef } from 'react'
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

const TicketDetailsScreen = () => {
  const router = useRouter()
  const { projectId } = useProjectStore()
  const [ticket, setTicket] = useState(null)
  const [eta, setEta] = useState(null)
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const scrollY = useRef(new Animated.Value(0)).current

  // const scrollY = useRef(new Animated.Value(0)).current
  // const headerTranslateY = scrollY.interpolate({
  //   inputRange: [0, 100],
  //   outputRange: [0, -100],
  //   extrapolate: 'clamp',
  // })

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

  const handleSiteComplete = async () => {
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
              Alert.alert('Error', `Failed to mark the site as ${actionText}.`)
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
  }

  // Define options for the header modal – note the delete option is now included.
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
        // translateY={headerTranslateY}
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Info</Text>
          <View style={styles.contactSection}>
            <Text style={styles.contactLabel}>Builder</Text>
            <Text style={[styles.contactValue, styles.infoLine]}>
              {ticket.customer || 'N/A'}
            </Text>
            <Text style={[styles.contactValue, styles.infoLine]}>
              {ticket.customerName || 'N/A'}
            </Text>
            <Text style={[styles.contactValue, styles.infoLine]}>
              {ticket.customerEmail || 'N/A'}
            </Text>
            <Text
              style={[styles.contactValue, styles.link, styles.infoLine]}
              onPress={() => handleCall(ticket.customerNumber)}
            >
              {ticket.customerNumber || 'N/A'}
            </Text>
          </View>
          <View style={styles.contactSection}>
            <Text style={styles.contactLabel}>Homeowner</Text>
            <Text style={[styles.contactValue, styles.infoLine]}>
              {ticket.homeOwnerName || 'N/A'}
            </Text>
            <Text
              style={[styles.contactValue, styles.link, styles.infoLine]}
              onPress={() => handleCall(ticket.homeOwnerNumber)}
            >
              {ticket.homeOwnerNumber || 'N/A'}
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inspector & Reason</Text>
          <View style={styles.inspectorSection}>
            <Text style={styles.inspectorLabel}>Inspector:</Text>
            <Text style={[styles.inspectorValue, styles.infoLine]}>
              {ticket.inspectorName || 'N/A'}
            </Text>
          </View>
          <View style={styles.inspectorSection}>
            <Text style={styles.inspectorLabel}>Reason for Visit:</Text>
            <Text style={[styles.inspectorValue, styles.infoLine]}>
              {ticket.reason || 'N/A'}
            </Text>
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
            <Text style={styles.label}>Equipment Total:</Text>
            <Text style={styles.infoValue}>{ticket.equipmentTotal || 0}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Measurements Required:</Text>
            <Text style={styles.infoValue}>
              {ticket.remediationRequired ? 'True' : 'False'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Inspection Needed:</Text>
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
    fontSize: 16,
    fontWeight: '700',
    color: '#14171A',
    marginBottom: 8,
    textAlign: 'center',
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#14171A',
  },
  clearSortButton: {
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    marginLeft: 6,
    padding: 6,
  },
  container: {
    backgroundColor: 'white',
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  datePicker: {
    alignItems: 'center',
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    flex: 1,
    flexDirection: 'row',
    marginRight: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  dateText: {
    color: '#333',
    fontSize: 14,
    marginLeft: 10,
  },
  floatingButton: {
    backgroundColor: '#1DA1F2',
    borderRadius: 24,
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  floatingButtonContainer: {
    bottom: 110,
    position: 'absolute',
    right: 24,
  },
  infoLine: {
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14171A',
  },
  link: {
    color: '#1DA1F2',
    textDecorationLine: 'underline',
  },
  noTicketsText: {
    color: '#666',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  safeArea: {
    backgroundColor: 'white',
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 8,
    width: '100%',
  },
  searchBarContainer: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  searchInput: {
    color: '#333',
    fontSize: 16,
    flex: 1,
    marginLeft: 10,
  },
  sortButton: {
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    padding: 8,
  },
  sortControls: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
})
