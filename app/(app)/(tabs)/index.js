import React, { useState, useEffect } from 'react'
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
} from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol' // Adjust import path as needed
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
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
  const [projects, setProjects] = useState([])

  // ===== NEW STATE =====
  // For "Add Project" modal
  const [modalVisible, setModalVisible] = useState(false)
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
    photos: [], // Array of URIs
  })

  // For "Project Details" modal
  const [selectedProject, setSelectedProject] = useState(null)
  const [modalOptionsVisible, setModalOptionsVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  useEffect(() => {
    // Listen for real-time updates from Firestore
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
      }
    )

    return () => unsubscribe()
  }, [])

  // ============ OPEN MAPS ============
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
            // If Google Maps is not installed, open in browser
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

  // ============ CREATE PROJECT ============
  const handleCreateProject = async () => {
    // Format address from individual fields
    const formattedAddress = `${newProject.street}, ${newProject.city}, ${newProject.state} ${newProject.zip}`

    const projectData = {
      address: formattedAddress,
      street: newProject.street,
      city: newProject.city,
      state: newProject.state,
      zip: newProject.zip,
      customer: newProject.customer,
      contactName: newProject.contactName,
      contactNumber: newProject.contactNumber,
      inspectorName: newProject.inspectorName,
      reason: newProject.reason,
      jobType: newProject.jobType,
      photos: newProject.photos, // array of URIs
    }

    try {
      const docRef = await addDoc(
        collection(firestore, 'projects'),
        projectData
      )
      console.log('Project created with ID: ', docRef.id)

      setModalVisible(false)
      // Reset form
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
      })
    } catch (error) {
      console.error('Error creating project:', error)
    }
  }

  // ============ SELECT PROJECT ============
  const handleProjectPress = project => {
    setSelectedProject(project)
    setModalOptionsVisible(true)
  }

  // ============ DELETE PROJECT ============
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

              // Assuming 'photos' is an array of Firebase Storage URLs
              if (selectedProject.photos && selectedProject.photos.length > 0) {
                for (let photoURL of selectedProject.photos) {
                  // Parse the URL to get the path
                  let url = new URL(photoURL)
                  let path = decodeURIComponent(
                    url.pathname.substring(url.pathname.indexOf('/o/') + 3)
                  ) // Adjust path extraction based on URL format
                  path = path.split('?')[0] // Remove any query parameters

                  // Create a reference manually
                  const photoRef = ref(storage, path)
                  deletePromises.push(deleteObject(photoRef))
                }

                // Wait for all deletions to complete
                await Promise.all(deletePromises)
                console.log('All photos deleted successfully')
              }

              // Delete the project document from Firestore
              await deleteDoc(doc(firestore, 'projects', selectedProject.id))
              Alert.alert(
                'Success',
                'The report and all associated files have been deleted.'
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

  console.log('selectedProject:', selectedProject)
  // ============ INSPECTION ============
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
      },
    })
    setModalOptionsVisible(false)
  }

  // ============ ADD PHOTO ============
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
      const response = await fetch(result.assets[0].uri)
      const blob = await response.blob()
      const fileRef = ref(storage, `projectDetailPhotos/${Date.now()}.jpg`) // Unique filename
      const uploadTask = await uploadBytes(fileRef, blob)

      const downloadURL = await getDownloadURL(fileRef)

      // Update the project with the new URL
      setNewProject(prev => ({
        ...prev,
        photos: [...prev.photos, downloadURL],
      }))
    }
  }

  return (
    <ImageBackground
      source={require('../../../assets/images/logo.png')}
      className="flex-1"
      resizeMode="cover"
    >
      <SafeAreaView className="flex-1 px-4 py-2">
        {/* Project List */}
        <ScrollView className="mb-20 mx-1 mt-2">
          {projects.map(project => (
            <TouchableOpacity
              key={project.id}
              onPress={() => handleProjectPress(project)}
              className="mb-3 bg-[#1ABC9C]/90 rounded-lg p-3 shadow-md"
            >
              <Text className="text-white text-base font-bold">
                {project.address}
              </Text>
              <Text className="text-white text-sm">
                Inspector: {project.inspectorName || 'N/A'}
              </Text>
              <Text className="text-white text-sm">
                Job Type: {project.jobType || 'N/A'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Add Project Floating Button */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="absolute bottom-28 right-6 bg-[#F39C12] rounded-full p-4 shadow-lg"
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
          <View className="flex-1 justify-center items-center bg-black/50 px-4">
            <View className="bg-white w-full rounded-lg p-6 max-w-md">
              <Text className="text-xl font-bold mb-4 text-center text-[#2C3E50]">
                Create New Project
              </Text>

              {/* Street */}
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-2"
                placeholder="Street"
                value={newProject.street}
                onChangeText={text =>
                  setNewProject({ ...newProject, street: text })
                }
              />
              {/* City */}
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-2"
                placeholder="City"
                value={newProject.city}
                onChangeText={text =>
                  setNewProject({ ...newProject, city: text })
                }
              />
              {/* State */}
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-2"
                placeholder="State"
                value={newProject.state}
                onChangeText={text =>
                  setNewProject({ ...newProject, state: text })
                }
              />
              {/* Zip */}
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-2"
                placeholder="ZIP"
                value={newProject.zip}
                onChangeText={text =>
                  setNewProject({ ...newProject, zip: text })
                }
              />
              {/* Customer */}
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-2"
                placeholder="Customer"
                value={newProject.customer}
                onChangeText={text =>
                  setNewProject({ ...newProject, customer: text })
                }
              />
              {/* Customer */}
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-2"
                placeholder="Homeowner Name"
                value={newProject.contactName}
                onChangeText={text =>
                  setNewProject({ ...newProject, contactName: text })
                }
              />
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-2"
                placeholder="Homeowner Number"
                value={newProject.contactNumber}
                onChangeText={text =>
                  setNewProject({ ...newProject, contactNumber: text })
                }
              />
              {/* Inspector Name */}
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-2"
                placeholder="Inspector Name"
                value={newProject.inspectorName}
                onChangeText={text =>
                  setNewProject({ ...newProject, inspectorName: text })
                }
              />
              {/* Reason */}
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-2"
                placeholder="Reason for Inspection"
                value={newProject.reason}
                onChangeText={text =>
                  setNewProject({ ...newProject, reason: text })
                }
              />
              {/* Job Type */}
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-2"
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
                  className="my-2"
                >
                  {newProject.photos.map((uri, index) => (
                    <Image
                      key={index}
                      source={{ uri }}
                      className="w-16 h-16 rounded mr-2"
                    />
                  ))}
                </ScrollView>
              )}

              {/* Add Photo Button */}
              <TouchableOpacity
                onPress={handleAddPhoto}
                className="bg-[#1ABC9C] rounded p-3 mb-2"
              >
                <Text className="text-white text-center font-semibold">
                  Add Photo
                </Text>
              </TouchableOpacity>

              {/* CREATE & CANCEL */}
              <View className="flex-row justify-between mt-2">
                <TouchableOpacity
                  onPress={handleCreateProject}
                  className="bg-[#2C3E50] rounded p-3 flex-1 mr-2"
                >
                  <Text className="text-white text-center font-semibold">
                    Create
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="bg-[#f44336] rounded p-3 flex-1 ml-2"
                >
                  <Text className="text-white text-center font-semibold">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ======= Photo detail MODAL ======= */}

        <Modal
          animationType="fade"
          transparent={true}
          visible={selectedPhoto !== null}
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <View className="flex-1 justify-center items-center bg-black/80">
            <TouchableOpacity
              className="flex-1"
              onPress={() => {
                setSelectedPhoto(null)
                setModalOptionsVisible(true)
              }}
              activeOpacity={1}
            >
              {selectedPhoto ? (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator size="large" color="#0000ff" />
                  <Image
                    source={{ uri: selectedPhoto }}
                    className="flex-1"
                    style={{ width: '800%', height: '800%' }}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <Text className="text-white">Loading...</Text>
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
            <View className="flex-1 justify-center items-center bg-black/50 px-4">
              <View className="bg-white w-full rounded-lg p-6 max-w-md">
                <Text className="text-xl font-bold mb-2 text-center text-[#2C3E50]">
                  Project Details
                </Text>

                {/* Display project fields */}
                <Text className="text-base text-[#2C3E50] font-semibold">
                  Address:
                </Text>
                <Text className="mb-2">{selectedProject.address}</Text>

                <Text className="text-base text-[#2C3E50] font-semibold">
                  Customer:
                </Text>
                <Text className="mb-2">
                  {selectedProject.customer || 'N/A'}
                </Text>
                <Text className="text-base text-[#2C3E50] font-semibold">
                  Contact Name:
                </Text>
                <Text className="mb-2">
                  {selectedProject.contactName || 'N/A'}
                </Text>
                <Text className="text-base text-[#2C3E50] font-semibold">
                  Contact Number:
                </Text>
                <Text className="mb-2">
                  {selectedProject.contactNumber || 'N/A'}
                </Text>

                <Text className="text-base text-[#2C3E50] font-semibold">
                  Inspector:
                </Text>
                <Text className="mb-2">
                  {selectedProject.inspectorName || 'N/A'}
                </Text>

                <Text className="text-base text-[#2C3E50] font-semibold">
                  Reason:
                </Text>
                <Text className="mb-2">{selectedProject.reason || 'N/A'}</Text>

                <Text className="text-base text-[#2C3E50] font-semibold">
                  Job Type:
                </Text>
                <Text className="mb-2">{selectedProject.jobType || 'N/A'}</Text>

                {/* Photos */}
                {selectedProject.photos && selectedProject.photos.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="my-2"
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
                          className="w-20 h-20 rounded mr-2"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text className="italic text-gray-400 my-2">
                    No photos available
                  </Text>
                )}

                {/* Actions */}
                <View className="mt-4">
                  <TouchableOpacity
                    onPress={() => {
                      openGoogleMaps(selectedProject.address)
                      setModalOptionsVisible(false)
                    }}
                    className="mb-2 bg-[#1ABC9C] rounded p-3 shadow-sm"
                  >
                    <Text className="text-center text-white font-semibold">
                      Get Directions
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleInspection}
                    className="mb-2 bg-[#2C3E50] rounded p-3 shadow-sm"
                  >
                    <Text className="text-center text-white font-semibold">
                      Start Inspection
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleDeleteProject}
                    className="mb-2 bg-red-600 rounded p-3 shadow-sm"
                  >
                    <Text className="text-center text-white font-semibold">
                      Delete Project
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setModalOptionsVisible(false)}
                    className="rounded p-3 bg-gray-300 shadow-sm"
                  >
                    <Text className="text-center text-[#2C3E50] font-semibold">
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Modal>
        <KeyboardToolbar />
      </SafeAreaView>
    </ImageBackground>
  )
}

export default Index
