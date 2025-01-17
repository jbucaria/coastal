import React, { useState, useCallback, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage, firestore } from '@/firebaseConfig'
import { initializeApp } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'
import * as ImagePicker from 'expo-image-picker'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import 'react-native-get-random-values'

const AddProjectModal = ({
  visible,
  onClose,
  onCreateProject,
  googleApiKey,
}) => {
  const [newProject, setNewProject] = useState({
    street: '',
    apt: '',
    city: '',
    state: '',
    zip: '',
    customer: 'DR Horton',
    customerName: 'John Doe',
    customerNumber: '727-555-1234',
    homeOwnerName: 'Jane Doe',
    homeOwnerNumber: '727-555-5678',
    inspectorName: 'John N. Doe',
    reason: 'leak in garage',
    jobType: 'inspection',
    hours: '',
    recommendedActions: '',
    photos: [],
    onSite: false,
    inspectionComplete: false,
    remediationRequired: false,
    equipmentOnSite: false,
    siteComplete: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // useEffect(() => {
  //   console.log('Updated newProject:', newProject)
  // }, [newProject])

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
      setNewProject(prev => ({
        ...prev,
        street: parsed.street,
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip,
      }))
    } else {
      console.log('No details returned:', data)
      setNewProject(prev => ({
        ...prev,
        street: data.description,
      }))
    }
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
      const storage = getStorage()
      const uploadPromises = result.assets.map(async asset => {
        const response = await fetch(asset.uri)
        const blob = await response.blob()
        const fileRef = ref(
          storage,
          `projectPhotos/${Date.now()}_${asset.fileName}`
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

      const formattedNumber =
        newProject.customerNumber ||
        newProject.homeOwnerNumber
          .replace(/\D/g, '')
          .replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')

      const composedAddress = `${newProject.street}${
        newProject.apt ? ' Apt ' + newProject.apt : ''
      }, ${newProject.city}, ${newProject.state} ${newProject.zip}`

      const projectData = {
        ...newProject,
        contactNumber: formattedNumber,
        address: composedAddress,
        createdAt: new Date(),
      }

      await onCreateProject(projectData)

      Alert.alert('Success', 'Project created successfully.')
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
      <View style={styles.modalBackground}>
        <SafeAreaView style={styles.fullWidthModal}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalContent}
          >
            <GooglePlacesAutocomplete
              ref={ref}
              filterReverseGeocodingByTypes={['locality']}
              debounce={500}
              disableScroll={true}
              placeholder="Enter address"
              onPress={handleAutocompletePress}
              query={{
                key: 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs', // Replace with your API key
                language: 'en',
                components: 'country:us',
              }}
              fetchDetails={true}
              styles={{
                textInputContainer: styles.autocompleteContainer,
                textInput: styles.modalInput,
                listView: {
                  backgroundColor: 'white',
                  maxHeight: 200,
                  elevation: 5,
                  zIndex: 5,
                },
              }}
            />
            <Text style={styles.modalTitle}>Create New Project</Text>

            {/* SECTION: Address Fields */}
            <Text style={styles.sectionTitle}>Address</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Street"
              value={newProject.street}
              onChangeText={text =>
                setNewProject({ ...newProject, street: text })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Apt # (optional)"
              value={newProject.apt}
              onChangeText={text => setNewProject({ ...newProject, apt: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="City"
              value={newProject.city}
              onChangeText={text =>
                setNewProject({ ...newProject, city: text })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="State"
              value={newProject.state}
              onChangeText={text =>
                setNewProject({ ...newProject, state: text })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="ZIP"
              value={newProject.zip}
              onChangeText={text => setNewProject({ ...newProject, zip: text })}
              keyboardType="numeric"
            />

            {/* SECTION: Customer Info */}
            <Text style={styles.sectionTitle}>Customer Info</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Company / Customer Name"
              value={newProject.customer}
              onChangeText={text =>
                setNewProject({ ...newProject, customer: text })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Customer Contact Name"
              value={newProject.customerName}
              onChangeText={text =>
                setNewProject({ ...newProject, customerName: text })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Customer Contact Number"
              value={newProject.customerNumber}
              onChangeText={text =>
                setNewProject({ ...newProject, customerNumber: text })
              }
              keyboardType="phone-pad"
            />

            {/* SECTION: Homeowner Info */}
            <Text style={styles.sectionTitle}>Homeowner Info</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Homeowner Name"
              value={newProject.homeOwnerName}
              onChangeText={text =>
                setNewProject({ ...newProject, homeOwnerName: text })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Homeowner Number"
              value={newProject.homeOwnerNumber}
              onChangeText={text =>
                setNewProject({ ...newProject, homeOwnerNumber: text })
              }
              keyboardType="phone-pad"
            />

            {/* SECTION: Project Details */}
            <Text style={styles.sectionTitle}>Project Details</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Inspector Name"
              value={newProject.inspectorName}
              onChangeText={text =>
                setNewProject({ ...newProject, inspectorName: text })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for Inspection"
              value={newProject.reason}
              onChangeText={text =>
                setNewProject({ ...newProject, reason: text })
              }
            />
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
              <View style={styles.photosPreview}>
                {newProject.photos.map((uri, index) => (
                  <Image
                    key={index}
                    source={{ uri }}
                    style={styles.photoThumbnail}
                  />
                ))}
              </View>
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
    </Modal>
  )
}

const styles = StyleSheet.create({
  autocompleteContainer: {
    width: '100%',
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidthModal: {
    flex: 1,
    width: '100%',
    maxHeight: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalContent: {
    flexGrow: 1,
    padding: 20, // Padding inside ScrollView content
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginVertical: 8,
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
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  photoThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
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
