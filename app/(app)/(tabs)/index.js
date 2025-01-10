import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'expo-router'
import {
  View,
  Text,
  ImageBackground,
  Modal,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
  Linking,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  StyleSheet,
  Switch,
} from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol' // Adjust import path as needed
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  refFromURL,
} from 'firebase/storage'
import { firestore } from '@/firebaseConfig'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { KeyboardToolbar } from 'react-native-keyboard-controller'

const Index = () => {
  const [modalVisible, setModalVisible] = useState(false)
  const [modalOptionsVisible, setModalOptionsVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [projects, setProjects] = useState([])

  // Local state for form inputs
  const [newProject, setNewProject] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    customer: '',
    contactName: '',
    contactNumber: '',
    inspectorName: '',
    reason: '',
    jobType: '',
    photos: [],
    remediationRequired: false,
    equipmentOnSite: false,
    siteComplete: false,
  })

  // Effect for fetching projects from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, 'projects'),
      snapshot => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        setProjects(projectsData)
      },
      error => {
        console.error('Error fetching projects:', error)
        Alert.alert(
          'Error',
          'Could not fetch projects. Please try again later.'
        )
      }
    )

    return () => unsubscribe()
  }, [])

  // Listen for changes in the selected project
  useEffect(() => {
    if (selectedProjectId) {
      const unsubscribeProject = onSnapshot(
        doc(firestore, 'projects', selectedProjectId),
        doc => {
          if (doc.exists()) {
            setSelectedProject({ ...doc.data(), id: doc.id })
          }
        }
      )

      return () => unsubscribeProject()
    }
  }, [selectedProjectId])

  // Update project in Firestore
  const updateProject = useCallback(async (projectId, field, value) => {
    try {
      await updateDoc(doc(firestore, 'projects', projectId), { [field]: value })
      console.log('Project updated successfully')
    } catch (error) {
      console.error('Error updating project:', error)
      Alert.alert('Error', 'Failed to update the project. Please try again.')
    }
  }, [])

  // Create project function
  const handleCreateProject = async () => {
    // Format address from individual fields
    const formattedAddress = `${newProject.street}, ${newProject.city}, ${newProject.state} ${newProject.zip}`

    const projectData = {
      address: formattedAddress,
      ...newProject,
      createdAt: new Date(),
    }

    try {
      const docRef = await addDoc(
        collection(firestore, 'projects'),
        projectData
      )
      console.log('Project created with ID: ', docRef.id)
      setModalVisible(false)
      setNewProject({
        street: '',
        city: '',
        state: '',
        zip: '',
        customer: '',
        contactName: '',
        contactNumber: '',
        inspectorName: '',
        reason: '',
        jobType: '',
        photos: [],
        remediationRequired: false,
        equipmentOnSite: false,
        siteComplete: false,
      })
      Alert.alert('Success', 'Project created successfully.')
    } catch (error) {
      console.error('Error creating project:', error)
      Alert.alert('Error', 'Failed to create the project. Please try again.')
    }
  }

  // Function to open Google Maps
  const openGoogleMaps = address => {
    const url = Platform.select({
      ios: `comgooglemaps://?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
    })

    if (Platform.OS === 'ios') {
      Linking.canOpenURL('comgooglemaps://')
        .then(supported => {
          if (supported) {
            return Linking.openURL(url)
          } else {
            console.log('Google Maps not installed, opening in browser')
            return Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                address
              )}`
            )
          }
        })
        .catch(err => console.error('An error occurred', err))
    } else {
      Linking.openURL(url).catch(err => console.error('An error occurred', err))
    }
  }

  // Handle selecting a project
  const handleProjectPress = project => {
    setSelectedProject(project)
    setSelectedProjectId(project.id)
    setModalOptionsVisible(true)
  }

  // Handle deleting a project
  const handleDeleteProject = async () => {
    if (!selectedProject) return
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this project and all its photos?',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Deletion cancelled'),
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            try {
              const storage = getStorage()
              const deletePromises = []
              if (selectedProject.photos && selectedProject.photos.length > 0) {
                for (let photoURL of selectedProject.photos) {
                  try {
                    const photoRef = refFromURL(storage, photoURL)
                    deletePromises.push(deleteObject(photoRef))
                  } catch (error) {
                    console.warn('Failed to delete photo:', photoURL, error)
                  }
                }
              }

              await Promise.all(deletePromises)
              console.log('All photos deleted successfully')

              await deleteDoc(doc(firestore, 'projects', selectedProject.id))
              Alert.alert(
                'Success',
                'The project and all associated photos have been deleted.'
              )
              setModalOptionsVisible(false)
              console.log('Project deleted successfully')
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to delete the project or its photos: ' + error.message
              )
              console.error('Deletion error:', error)
            }
          },
        },
      ],
      { cancelable: false }
    )
  }

  // Handle inspection
  const handleInspection = () => {
    if (!selectedProject) return
    router.push({
      pathname: '/inspection',
      params: {
        address: selectedProject.address,
        inspectorName: selectedProject.inspectorName || '',
        customer: selectedProject.customer || '',
        contactName: selectedProject.contactName || '',
        contactNumber: selectedProject.contactNumber || '',
        reason: selectedProject.reason || '',
        remediationRequired: selectedProject.remediationRequired || false,
      },
    })
    setModalOptionsVisible(false)
  }

  // Handle add photo
  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera roll permissions are needed to add photos.'
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.7,
    })

    if (!result.canceled && result.assets?.[0]?.uri) {
      const storage = getStorage()
      const uploadPromises = result.assets.map(async asset => {
        const response = await fetch(asset.uri)
        const blob = await response.blob()
        const fileRef = ref(
          storage,
          `projectDetailPhotos/${Date.now()}_${asset.filename}`
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
  }
  return (
    <ImageBackground
      source={require('../../../assets/images/logo.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Project List */}
        <ScrollView style={styles.scrollView}>
          {projects.map(project => (
            <TouchableOpacity
              key={project.id}
              onPress={() => {
                handleProjectPress(project)
              }}
              style={[
                styles.projectCard,
                {
                  backgroundColor: project.remediationRequired
                    ? '#FFD700'
                    : '#1ABC9C',
                },
              ]}
            >
              <View style={styles.cardContent}>
                <Text style={styles.projectAddress}>{project.address}</Text>
                <View style={styles.inspectorRow}>
                  <Text style={styles.inspectorName}>
                    Inspector: {project.inspectorName || 'N/A'}
                  </Text>
                  {project.remediationRequired && (
                    <Text style={styles.remediationIndicator}> R</Text>
                  )}
                  {project.equipmentOnSite && (
                    <Text style={styles.remediationIndicator}> E</Text>
                  )}
                  {project.siteComplete && (
                    <Text style={styles.remediationIndicator}> C</Text>
                  )}
                </View>
                <Text style={styles.jobType}>
                  Job Type: {project.jobType || 'N/A'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Add Project Floating Button */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.floatingButton}
        >
          <IconSymbol name="plus" size={30} color="white" />
        </TouchableOpacity>

        {/* ======= ADD PROJECT MODAL ======= */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
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
                      style={[styles.modalButton, styles.createButton]}
                    >
                      <Text style={styles.modalButtonText}>Create</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setModalVisible(false)}
                      style={[styles.modalButton, styles.cancelButton]}
                    >
                      <Text style={styles.modalButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </SafeAreaView>
            </View>
          </SafeAreaView>
        </Modal>

        {/* ======= Photo detail MODAL ======= */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={selectedPhoto !== null}
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <View style={styles.photoModalBackground}>
            <TouchableOpacity
              style={styles.photoModalTouchable}
              onPress={() => {
                setSelectedPhoto(null)
                setModalOptionsVisible(true)
              }}
              activeOpacity={1}
            >
              {selectedPhoto ? (
                <View style={styles.photoModalContent}>
                  <ActivityIndicator size="large" color="#0000ff" />
                  <Image
                    source={{ uri: selectedPhoto }}
                    style={styles.fullPhoto}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <Text style={styles.photoLoadingText}>Loading...</Text>
              )}
            </TouchableOpacity>
          </View>
        </Modal>

        {/* ======= PROJECT DETAILS & OPTIONS MODAL ======= */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalOptionsVisible}
          onRequestClose={() => setModalOptionsVisible(false)}
        >
          {selectedProject && (
            <SafeAreaView style={styles.modalOverlay}>
              <View style={styles.modalBackground}>
                <SafeAreaView style={styles.fullWidthModal}>
                  <ScrollView
                    style={styles.modalContent}
                    contentContainerStyle={styles.modalContainer}
                  >
                    <Text style={styles.projectModalTitle}>
                      Project Details
                    </Text>

                    {/* Display project fields */}
                    <Text style={styles.projectFieldLabel}>Address:</Text>
                    <Text style={styles.projectFieldValue}>
                      {selectedProject.address}
                    </Text>

                    <Text style={styles.projectFieldLabel}>Customer:</Text>
                    <Text style={styles.projectFieldValue}>
                      {selectedProject.customer || 'N/A'}
                    </Text>

                    <Text style={styles.projectFieldLabel}>Contact Name:</Text>
                    <Text style={styles.projectFieldValue}>
                      {selectedProject.contactName || 'N/A'}
                    </Text>

                    <Text style={styles.projectFieldLabel}>
                      Contact Number:
                    </Text>
                    <Text style={styles.projectFieldValue}>
                      {selectedProject.contactNumber || 'N/A'}
                    </Text>

                    <Text style={styles.projectFieldLabel}>Inspector:</Text>
                    <View style={styles.inspectorRowModal}>
                      <Text style={styles.projectFieldValue}>
                        {selectedProject.inspectorName || 'N/A'}
                      </Text>
                      {selectedProject.remediationRequired && (
                        <Text style={styles.remediationIndicatorModal}> R</Text>
                      )}
                    </View>

                    <Text style={styles.projectFieldLabel}>Reason:</Text>
                    <Text style={styles.projectFieldValue}>
                      {selectedProject.reason || 'N/A'}
                    </Text>

                    <Text style={styles.projectFieldLabel}>Job Type:</Text>
                    <Text style={styles.projectFieldValue}>
                      {selectedProject.jobType || 'N/A'}
                    </Text>

                    {/* ====== Remediation Required Checkbox ====== */}
                    <View style={styles.checkboxContainer}>
                      <Switch
                        value={selectedProject?.remediationRequired || false}
                        onValueChange={value =>
                          updateProject(
                            selectedProject.id,
                            'remediationRequired',
                            value
                          )
                        }
                      />
                      <Text style={styles.checkboxLabel}>
                        Remediation Required
                      </Text>
                    </View>
                    <View style={styles.checkboxContainer}>
                      <Switch
                        value={selectedProject?.equipmentOnSite || false}
                        onValueChange={value =>
                          updateProject(
                            selectedProject.id,
                            'equipmentOnSite',
                            value
                          )
                        }
                      />
                      <Text style={styles.checkboxLabel}>
                        Equipment On Site
                      </Text>
                    </View>
                    <View style={styles.checkboxContainer}>
                      <Switch
                        value={selectedProject.siteComplete || false}
                        onValueChange={value =>
                          updateProject(
                            selectedProject.id,
                            'siteComplete',
                            value
                          )
                        }
                      />
                      <Text style={styles.checkboxLabel}>Site Complete</Text>
                    </View>

                    {/* Photos */}
                    {selectedProject.photos &&
                    selectedProject.photos.length > 0 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.projectPhotos}
                      >
                        {selectedProject.photos.map((uri, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => {
                              setSelectedPhoto(uri)
                              setModalOptionsVisible(false)
                            }}
                          >
                            <Image
                              source={{ uri }}
                              style={styles.projectPhoto}
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <Text style={styles.noPhotosText}>
                        No photos available
                      </Text>
                    )}

                    {/* Actions */}
                    <View style={styles.projectActionsContainer}>
                      <TouchableOpacity
                        onPress={() => {
                          openGoogleMaps(selectedProject.address)
                          setModalOptionsVisible(false)
                        }}
                        style={styles.actionButton}
                      >
                        <Text style={styles.actionButtonText}>
                          Get Directions
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleInspection}
                        style={styles.actionButton}
                      >
                        <Text style={styles.actionButtonText}>
                          Start Inspection
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleDeleteProject}
                        style={[styles.actionButton, styles.deleteButton]}
                      >
                        <Text style={styles.actionButtonText}>
                          Delete Project
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setModalOptionsVisible(false)}
                        style={[styles.actionButton, styles.closeButton]}
                      >
                        <Text style={styles.actionButtonText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </SafeAreaView>
              </View>
            </SafeAreaView>
          )}
        </Modal>
        <KeyboardToolbar />
      </SafeAreaView>
    </ImageBackground>
  )
}

export default Index

// ======= Styles =======
const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scrollView: {
    marginBottom: 80, // Adjust based on floating button position
  },
  projectCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    marginTop: 3,
    // Background color is set dynamically
  },
  cardContent: {
    // Additional styling if needed
  },
  projectAddress: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inspectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  inspectorName: {
    color: 'white',
    fontSize: 14,
  },
  remediationIndicator: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  jobType: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    backgroundColor: '#F39C12',
    borderRadius: 30,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    padding: 20, // Adjust padding as needed
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2C3E50',
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
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  photoModalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  photoModalTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPhoto: {
    width: '90%',
    height: '90%',
  },
  photoLoadingText: {
    color: 'white',
    fontSize: 18,
  },
  projectModalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  projectModalContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  projectModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#2C3E50',
  },
  projectFieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 8,
  },
  projectFieldValue: {
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 8,
  },
  inspectorRowModal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  remediationIndicatorModal: {
    color: 'red',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  projectPhotos: {
    marginTop: 12,
    marginBottom: 12,
  },
  projectPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  noPhotosText: {
    fontStyle: 'italic',
    color: '#888',
    marginTop: 8,
  },
  projectActionsContainer: {
    marginTop: 16,
  },
  actionButton: {
    backgroundColor: '#2C3E50',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  closeButton: {
    backgroundColor: '#7f8c8d',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
