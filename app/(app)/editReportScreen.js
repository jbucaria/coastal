import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Image,
} from 'react-native'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { firestore, storage } from '@/firebaseConfig'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { generateReportHTML } from '@/components/ReportTemplate'
import * as Print from 'expo-print'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { useThemeColor } from '@/hooks/useThemeColor'
import { useLocalSearchParams, router } from 'expo-router'
import {
  KeyboardToolbar,
  KeyboardAwareScrollView,
} from 'react-native-keyboard-controller'
import * as ImagePicker from 'expo-image-picker'
import { IconSymbol } from '@/components/ui/IconSymbol' // Assuming you have this component for icons

const EditReportPage = () => {
  const { id } = useLocalSearchParams()
  const [report, setReport] = useState(null)
  const [editedReport, setEditedReport] = useState({})
  const [photos, setPhotos] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const backgroundColor = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')

  useEffect(() => {
    if (id) {
      const fetchReport = async () => {
        try {
          const reportRef = doc(firestore, 'inspectionReports', id)
          const reportDoc = await getDoc(reportRef)
          if (reportDoc.exists()) {
            const reportData = reportDoc.data()
            setReport(reportData)
            setEditedReport(reportData)
            setPhotos(reportData.photos || [])
          } else {
            console.error('No such report!')
          }
        } catch (error) {
          console.error('Error fetching report:', error)
        }
      }
      fetchReport()
    }
  }, [id])

  if (!report || Object.keys(editedReport).length === 0) {
    return <Text>Loading...</Text>
  }

  const handleFieldChange = (field, value) => {
    setEditedReport(prev => ({ ...prev, [field]: value }))
  }

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    })

    if (!result.canceled) {
      setPhotos([...photos, { uri: result.assets[0].uri }])
    }
  }

  const handleSaveEdit = async () => {
    setIsSaving(true)
    setUploadProgress(0)
    try {
      const reportRef = doc(firestore, 'inspectionReports', id)

      // Handle photo uploads
      const newPhotos = []
      for (const photo of photos) {
        if (photo.uri && !photo.downloadURL) {
          const response = await fetch(photo.uri)
          const blob = await response.blob()
          const filename = `photos/${Date.now()}-${Math.random()
            .toString(36)
            .substring(7)}.jpg`
          const storageRef = ref(storage, filename)
          await uploadBytes(storageRef, blob)
          const downloadURL = await getDownloadURL(storageRef)
          newPhotos.push({ uri: downloadURL })
        } else {
          newPhotos.push(photo)
        }
      }

      // Update Firestore
      await updateDoc(reportRef, {
        ...editedReport,
        photos: newPhotos.map(p => ({ uri: p.uri })), // Ensure all photos have only uri field
      })

      // Generate new PDF with updated data
      const newHtml = await generateReportHTML({
        ...editedReport,
        photos: newPhotos,
      })
      const sanitizedAddress = editedReport.address
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 50)
      const fileName = sanitizedAddress
        ? `${sanitizedAddress}_Inspection_Report.pdf`
        : 'Inspection_Report.pdf'
      const { uri: newUri } = await Print.printToFileAsync({ html: newHtml })

      // Upload new PDF to Firebase Storage with progress tracking
      const pdfStorageRef = ref(storage, `inspectionReports/${fileName}`)
      const response = await fetch(newUri)
      const blob = await response.blob()

      await uploadBytes(pdfStorageRef, blob, {
        onUploadProgress: snapshot => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setUploadProgress(progress)
        },
      })

      const newPdfDownloadURL = await getDownloadURL(pdfStorageRef)

      // Update Firestore with new PDF URL
      await updateDoc(reportRef, {
        pdfFileName: fileName,
        pdfDownloadURL: newPdfDownloadURL,
      })

      Alert.alert('Success', 'Report and PDF have been updated')
    } catch (error) {
      console.error('Error updating report and PDF:', error)
      Alert.alert('Error', 'Failed to update the report or regenerate the PDF')
    } finally {
      setIsSaving(false)
      setUploadProgress(0)
      router.back()
    }
  }

  return (
    <>
      <KeyboardAwareScrollView
        bottomOffset={62}
        contentContainerStyle={styles.container}
      >
        <ScrollView>
          {/* Customer */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Customer
          </ThemedText>
          <TextInput
            value={editedReport.customer}
            onChangeText={text => handleFieldChange('customer', text)}
            placeholder="Customer"
            style={styles.editInput}
          />

          {/* Address */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Address
          </ThemedText>
          <TextInput
            value={editedReport.address}
            onChangeText={text => handleFieldChange('address', text)}
            placeholder="Address"
            style={styles.editInput}
          />

          {/* ... other fields ... */}

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Photos
          </ThemedText>
          <View style={styles.photoContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.deletePhotoButton}
                  onPress={() =>
                    setPhotos(photos.filter((_, i) => i !== index))
                  }
                >
                  <ThemedText style={styles.deletePhotoButtonText}>
                    X
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
              <IconSymbol name="plus" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {isSaving && (
            <View style={styles.progressBarContainer}>
              <View
                style={[styles.progressBar, { width: `${uploadProgress}%` }]}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveEdit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <ThemedText>Save Changes</ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <ThemedText>Close</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 96, // Equivalent to pb-24 in NativeWind
  },
  editContent: {
    flexGrow: 1,
  },
  editContentContainer: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 20,
    color: '#2C3E50',
  },
  sectionTitle: {
    marginBottom: 5,
    color: '#2C3E50',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: 'white',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#3498db',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 3,
    marginTop: 15,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 3,
    marginTop: 10,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  progressBarContainer: {
    height: 20,
    backgroundColor: '#e0e0e0',
    width: '100%',
    marginTop: 10,
    borderRadius: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2C3E50',
  },
  photoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoWrapper: {
    position: 'relative',
    margin: 5,
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 5,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 50, // Circular shape
    padding: 3,
  },
  deletePhotoButtonText: {
    color: 'white',
    fontSize: 12,
  },
  addPhotoButton: {
    backgroundColor: '#2ecc71', // Green color
    borderRadius: 10,
    padding: 10,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 100, // Match photo width for consistency
    height: 100, // Match photo height for consistency
  },
})

export default EditReportPage
