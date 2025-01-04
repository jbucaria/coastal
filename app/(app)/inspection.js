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
  Alert,
  ActivityIndicator,
} from 'react-native'
import Checkbox from 'expo-checkbox'
import * as Print from 'expo-print'
import * as ImagePicker from 'expo-image-picker'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import * as Linking from 'expo-linking'

import DateTimePicker from '@react-native-community/datetimepicker'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { generateReportHTML } from '@/components/ReportTemplate'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc } from 'firebase/firestore'
import { storage, firestore } from '@/firebaseConfig'
import { handleGeneratePdf } from '@/utils/generatePdf'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { Link } from 'expo-router'

export default function App() {
  const [customer, setCustomer] = useState('')
  const [address, setAddress] = useState('') // Address field
  const [date, setDate] = useState(new Date()) // Date of inspection
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [reason, setReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Inspector selection
  const [inspectorName, setInspectorName] = useState('')
  const [inspectorModalVisible, setInspectorModalVisible] = useState(false)
  const inspectors = ['John Bucaria', 'Dave Sprott', 'Bobby Blasewitz']

  const [hours, setHours] = useState('')

  const [inspectionResults, setInspectionResults] = useState('')
  const [recommendedActions, setRecommendedActions] = useState('')

  // Photos (from image picker)
  const [photos, setPhotos] = useState([]) // Each item: { uri: string, label: string, base64: string }

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

  const handleRemovePhoto = index => {
    const updatedPhotos = [...photos]
    updatedPhotos.splice(index, 1)
    setPhotos(updatedPhotos)
  }

  const pickImageAsync = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      alert('Permission to access camera roll is required!')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true, // Enable multiple selection
      allowsEditing: false,
      quality: 0.5, // Lower quality (0.5 is 50%, adjust as needed)
    })

    if (!result.canceled) {
      const selectedAssets = await Promise.all(
        result.assets.map(async asset => {
          // Optionally, you could resize here, but it's more complex and might not be necessary if quality reduction suffices
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

  const handleGeneratePdfLocal = async () => {
    const formData = {
      customer,
      address,
      date: date.toLocaleDateString(),
      reason,
      inspectorName,
      hours,
      inspectionResults,
      recommendedActions,
      photos: photos, // Sending the original photos array here
    }
    await handleGeneratePdf(formData, setIsSaving)
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ThemedView style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Customer Field */}
              <ThemedText type="subtitle">Customer</ThemedText>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 20,
                  backgroundColor: 'white',
                }}
                value={customer}
                onChangeText={setCustomer}
                placeholder="Enter customer name"
              />

              {/* Address Field */}
              <ThemedText type="subtitle">Address</ThemedText>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 20,
                  backgroundColor: 'white',
                }}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter property address"
              />

              {/* Date of Inspection */}
              <ThemedText type="subtitle">Date of Inspection</ThemedText>
              <Pressable
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 20,
                  backgroundColor: 'white',
                }}
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText>
                  {date ? date.toLocaleDateString() : 'Select Date'}
                </ThemedText>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}

              {/* Reason for Inspection */}
              <ThemedText type="subtitle">Reason for Inspection</ThemedText>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 20,
                  backgroundColor: 'white',
                }}
                value={reason}
                onChangeText={setReason}
                placeholder="Enter reason"
              />

              {/* Inspector's Name (Modal Selection) */}
              <ThemedText type="subtitle">Inspector's Name</ThemedText>
              <Pressable
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 20,
                  backgroundColor: 'white',
                }}
                onPress={() => setInspectorModalVisible(true)}
              >
                <ThemedText>{inspectorName || 'Select Inspector'}</ThemedText>
              </Pressable>

              {/* Modal for selecting inspector */}
              <Modal
                transparent={true}
                visible={inspectorModalVisible}
                animationType="slide"
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: 'white',
                      margin: 20,
                      padding: 20,
                      borderRadius: 10,
                    }}
                  >
                    <ThemedText type="subtitle">Select Inspector</ThemedText>
                    {inspectors.map((inspector, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={{
                          padding: 10,
                          borderBottomWidth:
                            idx < inspectors.length - 1 ? 1 : 0,
                          borderBottomColor: '#ccc',
                        }}
                        onPress={() => setInspectorName(inspector)}
                      >
                        <ThemedText>{inspector}</ThemedText>
                      </TouchableOpacity>
                    ))}
                    <Button
                      title="Done"
                      onPress={() => setInspectorModalVisible(false)}
                    />
                  </View>
                </View>
              </Modal>

              {/* Hours to Complete Inspection */}
              <ThemedText type="subtitle">
                Hours to Complete Inspection
              </ThemedText>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 20,
                  backgroundColor: 'white',
                }}
                value={hours}
                onChangeText={setHours}
                placeholder="Enter hours"
                keyboardType="numeric"
              />

              {/* Inspection Results */}
              <ThemedText type="subtitle">Inspection Results</ThemedText>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 20,
                  backgroundColor: 'white',
                  height: 100,
                  textAlignVertical: 'top',
                }}
                value={inspectionResults}
                onChangeText={setInspectionResults}
                placeholder="Enter inspection results"
                multiline
              />

              {/* Recommended Actions */}
              <ThemedText type="subtitle">Recommended Actions</ThemedText>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 20,
                  backgroundColor: 'white',
                  height: 100,
                  textAlignVertical: 'top',
                }}
                value={recommendedActions}
                onChangeText={setRecommendedActions}
                placeholder="Enter recommended actions"
                multiline
              />

              {/* Photos */}
              <ThemedView className="flex-1 justify-center items-center">
                <View className="flex-row justify-between w-full items-center p-4">
                  <ThemedText type="subtitle">Photos</ThemedText>
                  <Pressable onPress={pickImageAsync}>
                    <IconSymbol
                      name="photo.badge.plus"
                      size={70}
                      color="#008000"
                    />
                  </Pressable>
                </View>
              </ThemedView>
              {photos.map((photo, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 10,
                  }}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    style={{ width: 50, height: 50, marginRight: 10 }}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: '#ccc',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: 'white',
                    }}
                    value={photo.label}
                    onChangeText={text => handlePhotoLabelChange(text, index)}
                    placeholder="Label this photo"
                  />
                  <TouchableOpacity onPress={() => handleRemovePhoto(index)}>
                    <ThemedText style={{ color: 'red', marginLeft: 10 }}>
                      Remove
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Button for generating PDF */}
              <ThemedView style={{ marginTop: 20 }}>
                {isSaving ? (
                  <ActivityIndicator size="large" color="#0000ff" />
                ) : (
                  <Button
                    title="Generate PDF & Send Email"
                    onPress={handleGeneratePdfLocal}
                  />
                )}
              </ThemedView>
            </ScrollView>
          </ThemedView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
