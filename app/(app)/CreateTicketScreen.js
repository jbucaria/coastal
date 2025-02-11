import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'expo-router'
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import 'react-native-get-random-values'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { handleCreateTicket } from '@/utils/generateTicket'
import { useUserStore } from '@/store/useUserStore'
import {
  formatPhoneNumber,
  parseAddressComponents,
  setTimeToDate,
} from '@/utils/helpers'
import PhotoGallery from '@/components/PhotoGallery'
const initialTicketStatus = {
  street: '123 Main St',
  apt: '',
  city: 'Tampa',
  state: 'FL',
  zip: '33602',
  date: '',
  // Builder fields
  customer: '',
  customerName: '',
  customerNumber: '', // store unformatted digits
  customerEmail: '',
  homeOwnerName: '', // leave empty by default
  homeOwnerNumber: '', // store unformatted digits
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
  const [manualAddress, setManualAddress] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState('')
  // Customer (Builder) Search State
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [allCustomers, setAllCustomers] = useState([])
  // Homeowner Info Toggle
  const [showHomeowner, setShowHomeowner] = useState(false)

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

  // Update customer suggestions whenever search query changes
  useEffect(() => {
    if (customerSearchQuery.trim() === '') {
      setCustomerSuggestions([])
      return
    }
    const queryLower = customerSearchQuery.toLowerCase()
    const filtered = allCustomers.filter(c =>
      c.displayName?.toLowerCase().includes(queryLower)
    )
    setCustomerSuggestions(filtered)
  }, [customerSearchQuery, allCustomers])

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
      setNewTicket(prev => ({ ...prev, street: data.description }))
    }
  }

  const handleSelectCustomer = selectedCustomer => {
    setNewTicket(prev => ({
      ...prev,
      customer: selectedCustomer.id,
      customerName: selectedCustomer.displayName || '',
      customerEmail: selectedCustomer.email || '',
      customerNumber: selectedCustomer.number || '',
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
    setNewTicket(prev => ({ ...prev, typeOfJob: itemValue }))
  }

  const handleVacancyChange = itemValue => {
    setVacancy(itemValue)
    setNewTicket(prev => ({ ...prev, occupied: itemValue === 'occupied' }))
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

  // Format homeowner number as the user types
  const handleHomeOwnerNumberChange = text => {
    const formatted = formatPhoneNumber(text)
    setNewTicket(prev => ({ ...prev, homeOwnerNumber: formatted }))
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
      <View style={styles.container}>
        <HeaderWithOptions
          title="Create Ticket"
          onBack={handleBack}
          onOptions={() => {}}
        />
        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={40}
        >
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.title}>Create Ticket</Text>
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
              <Text style={styles.sectionTitle}>Address</Text>
              {!manualAddress && (
                <GooglePlacesAutocomplete
                  debounce={500}
                  disableScroll={true}
                  fetchDetails={true}
                  onPress={handleAutocompletePress}
                  placeholder="Search address..."
                  query={{
                    key: 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs',
                    language: 'en',
                    components: 'country:us',
                  }}
                  styles={{
                    textInputContainer: styles.autocompleteContainer,
                    textInput: styles.inputFieldGoogle,
                    listView: {
                      backgroundColor: 'white',
                      elevation: 5,
                      maxHeight: 200,
                      zIndex: 5,
                    },
                  }}
                />
              )}
              {selectedAddress !== '' && (
                <View style={styles.addressDisplay}>
                  <Text style={styles.addressText}>{selectedAddress}</Text>
                </View>
              )}
              <Text style={styles.sectionTitle}>Builder Information</Text>
              <View style={styles.searchSection}>
                <TextInput
                  style={styles.inputField}
                  placeholder="Search builder by name..."
                  value={customerSearchQuery}
                  onChangeText={setCustomerSearchQuery}
                />
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
                            {cust.displayName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
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
                    Phone: {formatPhoneNumber(newTicket.customerNumber)}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => setShowHomeowner(prev => !prev)}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleButtonText}>
                  {showHomeowner ? 'Hide Homeowner Info' : 'Add Homeowner Info'}
                </Text>
              </TouchableOpacity>
              {showHomeowner && (
                <>
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
                    onChangeText={handleHomeOwnerNumberChange}
                    keyboardType="phone-pad"
                  />
                </>
              )}
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
              {newTicket.ticketPhotos.length > 0 && (
                <PhotoGallery
                  photos={newTicket.ticketPhotos}
                  onRemovePhoto={handleRemovePhoto}
                />
              )}
              <TouchableOpacity
                onPress={handleAddPhoto}
                style={styles.addPhotoButton}
              >
                <Text style={styles.addPhotoButtonText}>Add Photo</Text>
              </TouchableOpacity>
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
      </View>
    </SafeAreaView>
  )
}

export default CreateTicketScreen

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 5,
    elevation: 3,
    flex: 1,
    marginHorizontal: 5,
    marginVertical: 5,
    padding: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    alignItems: 'center',
    backgroundColor: '#2ecc71',
    borderRadius: 5,
    marginBottom: 5,
    padding: 12,
  },
  addPhotoButtonText: {
    fontSize: 18,
    color: 'white',
  },
  addressDisplay: {
    borderRadius: 5,
    marginBottom: 20,
    padding: 5,
  },
  addressText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#2980b9',
    borderRadius: 5,
    elevation: 3,
    marginBottom: 20,
    padding: 12,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  container: {
    flex: 1,
    padding: 5,
    backgroundColor: 'white',
  },
  contentContainer: {
    paddingBottom: 5,
    paddingHorizontal: 5,
  },
  createButton: {
    backgroundColor: '#2c3e50',
  },
  datePicker: {
    flex: 1,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  dateTimeSection: {
    marginBottom: 5,
  },
  detailCard: {
    borderRadius: 8,
    marginBottom: 20,
    padding: 5,
    width: '100%',
  },
  detailText: {
    fontSize: 16,
    marginBottom: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  flex1: {
    flex: 1,
  },
  inputField: {
    backgroundColor: 'white',
    borderColor: '#ccc',
    borderRadius: 5,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 5,
    padding: 12,
  },
  inputFieldGoogle: {
    backgroundColor: 'white',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    padding: 5,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    marginRight: 10,
    width: 90,
    color: '#34495e',
  },
  modalCloseContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 5,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#2980b9',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 5,
    padding: 5,
    width: '80%',
  },
  photo: {
    borderRadius: 5,
    height: 100,
    marginBottom: 5,
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
    fontSize: 14,
    fontWeight: 'bold',
    color: 'red',
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
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 5,
    color: '#2c3e50',
  },
  suggestionItem: {
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    padding: 10,
  },
  suggestionText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  suggestionsContainer: {
    maxHeight: 150,
  },
  suggestionsWrapper: {
    backgroundColor: 'white',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 16,
    fontWeight: '600',
  },
})
