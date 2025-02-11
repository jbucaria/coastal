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
import DateTimePicker from '@react-native-community/datetimepicker'
import 'react-native-get-random-values'
import * as ImagePicker from 'expo-image-picker'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { handleCreateTicket } from '@/utils/generateTicket'
import { useUserStore } from '@/store/useUserStore'
import PhotoGallery from '@/components/PhotoGallery'
import { formatPhoneNumber } from '@/utils/helpers'
import { IconSymbol } from '@/components/ui/IconSymbol'

// Initial ticket state object
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
  customerNumber: '',
  customerEmail: '',
  homeOwnerName: '',
  homeOwnerNumber: '',
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

  // Main state variables
  const [newTicket, setNewTicket] = useState(initialTicketStatus)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startTime, setStartTime] = useState(new Date())
  const [endTime, setEndTime] = useState(new Date())
  const [jobType, setJobType] = useState('')
  const [vacancy, setVacancy] = useState('')
  const [newNote, setNewNote] = useState('')
  const [selectedAddress, setSelectedAddress] = useState('')

  // Modal visibility state
  const [addressModalVisible, setAddressModalVisible] = useState(false)
  const [builderModalVisible, setBuilderModalVisible] = useState(false)
  const [jobTypeModalVisible, setJobTypeModalVisible] = useState(false)
  const [vacancyModalVisible, setVacancyModalVisible] = useState(false)

  // Builder (customer) selection state
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [allCustomers, setAllCustomers] = useState([])

  // Toggle for Homeowner info section
  const [showHomeowner, setShowHomeowner] = useState(false)

  // Load customers from Firestore
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

  // Update builder suggestions as the search query changes
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

  // Helper to parse address components from Google Places
  const parseAddressComponents = addressComponents => {
    const components = { street: '', city: '', state: '', zip: '' }
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

  // Address selection handler from Google Places
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

  // Builder selection handler
  const handleSelectCustomer = selectedCustomer => {
    setNewTicket(prev => ({
      ...prev,
      customer: selectedCustomer.id,
      customerName: selectedCustomer.displayName || '',
      customerEmail: selectedCustomer.email || '',
      customerNumber: selectedCustomer.number || '',
    }))
    setCustomerSearchQuery(selectedCustomer.displayName)
  }

  // Date and time picker change handlers
  const handleDateChange = (event, date) => {
    if (date) {
      setSelectedDate(date)
      setStartTime(setTimeToDate(date, startTime))
      setEndTime(setTimeToDate(date, endTime))
    }
  }
  const handleStartTimeChange = (event, time) => {
    if (time) {
      setStartTime(setTimeToDate(selectedDate, time))
    }
  }
  const handleEndTimeChange = (event, time) => {
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
    setJobTypeModalVisible(prev => !prev)
  }
  const handleToggleVacancyPicker = () => {
    setVacancyModalVisible(prev => !prev)
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

  // Sets the time portion of a date to match another Date object
  const setTimeToDate = (baseDate, timeDate) => {
    const newDate = new Date(baseDate)
    newDate.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0)
    return newDate
  }

  // Format homeowner phone number as user types
  const handleHomeOwnerNumberChange = text => {
    const formatted = formatPhoneNumber(text)
    setNewTicket(prev => ({ ...prev, homeOwnerNumber: formatted }))
  }

  // Add photo using the ImagePicker
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
              {/* Date & Time Section */}
              <View style={styles.card}>
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
              </View>

              {/* Address Selection Section */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Address</Text>
                <View style={styles.selectionContainer}>
                  <Text style={styles.selectionText}>
                    {selectedAddress ? selectedAddress : 'No address selected'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setAddressModalVisible(true)}
                    style={[
                      styles.plusButton,
                      {
                        backgroundColor: addressModalVisible
                          ? 'red'
                          : '#2980b9',
                      },
                    ]}
                  >
                    <IconSymbol
                      name={addressModalVisible ? 'minus' : 'plus'}
                      color="white"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Address Modal */}
              <Modal
                visible={addressModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setAddressModalVisible(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Address</Text>
                    <GooglePlacesAutocomplete
                      debounce={500}
                      disableScroll={true}
                      fetchDetails={true}
                      onPress={(data, details) => {
                        handleAutocompletePress(data, details)
                        setAddressModalVisible(false)
                      }}
                      placeholder="Search address..."
                      query={{
                        key: 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs',
                        language: 'en',
                        components: 'country:us',
                      }}
                      styles={{
                        textInputContainer: styles.autocompleteContainer,
                        textInput: styles.modalInput,
                        listView: {
                          backgroundColor: 'white',
                          elevation: 5,
                          maxHeight: 200,
                        },
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setAddressModalVisible(false)}
                    >
                      <Text style={styles.modalClose}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              {/* Builder Selection Section */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Builder</Text>
                <View style={styles.selectionContainer}>
                  <Text style={styles.selectionText}>
                    {newTicket.customerName
                      ? newTicket.customerName
                      : 'No builder selected'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setBuilderModalVisible(true)}
                    style={[
                      styles.plusButton,
                      {
                        backgroundColor: builderModalVisible
                          ? 'red'
                          : '#2980b9',
                      },
                    ]}
                  >
                    <IconSymbol
                      name={builderModalVisible ? 'minus' : 'plus'}
                      color="white"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Builder Modal */}
              <Modal
                visible={builderModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setBuilderModalVisible(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Builder</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Search builder by name..."
                      value={customerSearchQuery}
                      onChangeText={setCustomerSearchQuery}
                    />
                    <ScrollView style={styles.modalList}>
                      {customerSuggestions.map(cust => (
                        <TouchableOpacity
                          key={cust.id}
                          onPress={() => {
                            handleSelectCustomer(cust)
                            setBuilderModalVisible(false)
                          }}
                          style={styles.modalItem}
                        >
                          <Text style={styles.modalItemText}>
                            {cust.displayName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity
                      onPress={() => setBuilderModalVisible(false)}
                    >
                      <Text style={styles.modalClose}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              {/* Homeowner Section */}
              <View style={styles.card}>
                <View
                  style={[
                    styles.selectionContainer,
                    {
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    },
                  ]}
                >
                  <Text style={styles.modalTitle}>Homeowner</Text>
                  <TouchableOpacity
                    onPress={() => setShowHomeowner(prev => !prev)}
                    style={[
                      styles.plusButton,
                      { backgroundColor: showHomeowner ? 'red' : '#2980b9' },
                    ]}
                  >
                    <IconSymbol
                      name={showHomeowner ? 'minus' : 'plus'}
                      color="white"
                    />
                  </TouchableOpacity>
                </View>
                {showHomeowner && (
                  <>
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
              </View>

              {/* Ticket Details */}
              <View style={styles.card}>
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
              </View>

              {/* Job Type Modal */}
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

              {/* Vacancy Modal */}
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
  // General container and typography
  container: {
    flex: 1,
    padding: 5,
    backgroundColor: '#fff',
  },
  scrollView: {
    paddingHorizontal: 5,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#F5F8FA',
    borderColor: '#E1E8ED',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginVertical: 10,
    textAlign: 'center',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 8,
    color: '#2c3e50',
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginRight: 8,
  },
  // Date & Time Section
  dateTimeSection: {
    marginBottom: 10,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  datePicker: {
    flex: 1,
  },
  timePicker: {
    flex: 1,
  },
  // Input fields
  inputField: {
    backgroundColor: '#f9f9f9',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    fontSize: 16,
    padding: 10,
    marginBottom: 10,
    color: '#333',
  },
  // Selection container for Address and Builder
  selectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  selectionText: {
    flex: 1,
    fontSize: 16,
    color: '#555',
  },
  plusButton: {
    backgroundColor: '#2980b9',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusButtonText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 20,
  },
  // Buttons for actions
  button: {
    backgroundColor: '#2980b9',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    marginVertical: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  addPhotoButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    marginVertical: 6,
  },
  addPhotoButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 5,
    padding: 12,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#2c3e50',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    height: '60%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  modalInput: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
  },
  modalList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalItemText: {
    fontSize: 16,
    color: '#555',
  },
  modalClose: {
    color: '#2980b9',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  modalCloseContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalCloseText: {
    color: '#2980b9',
    fontSize: 16,
  },
  // Autocomplete container override (if needed)
  autocompleteContainer: {
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
  },
  // Picker container (for Job Type and Vacancy modals)
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    width: '90%',
    elevation: 5,
  },
  picker: {
    width: '100%',
  },
})
