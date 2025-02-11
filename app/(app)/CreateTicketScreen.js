import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'expo-router'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
  ScrollView,
  Platform,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import 'react-native-get-random-values'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import { firestore } from '@/firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'
import { handleCreateTicket } from '@/utils/generateTicket'
import { useUserStore } from '@/store/useUserStore'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'

const initialTicketStatus = {
  street: '123 Main St',
  apt: '',
  city: 'Tampa',
  state: 'FL',
  zip: '33602',
  date: '',
  // Builder fields
  customer: '', // might be an internal id
  customerName: '', // builder's display name
  customerNumber: '', // builder's phone number
  customerEmail: '', // builder's email
  homeOwnerName: 'Terry Cruze',
  homeOwnerNumber: '727-555-1234',
  inspectorName: 'John Bucaria',
  reason:
    'Homeowner found wet carpet in the living room. Need to inspect for leaks and water damage.',
  jobType: 'inspection',
  hours: '2',
  typeOfJob: 'inspection',
  recommendedActions: '',
  messageCount: 0,
  reportPhotos: [],
  ticketPhotos: [],
  onSite: false,
  inspectionComplete: false,
  remediationRequired: false,
  remediationComplete: false,
  equipmentOnSite: false,
  siteComplete: false,
  measurementsRequired: false,
}

const CreateTicketScreen = () => {
  const router = useRouter()
  const { user } = useUserStore()

  // Ticket state
  const [newTicket, setNewTicket] = useState(initialTicketStatus)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startTime, setStartTime] = useState(new Date())
  const [endTime, setEndTime] = useState(new Date())
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [jobType, setJobType] = useState('')
  const [jobTypeModalVisible, setJobTypeModalVisible] = useState(false)
  const [vacancyModalVisible, setVacancyModalVisible] = useState(false)
  const [vacancy, setVacancy] = useState('')
  const [newNote, setNewNote] = useState('')
  const [inputHeight, setInputHeight] = useState(40)
  const [manualAddress, setManualAddress] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState('')

  // --- Customer (Builder) Search State ---
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [allCustomers, setAllCustomers] = useState([])

  // Load all customers from Firestore on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const querySnapshot = await getDocs(collection(firestore, 'customers'))
        const customersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        setAllCustomers(customersData)
      } catch (error) {
        console.error('Error fetching customers:', error)
      }
    }
    fetchCustomers()
  }, [])

  // Update suggestions whenever the search query changes
  useEffect(() => {
    if (customerSearchQuery.trim() === '') {
      setCustomerSuggestions([])
      return
    }
    const query = customerSearchQuery.toLowerCase()
    const filtered = allCustomers.filter(c =>
      c.displayName?.toLowerCase().includes(query)
    )
    setCustomerSuggestions(filtered)
  }, [customerSearchQuery, allCustomers])

  const parseAddressComponents = addressComponents => {
    const components = {
      street: '',
      city: '',
      state: '',
      zip: '',
    }

    addressComponents.forEach(component => {
      if (component.types.includes('street_number')) {
        components.street = component.long_name + ' '
      }
      if (component.types.includes('route')) {
        components.street += component.long_name
      }
      if (component.types.includes('locality')) {
        components.city = component.long_name
      }
      if (component.types.includes('administrative_area_level_1')) {
        components.state = component.short_name
      }
      if (component.types.includes('postal_code')) {
        components.zip = component.long_name
      }
    })

    return components
  }

  const handleAutocompletePress = (data, details = null) => {
    if (details && details.address_components) {
      const parsed = parseAddressComponents(details.address_components)
      setNewTicket(prev => ({
        ...prev,
        street: parsed.street,
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip,
      }))
      setSelectedAddress(data.description)
    } else {
      console.log('No details returned:', data)
      setNewTicket(prev => ({
        ...prev,
        street: data.description,
      }))
    }
  }

  // When a customer is selected from the suggestions, update the builder fields
  const handleSelectCustomer = selectedCustomer => {
    setNewTicket(prev => ({
      ...prev,
      customer: selectedCustomer.id,
      customerName: selectedCustomer.displayName || '',
      customerEmail: selectedCustomer.email || '',
      customerNumber: selectedCustomer.phone || '', // Adjust field name if needed
    }))
    setCustomerSearchQuery(selectedCustomer.displayName)
    setCustomerSuggestions([])
  }

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (date) {
      setSelectedDate(date)
      setStartTime(setTimeToDate(date, startTime))
      setEndTime(setTimeToDate(date, endTime))
    }
  }

  const handleStartTimeChange = (event, time) => {
    setShowStartTimePicker(Platform.OS === 'ios')
    if (time) {
      setStartTime(setTimeToDate(selectedDate, time))
    }
  }

  const handleEndTimeChange = (event, time) => {
    setShowEndTimePicker(Platform.OS === 'ios')
    if (time) {
      setEndTime(setTimeToDate(selectedDate, time))
    }
  }

  const handleBack = () => {
    router.back()
  }

  const resetForm = () => {
    setNewTicket(initialTicketStatus)
    setCustomerSearchQuery('')
    setCustomerSuggestions([])
  }

  const handleTogglePicker = () => {
    setJobTypeModalVisible(!jobTypeModalVisible)
  }
  const handleToggleVacancyPicker = () => {
    setVacancyModalVisible(!vacancyModalVisible)
  }

  const handleRemovePhoto = index => {
    setNewTicket(prev => ({
      ...prev,
      ticketPhotos: prev.ticketPhotos.filter((_, i) => i !== index),
    }))
  }

  const handleJobTypeChange = itemValue => {
    setJobType(itemValue)
    setNewTicket(prevTicket => ({
      ...prevTicket,
      typeOfJob: itemValue,
    }))
  }
  const handleVacancyChange = itemValue => {
    setVacancy(itemValue)
    setNewTicket(prevTicket => ({
      ...prevTicket,
      occupied: itemValue === 'occupied',
    }))
  }

  const handleCreate = () => {
    handleCreateTicket(
      newTicket,
      selectedDate,
      startTime,
      endTime,
      resetForm,
      setIsSubmitting,
      isSubmitting,
      newNote,
      user
    )
  }

  const setTimeToDate = (baseDate, timeDate) => {
    const newDate = new Date(baseDate)
    newDate.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0)
    return newDate
  }

  const handleAddPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera roll permissions are needed to add photos.'
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    })

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedPhotos = result.assets.map(asset => asset.uri)
      setNewTicket(prev => ({
        ...prev,
        ticketPhotos: [...prev.ticketPhotos, ...selectedPhotos],
      }))
      Alert.alert('Success', 'Photos added successfully.')
    } else {
      Alert.alert('No Selection', 'You did not select any image.')
    }
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithOptions
        title="Create Ticket"
        onBack={() => router.back()}
        onOptions={() => setOptionsModalVisible(true)}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={40}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Date and Time Section */}
            <View style={styles.dateTimeSection}>
              <View style={styles.datePickerContainer}>
                <Text style={styles.label}>Date:</Text>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  style={styles.datePicker}
                />
              </View>
              <View style={styles.timePickerContainer}>
                <Text style={styles.label}>Start Time:</Text>
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={handleStartTimeChange}
                  minuteInterval={15}
                  style={styles.timePicker}
                />
              </View>
              <View style={styles.timePickerContainer}>
                <Text style={styles.label}>End Time:</Text>
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={handleEndTimeChange}
                  minuteInterval={15}
                  style={styles.timePicker}
                />
              </View>
            </View>

            {/* Address Section */}
            <Text style={styles.sectionTitle}>Address</Text>
            {/* Google Places Autocomplete */}
            {!manualAddress && (
              <GooglePlacesAutocomplete
                filterReverseGeocodingByTypes={['locality']}
                debounce={500}
                disableScroll={true}
                placeholder="Search address..."
                onPress={handleAutocompletePress}
                query={{
                  key: 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs', // Replace with your API key
                  language: 'en',
                  components: 'country:us',
                }}
                fetchDetails={true}
                styles={{
                  textInputContainer: styles.autocompleteContainer,
                  textInput: styles.inputFieldGoogle,
                  listView: {
                    backgroundColor: 'white',
                    maxHeight: 200,
                    elevation: 5,
                    zIndex: 5,
                  },
                }}
              />
            )}

            {/* Selected Address Display */}
            {selectedAddress !== '' && (
              <View style={styles.addressDisplay}>
                <Text style={styles.addressText}>{selectedAddress}</Text>
              </View>
            )}

            {/* Builder / Customer Search Section */}
            <Text style={styles.sectionTitle}>Builder Information</Text>
            <View style={styles.searchSection}>
              <TextInput
                style={styles.inputField}
                placeholder="Search builder by name..."
                value={customerSearchQuery}
                onChangeText={setCustomerSearchQuery}
              />
              {/* Suggestions Container */}
              {customerSuggestions.length > 0 && (
                <View style={styles.suggestionsWrapper}>
                  <ScrollView style={styles.suggestionsContainer}>
                    {customerSuggestions.map(cust => (
                      <TouchableOpacity
                        key={cust.id}
                        onPress={() => handleSelectCustomer(cust)}
                        style={styles.suggestionItem}
                      >
                        <Text style={styles.suggestionText}>
                          {cust.displayName} ({cust.email})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            {/* Display Selected Customer Info */}
            {newTicket.customerName !== '' && (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>Selected Builder</Text>
                <Text style={styles.detailText}>
                  Name: {newTicket.customerName}
                </Text>
                <Text style={styles.detailText}>
                  Email: {newTicket.customerEmail}
                </Text>
                <Text style={styles.detailText}>
                  Phone: {newTicket.customerNumber}
                </Text>
              </View>
            )}

            {/* Homeowner Info */}
            <Text style={styles.sectionTitle}>Homeowner</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Homeowner Name"
              value={newTicket.homeOwnerName}
              onChangeText={text =>
                setNewTicket({ ...newTicket, homeOwnerName: text })
              }
            />
            <TextInput
              style={styles.inputField}
              placeholder="Homeowner Number"
              value={newTicket.homeOwnerNumber}
              onChangeText={text =>
                setNewTicket({ ...newTicket, homeOwnerNumber: text })
              }
              keyboardType="phone-pad"
            />

            {/* Ticket Details */}
            <Text style={styles.sectionTitle}>Ticket Details</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Inspector Name"
              value={newTicket.inspectorName}
              onChangeText={text =>
                setNewTicket({ ...newTicket, inspectorName: text })
              }
            />
            <TextInput
              style={[styles.inputField, { height: 100 }]}
              placeholder="Reason for visit"
              value={newTicket.reason}
              onChangeText={text =>
                setNewTicket({ ...newTicket, reason: text })
              }
              multiline
            />
            <TextInput
              style={[styles.inputField, { height: 80 }]}
              placeholder="Add a note for this ticket..."
              value={newNote}
              onChangeText={setNewNote}
              multiline
              numberOfLines={4}
            />

            {/* Job Type and Vacancy Pickers (modals) */}
            <TouchableOpacity
              onPress={handleTogglePicker}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {jobType ? jobType : 'Select Job Type'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleToggleVacancyPicker}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {vacancy === 'occupied'
                  ? 'Occupied'
                  : vacancy === 'unoccupied'
                  ? 'Unoccupied'
                  : 'Select Occupancy'}
              </Text>
            </TouchableOpacity>

            {/* Picker Modal for Job Type */}
            <Modal
              visible={jobTypeModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={handleTogglePicker}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={jobType}
                    onValueChange={handleJobTypeChange}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select job type" value="" />
                    <Picker.Item
                      label="Leak Detection"
                      value="leak detection"
                    />
                    <Picker.Item label="Inspection" value="inspection" />
                    <Picker.Item label="Containment" value="containment" />
                    <Picker.Item label="Flood" value="flood" />
                    <Picker.Item label="Mold Job" value="mold job" />
                    <Picker.Item label="Wipe Down" value="wipe down" />
                  </Picker>
                  <View style={styles.modalCloseContainer}>
                    <TouchableOpacity onPress={handleTogglePicker}>
                      <Text style={styles.modalCloseText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Picker Modal for Vacancy */}
            <Modal
              visible={vacancyModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={handleToggleVacancyPicker}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={vacancy}
                    onValueChange={handleVacancyChange}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select occupancy" value="" />
                    <Picker.Item label="Occupied" value="occupied" />
                    <Picker.Item label="Unoccupied" value="unoccupied" />
                  </Picker>
                  <View style={styles.modalCloseContainer}>
                    <TouchableOpacity onPress={handleToggleVacancyPicker}>
                      <Text style={styles.modalCloseText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Photos */}
            {newTicket.ticketPhotos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photosContainer}
              >
                {newTicket.ticketPhotos.map((uri, index) => (
                  <View key={index} style={styles.photoWrapper}>
                    <Image source={{ uri }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => handleRemovePhoto(index)}
                    >
                      <Text style={styles.removePhotoText}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={handleAddPhoto}
              style={styles.addPhotoButton}
            >
              <Text style={styles.addPhotoButtonText}>Add Photo</Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={handleCreate}
                style={[
                  styles.actionButton,
                  styles.createButton,
                  isSubmitting && styles.disabledButton,
                ]}
                disabled={isSubmitting}
              >
                <Text style={styles.actionButtonText}>
                  {isSubmitting ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBack}
                style={[styles.actionButton, styles.cancelButton]}
                disabled={isSubmitting}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default CreateTicketScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  scrollView: {
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  floatingContainer: {
    position: 'absolute',
    top: 0,
    left: -10,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  dateTimeSection: {
    marginBottom: 20,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: '#34495e',
    marginRight: 10,
    width: 90,
  },
  datePicker: {
    flex: 1,
  },
  timePicker: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginVertical: 10,
  },
  addressDisplay: {
    backgroundColor: '#F3F5F7',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  addressText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  searchSection: {
    width: '100%',
    marginBottom: 20,
    position: 'relative',
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 5,
    marginBottom: 5,
    backgroundColor: 'white',
  },
  inputFieldGoogle: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 5,
    textAlignVertical: 'top',
    backgroundColor: 'white',
  },
  suggestionsWrapper: {
    position: 'absolute',
    top: 55, // Adjust to position it just below the search input
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  suggestionsContainer: {
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  detailCard: {
    backgroundColor: '#F3F5F7',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 4,
  },
  button: {
    padding: 12,
    backgroundColor: '#2980b9',
    borderRadius: 5,
    marginBottom: 20,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    elevation: 3,
    marginVertical: 5,
    marginHorizontal: 5,
  },
  createButton: {
    backgroundColor: '#2c3e50',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    backgroundColor: '#2ecc71',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  addPhotoButtonText: {
    color: 'white',
    fontSize: 18,
  },
  photosContainer: {
    marginVertical: 10,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  photo: {
    width: 100,
    height: 100,
    marginBottom: 10,
    borderRadius: 5,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: 'red',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalCloseContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#2980b9',
  },
})
