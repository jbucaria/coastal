import React, { useState, useCallback, useEffect } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  Platform,
  Alert,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { handleCreateTicket } from '@/utils/generateTicket'
import { useUserStore } from '@/store/useUserStore'
import { formatPhoneNumber } from '@/utils/helpers'
import { IconSymbol } from '@/components/ui/IconSymbol'
import BuilderModal from '@/components/BuilderModal'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import PhotoGallery from '@/components/PhotoGallery'
import { pickAndUploadPhotos } from '@/utils/photoUpload'

const initialTicketStatus = {
  street: '',
  apt: '',
  city: '',
  state: '',
  zip: '',
  date: '',
  startTime: '',
  endTime: '',
  customer: '',
  customerName: '',
  customerNumber: '',
  customerEmail: '',
  customerId: '',
  homeOwnerName: '',
  homeOwnerNumber: '',
  homeOwnerEmail: '',
  inspectorName: 'John Bucaria',
  reason:
    'Homeowner found wet carpet in the living room. Need to inspect for leaks and water damage.',
  hours: '2',
  recommendedActions: '',
  messageCount: 0,
  reportPhotos: [],
  ticketPhotos: [],
  onSite: false,
  inspectionComplete: false,
  remediationRequired: false,
  remediationStatus: 'notStarted',
  equipmentOnSite: false,
  siteComplete: false,
  measurementsRequired: false,
  damageType: [],
  causeOfDamage: '',
  categoryOfDamage: '',
  classOfLoss: '',
  dateOfLoss: '',
  images: [],
  occupied: '',
}

const CreateTicketScreen = () => {
  const router = useRouter()
  const { user } = useUserStore()
  const params = useLocalSearchParams()
  const {
    address,
    appointmentDate,
    startTime: startTimeParam,
    endTime: endTimeParam,
  } = params

  const [newTicket, setNewTicket] = useState({
    ...initialTicketStatus,
    street: address || '',
    date: appointmentDate || '',
    startTime: startTimeParam || '',
    endTime: endTimeParam || '',
  })
  const [selectedTab, setSelectedTab] = useState('Loss Data')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [builderModalVisible, setBuilderModalVisible] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [allCustomers, setAllCustomers] = useState([])
  const [damageType, setDamageType] = useState([])
  const [causeOfDamage, setCauseOfDamage] = useState('')
  const [categoryOfDamage, setCategoryOfDamage] = useState('')
  const [classOfLoss, setClassOfLoss] = useState('')
  const [occupied, setOccupied] = useState('')
  const [dateOfLoss, setDateOfLoss] = useState(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const marginBelowHeader = 8

  useEffect(() => {
    const fetchCustomers = async () => {
      const querySnapshot = await getDocs(collection(firestore, 'customers'))
      const customersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      setAllCustomers(customersData)
    }
    fetchCustomers()
  }, [])

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

  const handleSelectCustomer = selectedCustomer => {
    setNewTicket(prev => ({
      ...prev,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.displayName || '',
      customerEmail: selectedCustomer.email || '',
      customerNumber: selectedCustomer.number || '',
    }))
    setCustomerSearchQuery(selectedCustomer.displayName)
    setBuilderModalVisible(false)
  }

  const validateForm = () => {
    const errors = []
    if (!newTicket.street) errors.push('Address')
    if (!newTicket.date) errors.push('Appointment Date')
    if (!newTicket.startTime) errors.push('Start Time')
    if (!newTicket.endTime) errors.push('End Time')
    if (!newTicket.customerName) errors.push('Builder')
    if (damageType.length === 0) errors.push('Type of Damage')
    if (!causeOfDamage) errors.push('Cause of Damage')
    if (!categoryOfDamage) errors.push('Category of Damage')
    if (!classOfLoss) errors.push('Class of Loss')
    if (!occupied) errors.push('Occupied Status')
    // Removed validation for selectedImages as it's now optional
    return errors
  }

  const handleCreate = () => {
    const errors = validateForm()
    if (errors.length > 0) {
      Alert.alert(
        'Missing Required Fields',
        `Please fill out the following required fields:\n- ${errors.join(
          '\n- '
        )}`,
        [{ text: 'OK' }]
      )
      return
    }

    handleCreateTicket(
      {
        ...newTicket,
        damageType,
        causeOfDamage,
        categoryOfDamage,
        classOfLoss,
        dateOfLoss: dateOfLoss ? dateOfLoss.toISOString() : '',
        images: selectedImages,
        occupied,
      },
      new Date(newTicket.date),
      new Date(newTicket.startTime),
      new Date(newTicket.endTime),
      () => setNewTicket(initialTicketStatus),
      setIsSubmitting,
      isSubmitting,
      null,
      user
    )
  }

  const handleAddPhoto = useCallback(async () => {
    const folder = 'ticketPhotos'
    const photosArray = await pickAndUploadPhotos({ folder, quality: 0.7 })
    if (photosArray.length > 0) {
      const urls = photosArray.map(photo => photo.downloadURL)
      setNewTicket(prev => ({
        ...prev,
        ticketPhotos: [...prev.ticketPhotos, ...urls],
      }))
    }
  }, [])

  const handleRemovePhoto = index => {
    setNewTicket(prev => ({
      ...prev,
      ticketPhotos: prev.ticketPhotos.filter((_, i) => i !== index),
    }))
  }

  const handleDateOfLossChange = (event, date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false)
      return
    }
    setShowDatePicker(Platform.OS === 'ios')
    if (date) setDateOfLoss(date)
  }

  const handleImageSelect = image => {
    setSelectedImages(prev => {
      if (prev.includes(image)) {
        return prev.filter(i => i !== image)
      }
      return [...prev, image]
    })
  }

  const handleDamageTypeSelect = type => {
    setDamageType(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type)
      }
      return [...prev, type]
    })
  }

  const handleOccupiedSelect = value => {
    setOccupied(value)
    setNewTicket(prev => ({ ...prev, occupied: value }))
  }

  const handleHeaderOption = option => {
    switch (option.label) {
      case 'Add Photo':
        handleAddPhoto()
        break
      case 'Create':
        handleCreate()
        break
      case 'Cancel':
        router.back()
        break
    }
  }

  const formatAddressDisplay = () => {
    const parts = [
      newTicket.street,
      newTicket.apt ? `Apt ${newTicket.apt}` : '',
      newTicket.city,
      newTicket.state,
      newTicket.zip,
    ].filter(Boolean)
    return parts.join(', ')
  }

  const formatAppointmentDisplay = () => {
    const date = new Date(newTicket.date)
    const start = new Date(newTicket.startTime)
    const end = new Date(newTicket.endTime)
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const startStr = start.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    const endStr = end.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${dateStr} at ${startStr} - ${endStr}`
  }

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Property Data':
        return (
          <View style={styles.tabContent}>
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyText}>
                Address: {formatAddressDisplay()}
              </Text>
              <Text style={styles.readOnlyText}>
                Appointment: {formatAppointmentDisplay()}
              </Text>
            </View>
            <Text style={styles.subTitle}>Occupied</Text>
            <View style={styles.occupiedGrid}>
              {[
                { value: 'Empty', icon: '🏚️' },
                { value: 'Occupied', icon: '🏠' },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.occupiedButton,
                    occupied === option.value && styles.occupiedButtonActive,
                  ]}
                  onPress={() => handleOccupiedSelect(option.value)}
                >
                  <Text style={styles.occupiedIcon}>{option.icon}</Text>
                  <Text style={styles.occupiedText}>{option.value}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      case 'Loss Data':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.subTitle}>Type of Damage</Text>
            <View style={styles.damageGrid}>
              {[
                { type: 'Water', icon: '💧' },
                { type: 'Fire', icon: '🔥' },
                { type: 'Mold', icon: '🍄' },
                { type: 'Remediation', icon: '🛠️' },
                { type: 'Inspection', icon: '🔍' },
                { type: 'Smoke', icon: '💨' },
              ].map(item => (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.damageButton,
                    damageType.includes(item.type) && styles.damageButtonActive,
                  ]}
                  onPress={() => handleDamageTypeSelect(item.type)}
                >
                  <Text style={styles.damageIcon}>{item.icon}</Text>
                  <Text style={styles.damageText}>{item.type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.subTitle, { marginTop: 2 }]}>
              Cause of Damage
            </Text>
            <View style={styles.damageGrid}>
              {[
                { cause: 'Wind', icon: '🌬️' },
                { cause: 'Leaking Pipe', icon: '🚰' },
                { cause: 'Stucco Crack', icon: '🧱' },
                { cause: 'Window Frame', icon: '🪟' },
                { cause: 'Roof Leak', icon: '🏠💧' },
                { cause: 'Unknown', icon: '❓' },
              ].map(item => (
                <TouchableOpacity
                  key={item.cause}
                  style={[
                    styles.damageButton,
                    causeOfDamage === item.cause && styles.damageButtonActive,
                  ]}
                  onPress={() => setCauseOfDamage(item.cause)}
                >
                  <Text style={styles.damageIcon}>{item.icon}</Text>
                  <Text style={styles.damageText}>{item.cause}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.subTitle}>Images (optional)</Text>
            <View style={styles.damageGrid}>
              {[
                { image: 'Image 1' },
                { image: 'Image 2' },
                { image: 'Image 3' },
                { image: 'Image 4' },
                { image: 'Image 5' },
                { image: 'Image 6' },
              ].map(item => (
                <TouchableOpacity
                  key={item.image}
                  style={[
                    styles.damageButton,
                    selectedImages.includes(item.image) &&
                      styles.damageButtonActive,
                  ]}
                  onPress={() => handleImageSelect(item.image)}
                >
                  <Text style={styles.damageText}>{item.image}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.subTitle}>Category of Damage</Text>
            <View style={styles.categoryContainer}>
              {['1', '2', '3'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    categoryOfDamage === cat && styles.categoryButtonActive,
                  ]}
                  onPress={() => setCategoryOfDamage(cat)}
                >
                  <Text style={styles.categoryText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.subTitle}>Class of Loss</Text>
            <View style={styles.categoryContainer}>
              {['1', '2', '3', '4'].map(cls => (
                <TouchableOpacity
                  key={cls}
                  style={[
                    styles.categoryButton,
                    classOfLoss === cls && styles.categoryButtonActive,
                  ]}
                  onPress={() => setClassOfLoss(cls)}
                >
                  <Text style={styles.categoryText}>{cls}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.subTitle}>Date of Loss (optional)</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.dateButton}
            >
              <Text>
                {dateOfLoss ? dateOfLoss.toLocaleString() : 'Select Date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dateOfLoss || new Date()}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={handleDateOfLossChange}
              />
            )}
          </View>
        )
      case 'Contact Data':
        return (
          <View style={styles.tabContent}>
            <TextInput
              style={styles.inputField}
              placeholder="Homeowner Name (optional)"
              value={newTicket.homeOwnerName}
              onChangeText={text =>
                setNewTicket({ ...newTicket, homeOwnerName: text })
              }
            />
            <TextInput
              style={styles.inputField}
              placeholder="Homeowner Number (optional)"
              value={newTicket.homeOwnerNumber}
              onChangeText={text => {
                const formatted = formatPhoneNumber(text)
                setNewTicket({ ...newTicket, homeOwnerNumber: formatted })
              }}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.inputField}
              placeholder="Homeowner Email (optional)"
              value={newTicket.homeOwnerEmail}
              onChangeText={text =>
                setNewTicket({ ...newTicket, homeOwnerEmail: text })
              }
              keyboardType="email-address"
            />
            <View style={styles.selectionContainer}>
              <Text style={styles.selectionText}>
                {newTicket.customerName || 'No builder selected'}
              </Text>
              <TouchableOpacity
                onPress={() => setBuilderModalVisible(true)}
                style={styles.plusButton}
              >
                <IconSymbol name="plus" color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )
      default:
        return null
    }
  }

  const headerOptions = [
    { label: 'Add Photo', onPress: handleAddPhoto },
    { label: 'Create', onPress: handleCreate },
    { label: 'Cancel', onPress: () => router.back() },
  ]

  return (
    <View style={styles.fullScreenContainer}>
      <HeaderWithOptions
        title="Project Data"
        onBack={() => router.back()}
        options={headerOptions}
        onHeightChange={height => setHeaderHeight(height)}
      />
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight + 20}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.contentContainer,
              { paddingTop: headerHeight + marginBelowHeader },
            ]}
          >
            <View style={styles.buttonBar}>
              {['Property Data', 'Loss Data', 'Contact Data'].map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabButton,
                    selectedTab === tab && styles.tabButtonActive,
                  ]}
                  onPress={() => setSelectedTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      selectedTab === tab && styles.tabButtonTextActive,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {renderTabContent()}

            {newTicket.ticketPhotos.length > 0 && (
              <PhotoGallery
                photos={newTicket.ticketPhotos}
                onRemovePhoto={handleRemovePhoto}
              />
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <BuilderModal
        visible={builderModalVisible}
        onClose={() => setBuilderModalVisible(false)}
        onSelectCustomer={handleSelectCustomer}
        allCustomers={allCustomers}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  fullScreenContainer: { flex: 1 },
  flex1: { flex: 1 },
  scrollView: { paddingHorizontal: 5 },
  contentContainer: { paddingBottom: 20 },
  buttonBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 20,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  tabButtonActive: {
    backgroundColor: '#999999',
  },
  tabButtonText: {
    fontSize: 12,
    color: '#000',
  },
  tabButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  tabContent: { padding: 10 },
  readOnlyBox: {
    backgroundColor: '#f9f9f9',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  readOnlyText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 8,
    color: '#555',
  },
  damageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  damageButton: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  damageButtonActive: {
    backgroundColor: '#999999',
  },
  damageIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  damageText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#555',
  },
  occupiedGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  occupiedButton: {
    width: '45%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  occupiedButtonActive: {
    backgroundColor: '#999999',
  },
  occupiedIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  occupiedText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#555',
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginHorizontal: 2,
    backgroundColor: '#f0f0f0',
  },
  categoryButtonActive: {
    backgroundColor: '#999999',
  },
  categoryText: {
    fontSize: 14,
    color: '#555',
  },
  dateButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
  },
  inputField: {
    backgroundColor: '#f9f9f9',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    fontSize: 14,
    padding: 10,
    marginBottom: 10,
  },
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
    fontSize: 14,
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
  button: {
    backgroundColor: '#2980b9',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    marginVertical: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  modalCloseText: {
    color: '#2980b9',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
})

export default CreateTicketScreen
