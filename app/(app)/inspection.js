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
import { storage, firestore } from '../../firebaseConfig'
import { handleGeneratePdf } from '../../utils/generatePdf'
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, // Enable multiple selection
      allowsEditing: true,
      quality: 1,
    })

    if (!result.canceled) {
      const selectedAssets = await Promise.all(
        result.assets.map(async asset => {
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

  // const handleGeneratePdf = async () => {
  //   const formData = {
  //     customer,
  //     address,
  //     date: date.toLocaleDateString(),
  //     reason,
  //     inspectorName,
  //     hours,
  //     equipment: selectedEquipmentDisplay,
  //     inspectionResults,
  //     recommendedActions,
  //     photos: photos.map(photo => ({
  //       uri: photo.uri,
  //       label: photo.label,
  //     })),
  //   }

  //   try {
  //     // Generate HTML and PDF
  //     const html = await generateReportHTML(formData)

  //     const sanitizedAddress = address
  //       .replace(/[^a-zA-Z0-9]/g, '_')
  //       .replace(/_+/g, '_')
  //       .substring(0, 50)

  //     const fileName = sanitizedAddress
  //       ? `${sanitizedAddress}_Inspection_Report.pdf`
  //       : 'Inspection_Report.pdf'

  //     const { uri } = await Print.printToFileAsync({ html })

  //     // Save PDF to device's document directory
  //     const documentDir = FileSystem.documentDirectory
  //     const savePath = `${documentDir}/${fileName}`

  //     // Move the file to the document directory
  //     await FileSystem.moveAsync({
  //       from: uri,
  //       to: savePath,
  //     })

  //     // Check and request permission to write to external storage for Android
  //     if (Platform.OS === 'android') {
  //       const { status } = await Permissions.askAsync(
  //         Permissions.MEDIA_LIBRARY_WRITE_ONLY
  //       )
  //       if (status !== 'granted') {
  //         alert('Sorry, we need storage permissions to save the file.')
  //         return
  //       }
  //     }

  //     const docRef = await addDoc(collection(firestore, 'inspectionReports'), {
  //       ...formData,
  //       timestamp: new Date(),
  //       pdfFileName: fileName,
  //       pdfUri: savePath, // Store the path where the PDF is saved
  //     })
  //     console.log('Document written with ID: ', docRef.id)

  //     // Ask user if they want to share the file
  //     Alert.alert(
  //       'File Saved',
  //       'Do you want to share the report?',
  //       [
  //         {
  //           text: 'Cancel',
  //           style: 'cancel',
  //         },
  //         {
  //           text: 'Share',
  //           onPress: async () => {
  //             try {
  //               await Sharing.shareAsync(savePath, {
  //                 dialogTitle: 'Share Inspection Report',
  //                 mimeType: 'application/pdf',
  //                 UTI: 'public.content',
  //               })
  //             } catch (error) {
  //               console.error('Error sharing file:', error)
  //               alert('Failed to share the report')
  //             }
  //           },
  //         },
  //       ],
  //       { cancelable: false }
  //     )
  //   } catch (err) {
  //     console.error('Error generating PDF or saving to Firestore:', err)
  //     alert('An error occurred while generating or saving the report')
  //   }
  // }

  const handleGeneratePdf = async () => {
    setIsSaving(true) // Start showing indicator
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
      photos: [], // This will be populated with URLs from Firebase Storage
    }

    try {
      // Upload photos to Cloud Storage
      const photoUrls = await Promise.all(
        photos.map(async (photo, index) => {
          const storageRef = ref(
            storage,
            `inspectionPhotos/${Date.now()}_${index}`
          )
          const img = await fetch(photo.uri)
          const blob = await img.blob()
          const snapshot = await uploadBytes(storageRef, blob)
          const downloadURL = await getDownloadURL(snapshot.ref)
          return { uri: downloadURL, label: photo.label }
        })
      )

      formData.photos = photoUrls

      // Generate HTML and PDF
      const html = await generateReportHTML(formData)

      const sanitizedAddress = address
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 50)

      const fileName = sanitizedAddress
        ? `${sanitizedAddress}_Inspection_Report.pdf`
        : 'Inspection_Report.pdf'

      const { uri } = await Print.printToFileAsync({ html })

      // Upload PDF to Firebase Storage
      const pdfStorageRef = ref(storage, `inspectionReports/${fileName}`)
      const response = await fetch(uri)
      const blob = await response.blob()
      const pdfSnapshot = await uploadBytes(pdfStorageRef, blob)
      const pdfDownloadURL = await getDownloadURL(pdfSnapshot.ref)

      // Add report data to Firestore
      const docRef = await addDoc(collection(firestore, 'inspectionReports'), {
        ...formData,
        timestamp: new Date(),
        pdfFileName: fileName,
        pdfDownloadURL: pdfDownloadURL, // Store the download URL from storage
      })
      console.log('Document written with ID: ', docRef.id)

      Alert.alert(
        'File Saved',
        'The report has been saved and shared. What would you like to do?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsSaving(false),
          },
          {
            text: 'View',
            onPress: async () => {
              try {
                // Use expo-linking to open the PDF in an external viewer
                await Linking.openURL(pdfDownloadURL)
              } catch (error) {
                console.error('Error opening PDF:', error)
                Alert.alert(
                  'Error',
                  'Failed to open the PDF. Please try again.'
                )
              } finally {
                setIsSaving(false)
              }
            },
          },
          {
            text: 'Share',
            onPress: async () => {
              try {
                await Sharing.shareAsync(uri, {
                  dialogTitle: 'Share Inspection Report',
                  mimeType: 'application/pdf',
                  UTI: 'public.content',
                })
              } catch (error) {
                console.error('Error sharing file:', error)
                Alert.alert('Error', 'Failed to share the report')
              } finally {
                setIsSaving(false)
              }
            },
          },
        ],
        { cancelable: false }
      )
    } catch (err) {
      console.error('Error generating PDF or saving to Firestore:', err)
      Alert.alert(
        'Error',
        'An error occurred while generating or saving the report'
      )
      setIsSaving(false) // Ensure loading stops in case of an error
    }
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
                    onPress={handleGeneratePdf}
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
