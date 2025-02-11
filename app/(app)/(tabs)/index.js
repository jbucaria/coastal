import React, { useState, useEffect, useRef } from 'react'
import {
  Animated,
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  StyleSheet,
  Modal,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { router } from 'expo-router'
import { TicketCard } from '@/components/TicketCard'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { FloatingButton } from '@/components/FloatingButton'
import useProjectStore from '@/store/useProjectStore'

const SortModal = ({ visible, onClose, sortOption, setSortOption }) => {
  // Helper to render a sort option with selection feedback
  const renderOption = (optionValue, label) => {
    const isSelected = sortOption === optionValue
    return (
      <TouchableOpacity
        style={[styles.optionButton, isSelected && styles.selectedOption]}
        onPress={() => {
          setSortOption(optionValue)
        }}
      >
        <Text
          style={[styles.optionText, isSelected && styles.selectedOptionText]}
        >
          {label}
        </Text>
        {isSelected && (
          <IconSymbol
            name="checkmark"
            size={18}
            color="green"
            style={{ marginLeft: 8 }}
          />
        )}
      </TouchableOpacity>
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Filter / Sort Criteria</Text>

          {renderOption(
            'remediationRequired',
            'Show Only Remediation Required'
          )}
          {renderOption('equipmentOnSite', 'Show Only Equipment On Site')}
          {renderOption(null, 'Show All (No Filter)')}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const TicketsScreen = () => {
  const { setProjectId } = useProjectStore()
  const [allTickets, setAllTickets] = useState([])
  const [displayedTickets, setDisplayedTickets] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date()) // default to today
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSortModalVisible, setSortModalVisible] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const scrollY = useRef(new Animated.Value(0)).current
  const floatingOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  useEffect(() => {
    const baseQuery = query(
      collection(firestore, 'tickets'),
      orderBy('startTime', 'asc')
    )

    const unsubscribe = onSnapshot(
      baseQuery,
      snapshot => {
        const tickets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        setAllTickets(tickets)
        setIsLoading(false)
      },
      error => {
        console.error('Error fetching tickets:', error)
        Alert.alert('Error', 'Could not fetch tickets. Please try again later.')
      }
    )

    return () => unsubscribe()
  }, [])

  /**
   * Client-side filtering logic
   *
   * 1) If searchQuery is non-empty, filter by address across all tickets (ignore date).
   * 2) Otherwise, filter by selected date (today by default).
   * 3) If sortOption is set, only keep tickets with that boolean field = true.
   */
  useEffect(() => {
    let filtered = [...allTickets]

    // (1) Search filter
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase()
      filtered = filtered.filter(ticket => {
        const address = ticket.address?.toLowerCase() || ''
        return address.includes(queryLower)
      })
    } else {
      // (2) Date filter if no search query
      const startOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        0,
        0,
        0
      )
      const endOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        23,
        59,
        59,
        999
      )

      filtered = filtered.filter(ticket => {
        if (!ticket.startTime) return false
        const t = ticket.startTime.toDate
          ? ticket.startTime.toDate()
          : new Date(ticket.startTime)
        return t >= startOfDay && t <= endOfDay
      })
    }

    // (3) Additional filter by boolean field
    if (sortOption === 'remediationRequired') {
      filtered = filtered.filter(t => t.remediationRequired === true)
    } else if (sortOption === 'equipmentOnSite') {
      filtered = filtered.filter(t => t.equipmentOnSite === true)
    }

    setDisplayedTickets(filtered)
  }, [allTickets, searchQuery, selectedDate, sortOption])

  // Handle date picker changes
  const onDatePickerChange = (event, date) => {
    setShowDatePicker(false)
    if (date) {
      setSelectedDate(date)
    }
  }

  // Clear the active filter
  const clearFilter = () => {
    setSortOption(null)
  }

  // Whether the clear button is disabled (no active sort)
  const isClearDisabled = !sortOption

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Search Bar */}
      <View style={{ marginHorizontal: 8 }}>
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <IconSymbol name="magnifyingglass" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search address (all tickets)"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={text => setSearchQuery(text)}
            />
          </View>
        </View>

        {/* Top row: date & filter buttons */}
        <View style={styles.topRow}>
          {/* Date Display */}
          <TouchableOpacity
            style={styles.datePicker}
            onPress={() => setShowDatePicker(true)}
          >
            <IconSymbol name="calendar" size={20} color="#999" />
            <Text style={styles.dateText}>
              {searchQuery
                ? 'Date ignored (search active)'
                : selectedDate.toDateString()}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDatePickerChange}
            />
          )}

          {/* Sort & Clear Buttons */}
          <View style={styles.sortControls}>
            {/* Open the modal */}
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setSortModalVisible(true)}
            >
              <IconSymbol name="slider.horizontal.3" size={24} color="#333" />
            </TouchableOpacity>

            {/* Show the Clear button only if we have an active sortOption */}
            {!isClearDisabled && (
              <TouchableOpacity
                style={styles.clearSortButton}
                onPress={clearFilter}
                disabled={isClearDisabled}
              >
                <IconSymbol name="xmark.circle" size={24} color="#333" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Tickets List */}
      <Animated.ScrollView
        contentContainerStyle={styles.scrollViewContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {isLoading ? (
          <Text>Loading tickets...</Text>
        ) : displayedTickets.length > 0 ? (
          displayedTickets.map((ticket, index) => {
            // We create a unique key for each ticket
            // Prefer ticket.id if it's guaranteed unique
            const ticketKey = ticket.id || `ticket-${index}`

            // Determine background/time color for each row
            const containerStyle = index % 2 === 0 ? '#F5F8FA' : '#FFFFFF'
            const timeColor = index % 2 === 0 ? '#0D47A1' : '#1976D2'

            return (
              <View key={ticketKey} style={{ marginBottom: 8 }}>
                <TicketCard
                  ticket={ticket}
                  onPress={() => {
                    setProjectId(ticket.id)
                    router.push('/TicketDetailsScreen')
                  }}
                  backgroundColor={containerStyle}
                  timeColor={timeColor}
                />
              </View>
            )
          })
        ) : (
          <Text style={styles.noTicketsText}>
            No tickets match your criteria.
          </Text>
        )}
      </Animated.ScrollView>

      {/* Floating Button */}
      <View style={{ position: 'absolute', right: 24, bottom: 110 }}>
        <FloatingButton
          onPress={() => router.push('/CreateTicketScreen')}
          title="Ticket"
          animatedOpacity={floatingOpacity}
        />
      </View>

      {/* Sort Modal */}
      <SortModal
        visible={isSortModalVisible}
        onClose={() => setSortModalVisible(false)}
        sortOption={sortOption}
        setSortOption={setSortOption}
      />
    </SafeAreaView>
  )
}

export default TicketsScreen

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBarContainer: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flex: 1,
    marginRight: 10,
  },
  dateText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  sortControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    padding: 8,
  },
  clearSortButton: {
    marginLeft: 6,
    backgroundColor: '#F2F3F5',
    borderRadius: 25,
    padding: 6,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  noTicketsText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 16,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    width: '80%',
    borderRadius: 10,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 4,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOption: {
    backgroundColor: '#E6F4EA', // Light green tint
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#2B7E2C', // A bit darker green
  },
  closeButton: {
    backgroundColor: '#F39C12',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
})
