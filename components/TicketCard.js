import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { format } from 'date-fns'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { MessageIndicator } from '@/components/MessageIndicator'
import { updateDoc, doc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import useProjectStore from '@/store/useProjectStore'

const TicketCard = ({
  ticket,
  onPress,
  openEquipmentModal,
  backgroundColor,
  timeColor,
}) => {
  // Convert Firestore Timestamps to JS Dates
  const startAt = ticket.startTime?.toDate?.()
  const endAt = ticket.endTime?.toDate?.()

  let startTime = 'N/A'
  let endTime = 'N/A'

  if (startAt) {
    startTime = format(startAt, 'h:mm a')
  }
  if (endAt) {
    endTime = format(endAt, 'h:mm a')
  }

  // Icons to display based on ticket status
  const icons = []
  const isEmpty =
    !ticket.remediationData || Object.keys(ticket.remediationData).length === 0

  if (ticket.inspectionComplete) {
    icons.push(
      <TouchableOpacity
        key="inspectionComplete"
        onPress={() =>
          router.push({
            pathname: '/ViewReport',
            params: { projectId: ticket.id },
          })
        }
      >
        <IconSymbol name="text.document" size={40} color="green" />
      </TouchableOpacity>
    )
  }
  if (ticket.remediationRequired) {
    icons.push(
      <TouchableOpacity
        key="remediationRequired"
        onPress={() => {
          useProjectStore.getState().setProjectId(ticket.id)

          router.push({
            pathname: '/RemediationScreen',
          })
        }}
      >
        <IconSymbol name="hammer.circle.fill" size={40} color="green" />
      </TouchableOpacity>
    )
  }
  if (!isEmpty) {
    icons.push(
      <TouchableOpacity
        key="remediation"
        onPress={() =>
          router.push({
            pathname: '/ViewRemediationScreen',
            params: { projectId: ticket.id },
          })
        }
      >
        <IconSymbol name="pencil.and.ruler.fill" size={40} color="green" />
      </TouchableOpacity>
    )
  }

  if (ticket.equipmentTotal > 0) {
    icons.push(
      <TouchableOpacity key="equipment" onPress={openEquipmentModal}>
        <MessageIndicator
          count={ticket.equipmentTotal}
          name="fan.fill"
          size={40}
          color="green"
        />
      </TouchableOpacity>
    )
  }

  if (ticket.messageCount > 0) {
    icons.push(
      <TouchableOpacity
        key="messages"
        onPress={() => {
          router.push({
            pathname: '/TicketNotesScreen',
            params: { projectId: ticket.id },
          })
        }}
      >
        <MessageIndicator
          count={ticket.messageCount}
          name="bubble.left.and.text.bubble.right.fill"
          size={40}
          color="green"
        />
      </TouchableOpacity>
    )
  }

  const hasIcons = icons.length > 0

  // Navigation handlers
  const handleArrivingOnSite = (projectId, currentOnSiteStatus) => {
    let alertMessage = currentOnSiteStatus
      ? 'Do you want to mark the site complete?'
      : 'Do you want to start the clock?'
    let alertAction = currentOnSiteStatus ? 'Stop' : 'Start'

    Alert.alert(`${alertAction} Work`, alertMessage, [
      {
        text: 'Cancel',
        onPress: () => console.log('User canceled'),
        style: 'cancel',
      },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const projectRef = doc(firestore, 'tickets', projectId)
            await updateDoc(projectRef, { onSite: !currentOnSiteStatus })
            if (currentOnSiteStatus) {
              router.push('/(tabs)')
            }
          } catch (error) {
            console.error('Error updating the ticket in the database:', error)
          }
        },
      },
    ])
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.cardContainer,
        { backgroundColor: backgroundColor || '#FFFFFF' }, // Default to white if no background color is provided
      ]}
    >
      {/* Header Row: Inspector + Time + Job Type */}
      <View style={styles.headerRow}>
        <View style={styles.inspectorInfo}>
          <TouchableOpacity
            onPress={() => handleArrivingOnSite(ticket.id, ticket.onSite)}
          >
            <Text style={styles.inspectorName}>
              {ticket.inspectorName || ''}
              {ticket.onSite && (
                <IconSymbol
                  style={styles.onSiteIcon}
                  name="person.crop.square"
                  size={15}
                  color="green"
                />
              )}
            </Text>
          </TouchableOpacity>
          <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
        </View>
        <View style={styles.timeInfo}>
          <View style={styles.timeRangeContainer}>
            <Text style={[styles.timeRange, { color: timeColor || 'black' }]}>
              {startTime} - {endTime}
            </Text>
          </View>
          <View style={styles.jobTypeContainer}>
            <View style={styles.occupancyContainer}>
              <Text style={styles.occupancy}>
                {ticket.occupied ? 'O' : 'U'}
              </Text>
            </View>
            <Text style={styles.jobType}>{ticket.typeOfJob || ''}</Text>
          </View>
        </View>
      </View>

      {/* Address Section */}
      <View style={styles.addressSection}>
        <Text style={styles.addressText}>{ticket.street}</Text>
        <Text style={styles.addressSubText}>
          {ticket.city}, {ticket.state} {ticket.zip}
        </Text>
      </View>

      {/* Icons Section */}
      {hasIcons && (
        <View style={styles.iconsContainer}>
          {icons.map((icon, index) => (
            <View key={index} style={styles.iconWrapper}>
              {icon}
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    height: 200,
    marginHorizontal: 0,
    // marginBottom: 10,
    padding: 5,
    borderBottomColor: '#eaeaea',
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  inspectorInfo: {
    flex: 1,
  },
  inspectorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  onSiteIcon: {
    marginLeft: 5,
    position: 'relative',
    top: -2, // Fine-tune icon positioning
  },
  ticketNumber: {
    fontSize: 14,
    color: '#757575',
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  timeRangeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timeRange: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: -0.5,
  },
  jobTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',

    alignContent: 'space-between',
    marginTop: 4,
  },
  occupancyContainer: {
    elevation: 3, // For Android shadow/elevation
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,

    paddingHorizontal: 2,
    paddingVertical: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  occupancy: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(13, 71, 161, 1)',
  },
  jobType: {
    fontSize: 14,
    color: 'rgba(13, 71, 161, 1)',
    fontWeight: 'semibold',
    marginLeft: 12,
  },
  addressSection: {
    marginBottom: 16,
  },
  addressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  addressSubText: {
    fontSize: 14,
    color: '#212121',
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  iconWrapper: {
    borderRadius: 8,
    marginLeft: 8,
  },
})

export { TicketCard }
