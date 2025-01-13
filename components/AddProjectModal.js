// components/AddProjectModal.js

import React, { useState, useCallback } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import * as ImagePicker from 'expo-image-picker'

const AddProjectModal = ({ visible, onClose, onCreateProject }) => {
  const [newProject, setNewProject] = useState({
    street: '',
    city: 'Tampa',
    state: 'FL',
    zip: '34665',
    customer: 'DR Horton',
    contactName: 'John Doe',
    contactNumber: '727-555-1234',
    inspectorName: 'John N. Doe',
    reason: ' leak in garage',
    jobType: 'inspection',
    inspectinResults: '',
    hours: '',
    recommendedActions: '',
    photos: [],
    inspectionComplete: false,
    remediationRequired: false,
    equipmentOnSite: false,
    siteComplete: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    })

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const storage = getStorage()
      const uploadPromises = result.assets.map(async asset => {
        const response = await fetch(asset.uri)
        const blob = await response.blob()
        const fileRef = ref(
          storage,
          `projectPhotos/${Date.now()}_${asset.fileName}` // Ensure 'fileName' is correct
        )
        await uploadBytes(fileRef, blob)
        const downloadURL = await getDownloadURL(fileRef)
        return downloadURL
      })

      try {
        const newPhotoURLs = await Promise.all(uploadPromises)
        setNewProject(prev => ({
          ...prev,
          photos: [...prev.photos, ...newPhotoURLs],
        }))
        Alert.alert('Success', 'Photos added successfully.')
      } catch (error) {
        console.error('Error uploading photos:', error)
        Alert.alert('Error', 'Failed to upload photos. Please try again.')
      }
    } else {
      Alert.alert('No Selection', 'You did not select any image.')
    }
  }, [])

  const handleCreateProject = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      // Basic Validation (Optional but Recommended)
      if (
        !newProject.street ||
        !newProject.city ||
        !newProject.state ||
        !newProject.zip ||
        !newProject.customer
      ) {
        Alert.alert('Validation Error', 'Please fill out all required fields.')
        setIsSubmitting(false)
        return
      }

      // Format phone number
      const formattedNumber = newProject.contactNumber
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')

      const projectData = {
        ...newProject,
        contactNumber: formattedNumber, // Save formatted number
        address: `${newProject.street}, ${newProject.city}, ${newProject.state} ${newProject.zip}`,
        createdAt: new Date(),
      }

      // Pass the project data to the parent component
      await onCreateProject(projectData)

      Alert.alert('Success', 'Project created successfully.')

      // Close the modal
      onClose()
    } catch (error) {
      console.error('Error creating project:', error)
      Alert.alert('Error', 'Failed to create the project. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalBackground}>
          <SafeAreaView style={styles.fullWidthModal}>
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContainer}
            >
              <Text style={styles.modalTitle}>Create New Project</Text>

              {/* Street */}
              <TextInput
                style={styles.modalInput}
                placeholder="Street"
                value={newProject.street}
                onChangeText={text =>
                  setNewProject({ ...newProject, street: text })
                }
              />
              {/* City */}
              <TextInput
                style={styles.modalInput}
                placeholder="City"
                value={newProject.city}
                onChangeText={text =>
                  setNewProject({ ...newProject, city: text })
                }
              />
              {/* State */}
              <TextInput
                style={styles.modalInput}
                placeholder="State"
                value={newProject.state}
                onChangeText={text =>
                  setNewProject({ ...newProject, state: text })
                }
              />
              {/* Zip */}
              <TextInput
                style={styles.modalInput}
                placeholder="ZIP"
                value={newProject.zip}
                onChangeText={text =>
                  setNewProject({ ...newProject, zip: text })
                }
                keyboardType="numeric"
              />
              {/* Customer */}
              <TextInput
                style={styles.modalInput}
                placeholder="Customer"
                value={newProject.customer}
                onChangeText={text =>
                  setNewProject({ ...newProject, customer: text })
                }
              />
              {/* Homeowner Name */}
              <TextInput
                style={styles.modalInput}
                placeholder="Homeowner Name"
                value={newProject.contactName}
                onChangeText={text =>
                  setNewProject({ ...newProject, contactName: text })
                }
              />
              {/* Homeowner Number */}
              <TextInput
                style={styles.modalInput}
                placeholder="Homeowner Number"
                value={newProject.contactNumber}
                onChangeText={text =>
                  setNewProject({ ...newProject, contactNumber: text })
                }
                keyboardType="phone-pad"
              />
              {/* Inspector Name */}
              <TextInput
                style={styles.modalInput}
                placeholder="Inspector Name"
                value={newProject.inspectorName}
                onChangeText={text =>
                  setNewProject({ ...newProject, inspectorName: text })
                }
              />
              {/* Reason */}
              <TextInput
                style={styles.modalInput}
                placeholder="Reason for Inspection"
                value={newProject.reason}
                onChangeText={text =>
                  setNewProject({ ...newProject, reason: text })
                }
              />
              {/* Job Type */}
              <TextInput
                style={styles.modalInput}
                placeholder="Type of Job"
                value={newProject.jobType}
                onChangeText={text =>
                  setNewProject({ ...newProject, jobType: text })
                }
              />

              {/* PHOTOS PREVIEW */}
              {newProject.photos.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.photosPreview}
                >
                  {newProject.photos.map((uri, index) => (
                    <Image
                      key={index}
                      source={{ uri }}
                      style={styles.photoThumbnail}
                    />
                  ))}
                </ScrollView>
              )}

              {/* Add Photo Button */}
              <TouchableOpacity
                onPress={handleAddPhoto}
                style={styles.addPhotoButton}
              >
                <Text style={styles.addPhotoButtonText}>Add Photo</Text>
              </TouchableOpacity>

              {/* CREATE & CANCEL Buttons */}
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  onPress={handleCreateProject}
                  style={[
                    styles.modalButton,
                    styles.createButton,
                    isSubmitting && styles.disabledButton,
                  ]}
                  disabled={isSubmitting}
                >
                  <Text style={styles.modalButtonText}>
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.modalButton, styles.cancelButton]}
                  disabled={isSubmitting}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    padding: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#2C3E50',
  },
  fullWidthModal: {
    flex: 1,
    width: '100%',
  },
  modalContent: {
    flexGrow: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  modalInput: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  photosPreview: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  photoThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 8,
  },
  addPhotoButton: {
    backgroundColor: '#1ABC9C',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  addPhotoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  createButton: {
    backgroundColor: '#2C3E50',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default AddProjectModal
