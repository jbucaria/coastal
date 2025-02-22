'use client'

import React, { useState, useEffect } from 'react'
import { useLocalSearchParams, router } from 'expo-router'
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Image,
} from 'react-native'
import {
  KeyboardToolbar,
  KeyboardAwareScrollView,
} from 'react-native-keyboard-controller'
import {
  getDownloadURL,
  ref,
  uploadBytes,
  deleteObject,
} from 'firebase/storage'
import * as ImagePicker from 'expo-image-picker'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { firestore, storage } from '@/firebaseConfig'

import { ThemedText } from '@/components/ui/ThemedText'
import { useThemeColor } from '@/hooks/useThemeColor'
import { IconSymbol } from '@/components/ui/IconSymbol'

const EditReportPage = () => {
  const params = useLocalSearchParams()
  const projectId = params.projectId
  const [project, setProject] = useState(null)
  const [report, setReport] = useState(null)
  const [editedReport, setEditedReport] = useState({})
  const [photos, setPhotos] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const backgroundColor = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')

  useEffect(() => {
    const fetchProjectAndReport = async () => {
      console.log('projectId:', projectId)
      try {
        const projectRef = doc(firestore, 'tickets', projectId)
        const projectSnap = await getDoc(projectRef)
        if (projectSnap.exists()) {
          setProject({ id: projectSnap.id, ...projectSnap.data() })

          const reportData = projectSnap.data().report || projectSnap.data()
          setReport(reportData)
          setEditedReport({ ...reportData })
          // Ensure photos have uri or downloadURL
          setPhotos(
            (reportData.photos || []).map(photo => ({
              uri: photo.uri || photo.downloadURL,
            }))
          )
        } else {
          console.log('No such project!')
          Alert.alert('Error', 'Project not found')
        }
      } catch (error) {
        console.error('Error fetching project and report:', error)
        Alert.alert(
          'Error',
          'Could not fetch project or report. Please try again later.'
        )
      }
    }

    fetchProjectAndReport()
  }, [projectId])

  if (Object.keys(editedReport).length === 0) {
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
      // Check if the photo has already been added (by comparing URIs)
      const newPhotoUri = result.assets[0].uri
      if (
        !photos.some(
          photo =>
            photo.uri === newPhotoUri || photo.downloadURL === newPhotoUri
        )
      ) {
        setPhotos([...photos, { uri: newPhotoUri }])
      } else {
        Alert.alert('Duplicate Photo', 'This photo has already been added.')
      }
    }
  }

  const handleSaveEdit = async () => {
    setIsSaving(true)
    setUploadProgress(0)
    try {
      const projectRef = doc(firestore, 'projects', projectId)

      const newPhotos = []
      for (const photo of photos) {
        if (photo.uri && !photo.downloadURL) {
          try {
            const filename = `projects/${projectId}/${Date.now()}-${Math.random()
              .toString(36)
              .substring(7)}.jpg`
            const storageRef = ref(storage, filename)

            // Attempt to get the download URL; if it fails, upload the photo
            await getDownloadURL(storageRef).catch(async () => {
              const response = await fetch(photo.uri)
              const blob = await response.blob()
              await uploadBytes(storageRef, blob)
              const downloadURL = await getDownloadURL(storageRef)
              newPhotos.push({ uri: downloadURL })
            })
          } catch (error) {
            console.error('Error uploading photo:', error)
          }
        } else {
          // If photo already has a downloadURL, it's already in storage, so we just use that
          newPhotos.push({ uri: photo.downloadURL })
        }
      }

      // Update Firestore document
      await updateDoc(projectRef, {
        ...editedReport,
        photos: newPhotos, // Use newPhotos which now contains only the correct URIs or downloadURLs
      })

      Alert.alert('Success', 'Project has been updated')
    } catch (error) {
      console.error('Error updating project:', error)
      Alert.alert('Error', 'Failed to update the project. Please try again.')
    } finally {
      setIsSaving(false)
      setUploadProgress(0)
      router.back()
    }
  }

  const handleRemovePhoto = async index => {
    const photoToRemove = photos[index]
    if (photoToRemove.uri) {
      try {
        let storagePath

        // Extract the path from the URI
        const url = new URL(photoToRemove.uri)
        storagePath = decodeURIComponent(
          url.pathname.substring(url.pathname.indexOf('/o/') + 3)
        ).split('?')[0] // Extract path and remove query parameters

        const storageRef = ref(storage, storagePath)
        await deleteObject(storageRef)
        console.log('Photo deleted from storage:', storagePath)

        // Remove from local state
        const updatedPhotos = [...photos]
        updatedPhotos.splice(index, 1)
        setPhotos(updatedPhotos)

        // Update Firestore to reflect the removal
        const projectRef = doc(firestore, 'projects', projectId)
        await updateDoc(projectRef, {
          photos: updatedPhotos.map(p => ({ uri: p.uri || p.downloadURL })),
        })
      } catch (error) {
        console.error('Error removing photo:', error)
        Alert.alert('Error', 'Failed to remove the photo. Please try again.')
        // If deletion from storage fails, still remove from local state to avoid inconsistency
        const updatedPhotos = [...photos]
        updatedPhotos.splice(index, 1)
        setPhotos(updatedPhotos)
      }
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

          {/* Date */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Date of Inspection
          </ThemedText>
          <TextInput
            value={editedReport.date}
            onChangeText={text => handleFieldChange('date', text)}
            placeholder="Date"
            style={styles.editInput}
          />

          {/* Reason for Inspection */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Reason for Inspection
          </ThemedText>
          <TextInput
            value={editedReport.reason}
            onChangeText={text => handleFieldChange('reason', text)}
            placeholder="Reason"
            style={styles.editInput}
            multiline
          />

          {/* Inspector's Name */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Inspector's Name
          </ThemedText>
          <TextInput
            value={editedReport.inspectorName}
            onChangeText={text => handleFieldChange('inspectorName', text)}
            placeholder="Inspector's Name"
            style={styles.editInput}
          />

          {/* Hours to Complete Inspection */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Hours to Complete Inspection
          </ThemedText>
          <TextInput
            value={editedReport.hours}
            onChangeText={text => handleFieldChange('hours', text)}
            placeholder="Hours"
            style={styles.editInput}
            keyboardType="numeric"
          />

          {/* Inspection Results */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Inspection Results
          </ThemedText>
          <TextInput
            value={editedReport.inspectionResults}
            onChangeText={text => handleFieldChange('inspectionResults', text)}
            placeholder="Inspection Results"
            style={[styles.editInput, styles.multilineInput]}
            multiline
          />

          {/* Recommended Actions */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recommended Actions
          </ThemedText>
          <TextInput
            value={editedReport.recommendedActions}
            onChangeText={text => handleFieldChange('recommendedActions', text)}
            placeholder="Recommended Actions"
            style={[styles.editInput, styles.multilineInput]}
            multiline
          />

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Photos
          </ThemedText>
          <View style={styles.photoContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.deletePhotoButton}
                  onPress={() => handleRemovePhoto(index)}
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

export default EditReportPage

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 96,
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
    borderRadius: 50,
    padding: 3,
  },
  deletePhotoButtonText: {
    color: 'white',
    fontSize: 12,
  },
  addPhotoButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 10,
    padding: 10,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
})
