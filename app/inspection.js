import React, { useState } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  Pressable,
  ScrollView,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
} from 'react-native'
import Checkbox from 'expo-checkbox'
import * as Print from 'expo-print'
import * as ImagePicker from 'expo-image-picker'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import DateTimePicker from '@react-native-community/datetimepicker'
import IconSymbol from '@/components/ui/IconSymbol'
import { generateReportHTML } from '@/components/ReportTemplate'
import { handleGeneratePdf } from '@/utils/handleGeneratePDF'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc } from 'firebase/firestore'
import { storage, firestore } from '../firebaseConfig'

export default function App() {
  const [customer, setCustomer] = useState('')
  const [address, setAddress] = useState('') // Address field
  const [date, setDate] = useState(new Date()) // Date of inspection
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [reason, setReason] = useState('')

  // Inspector selection
  const [inspectorName, setInspectorName] = useState('')
  const [inspectorModalVisible, setInspectorModalVisible] = useState(false)
  const inspectors = ['John Bucaria', 'Dave Sprott', 'Bobby Blasewitz']

  const [hours, setHours] = useState('')

  // Equipment modal states
  const [equipmentModalVisible, setEquipmentModalVisible] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState({
    flirCamera: false,
    moistureMeter: false,
  })

  const [inspectionResults, setInspectionResults] = useState('')
  const [recommendedActions, setRecommendedActions] = useState('')

  // Photos (from image picker)
  const [photos, setPhotos] = useState([]) // Each item: { uri: string, label: string, base64: string }

  const toggleEquipment = key => {
    setSelectedEquipment(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const finalizeEquipmentSelection = () => {
    setEquipmentModalVisible(false)
  }

  const selectedEquipmentDisplay = Object.entries(selectedEquipment)
    .filter(([, selected]) => selected)
    .map(([key]) => (key === 'flirCamera' ? 'Flir Camera' : 'Moisture Meter'))

  const finalizeInspectorSelection = () => {
    setInspectorModalVisible(false)
  }

  const handlePhotoLabelChange = (text, index) => {
    const updatedPhotos = [...photos]
    updatedPhotos[index].label = text
    setPhotos(updatedPhotos)
  }

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false) // Close the picker after selecting a date
    if (selectedDate) {
      setDate(selectedDate) // Update the selected date
    }
  }

  const showPicker = () => {
    if (Platform.OS === 'android') {
      // Show the picker directly for Android
      setShowDatePicker(true)
    }
  }

  // Pick image from library
  const pickImageAsync = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      alert('Permission to access camera roll is required!')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      allowsEditing: true,
      quality: 1,
    })

    if (!result.canceled) {
      const selectedAssets = await Promise.all(
        (result.assets || [result]).map(async asset => {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          })
          return {
            uri: asset.uri,
            label: '',
            base64,
          }
        })
      )
      setPhotos([...photos, ...selectedAssets])
    } else {
      alert('You did not select any image.')
    }
  }

  const handleGeneratePdf = async () => {
    const formData = {
      customer,
      address,
      date: date.toLocaleDateString(),
      reason,
      inspectorName,
      hours,
      equipment: selectedEquipmentDisplay,
      inspectionResults,
      recommendedActions,
      photos: photos.map(photo => ({
        uri: photo.uri,
        label: photo.label,
      })), // Only save URI and label, not the base64 data for size efficiency
    }

    try {
      // Generate HTML and PDF as before
      const html = await generateReportHTML(formData)

      const sanitizedAddress = address
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 50)

      const fileName = sanitizedAddress
        ? `${sanitizedAddress}_Inspection_Report.pdf`
        : 'Inspection_Report.pdf'

      const { uri } = await Print.printToFileAsync({ html })

      const newPath = `${FileSystem.cacheDirectory}${fileName}`
      await FileSystem.moveAsync({
        from: uri,
        to: newPath,
      })

      // Share the renamed file
      await Sharing.shareAsync(newPath)

      // Save to Firestore
      const docRef = await addDoc(collection(firestore, 'inspectionReports'), {
        ...formData,
        timestamp: new Date(),
        pdfFileName: fileName,
      })
      console.log('Document written with ID: ', docRef.id)
    } catch (err) {
      console.error('Error generating PDF or saving to Firestore:', err)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1">
            <ScrollView
              className="p-4"
              contentContainerStyle={{ paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text className="text-xl font-bold mb-4">Inspection Report</Text>

              {/* Customer Field */}
              <Text className="mb-2 font-semibold">Customer</Text>
              <TextInput
                className="border border-gray-300 rounded p-2 mb-4 bg-white"
                value={customer}
                onChangeText={setCustomer}
                placeholder="Enter customer name"
              />

              {/* Address Field */}
              <Text className="mb-2 font-semibold">Address</Text>
              <TextInput
                className="border border-gray-300 rounded p-2 mb-4 bg-white"
                value={address}
                onChangeText={setAddress}
                placeholder="Enter property address"
              />

              {/* Date of Inspection */}
              <Text style={{ marginBottom: 8, fontWeight: 'bold' }}>
                Date of Inspection
              </Text>
              <Pressable
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  borderRadius: 8,
                  padding: 8,
                  marginBottom: 16,
                  backgroundColor: '#fff',
                }}
                onPress={() => setShowDatePicker(true)} // Show the date picker when pressed
              >
                <Text>{date ? date.toLocaleDateString() : 'Select Date'}</Text>
              </Pressable>

              {/* Date Picker */}
              {showDatePicker && (
                <DateTimePicker
                  value={date} // Use the current date as default
                  mode="date"
                  display="default" // Display a calendar-style picker
                  onChange={handleDateChange} // Handle the selected date
                />
              )}

              {/* Reason for Inspection */}
              <Text className="mb-2 font-semibold">Reason for Inspection</Text>
              <TextInput
                className="border border-gray-300 rounded p-2 mb-4 bg-white"
                value={reason}
                onChangeText={setReason}
                placeholder="Enter reason"
              />

              {/* Inspector's Name (Modal Selection) */}
              <Text className="mb-2 font-semibold">Inspector's Name</Text>
              <Pressable
                className="border border-gray-300 rounded p-2 mb-4 bg-white"
                onPress={() => setInspectorModalVisible(true)}
              >
                <Text>{inspectorName || 'Select Inspector'}</Text>
              </Pressable>

              <Modal
                transparent={true}
                visible={inspectorModalVisible}
                animationType="slide"
              >
                <View className="flex-1 justify-center bg-black/50">
                  <View className="bg-white mx-4 p-4 rounded">
                    <Text className="text-lg font-semibold mb-4">
                      Select Inspector
                    </Text>
                    {inspectors.map((inspector, idx) => (
                      <TouchableOpacity
                        key={idx}
                        className={`p-2 ${
                          idx < inspectors.length - 1
                            ? 'border-b border-gray-200'
                            : ''
                        }`}
                        onPress={() => setInspectorName(inspector)}
                      >
                        <Text
                          className={`text-base ${
                            inspectorName === inspector ? 'font-bold' : ''
                          }`}
                        >
                          {inspector}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <Button title="Done" onPress={finalizeInspectorSelection} />
                  </View>
                </View>
              </Modal>

              {/* Hours to Complete Inspection */}
              <Text className="mb-2 font-semibold">
                Hours to Complete Inspection
              </Text>
              <TextInput
                className="border border-gray-300 rounded p-2 mb-4 bg-white"
                value={hours}
                onChangeText={setHours}
                placeholder="Enter hours"
                keyboardType="numeric"
              />

              {/* Equipment Used (Multi-Select) */}
              <Text className="mb-2 font-semibold">Equipment Used</Text>
              <Pressable
                className="border border-gray-300 rounded p-2 mb-4 bg-white"
                onPress={() => setEquipmentModalVisible(true)}
              >
                <Text>
                  {selectedEquipmentDisplay.join(', ') || 'Select equipment'}
                </Text>
              </Pressable>

              <Modal
                transparent={true}
                visible={equipmentModalVisible}
                animationType="slide"
              >
                <View className="flex-1 justify-center bg-black/50">
                  <View className="bg-white mx-4 p-4 rounded">
                    <Text className="text-lg font-semibold mb-4">
                      Select Equipment
                    </Text>

                    <View className="flex-row items-center mb-2">
                      <Checkbox
                        value={selectedEquipment.flirCamera}
                        onValueChange={() => toggleEquipment('flirCamera')}
                        color={
                          selectedEquipment.flirCamera ? '#4630EB' : undefined
                        }
                      />
                      <Text className="ml-2">Flir Camera</Text>
                    </View>

                    <View className="flex-row items-center mb-4">
                      <Checkbox
                        value={selectedEquipment.moistureMeter}
                        onValueChange={() => toggleEquipment('moistureMeter')}
                        color={
                          selectedEquipment.moistureMeter
                            ? '#4630EB'
                            : undefined
                        }
                      />
                      <Text className="ml-2">Moisture Meter</Text>
                    </View>

                    <Button title="Done" onPress={finalizeEquipmentSelection} />
                  </View>
                </View>
              </Modal>

              {/* Inspection Results */}
              <Text className="mb-2 font-semibold">Inspection Results</Text>
              <TextInput
                className="border border-gray-300 rounded p-2 mb-4 bg-white"
                value={inspectionResults}
                onChangeText={setInspectionResults}
                placeholder="Enter inspection results"
                multiline
              />

              {/* Recommended Actions */}
              <Text className="mb-2 font-semibold">Recommended Actions</Text>
              <TextInput
                className="border border-gray-300 rounded p-2 mb-4 bg-white"
                value={recommendedActions}
                onChangeText={setRecommendedActions}
                placeholder="Enter recommended actions"
                multiline
              />

              {/* Attach Photos */}
              <Text className="mb-2 font-semibold">Photos</Text>
              <Button title="Attach Photos" onPress={pickImageAsync} />

              {photos.map((photo, index) => (
                <View key={index} className="flex flex-row items-center mt-4">
                  <Image
                    source={{ uri: photo.uri }}
                    style={{ width: 50, height: 50, marginRight: 8 }}
                  />
                  <TextInput
                    className="border border-gray-300 rounded p-2 bg-white flex-1"
                    value={photo.label}
                    onChangeText={text => handlePhotoLabelChange(text, index)}
                    placeholder="Label this photo"
                  />
                </View>
              ))}

              <View className="mt-8">
                <Button
                  title="Generate PDF & Send Email"
                  onPress={handleGeneratePdf}
                />
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
