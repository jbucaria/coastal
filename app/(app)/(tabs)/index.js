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
} from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol' // Adjust the import path as needed
import { collection, addDoc, getDocs, onSnapshot } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { router } from 'expo-router'

const Index = () => {
  const [modalVisible, setModalVisible] = useState(false)
  const [newProject, setNewProject] = useState({
    address: '',
    inspectorName: '',
    jobType: '',
  })
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [modalOptionsVisible, setModalOptionsVisible] = useState(false)

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
        console.log('Projects updated:', projectsData)
      },
      error => {
        console.error('Error fetching projects:', error)
      }
    )

    return () => unsubscribe() // Clean up listener on unmount
  }, [])

  const openGoogleMaps = address => {
    const url = Platform.select({
      ios: `comgooglemaps://?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
    })

    // Check if Google Maps is installed (iOS)
    if (Platform.OS === 'ios') {
      Linking.canOpenURL('comgooglemaps://')
        .then(supported => {
          if (supported) {
            return Linking.openURL(url)
          } else {
            // If Google Maps is not installed, open in browser or use native Maps app
            console.log(
              'Google Maps not installed, opening in browser or default maps'
            )
            return Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                address
              )}`
            )
          }
        })
        .catch(err => console.error('An error occurred', err))
    } else {
      // For Android, it will open Google Maps by default if installed
      Linking.openURL(url).catch(err => console.error('An error occurred', err))
    }
  }

  const handleCreateProject = async () => {
    try {
      const docRef = await addDoc(collection(firestore, 'projects'), newProject)
      console.log('Project created with ID: ', docRef.id)
      // Add the new project to state (this will be redundant due to real-time updates but kept for safety)
      setProjects(prevProjects => [
        ...prevProjects,
        { id: docRef.id, ...newProject },
      ])
      setModalVisible(false)
      setNewProject({ address: '', inspectorName: '', jobType: '' })
    } catch (error) {
      console.error('Error creating project:', error)
    }
  }

  const handleProjectPress = project => {
    setSelectedProject(project)
    setModalOptionsVisible(true)
  }

  const handleInspection = () => {
    if (selectedProject) {
      router.push({
        pathname: '/inspection',
        params: {
          address: selectedProject.address,
          inspectorName: selectedProject.inspectorName, // Assuming this matches your Firebase user object field
          customer: selectedProject.customer || '', // If customer isn't defined, default to empty string
          reason: selectedProject.reason || '', // If reason isn't defined, default to empty string
        },
      })
      setModalOptionsVisible(false)
    }
  }

  return (
    <ImageBackground
      source={require('../../../assets/images/logo.png')}
      className="flex-1"
      resizeMode="cover"
    >
      <SafeAreaView className="flex-1">
        <View className="flex-row justify-center mt-10">
          <Link href={'/inspection'} className="mr-4">
            <View className="px-4 py-2 bg-[#2C3E50] rounded-full flex-row items-center">
              <IconSymbol
                name="folder.badge.plus"
                size={24}
                color="white"
                className="mr-2"
              />
              <Text className="mx-2 text-lg text-white">Inspection</Text>
            </View>
          </Link>
          <Link href={'/remediation'}>
            <View className="px-4 py-2 bg-[#2C3E50] rounded-full flex-row items-center">
              <IconSymbol
                name="folder.badge.plus"
                size={24}
                color="white"
                className="mr-2"
              />
              <Text className="mx-2 text-lg text-white">Remediation</Text>
            </View>
          </Link>
        </View>

        <ScrollView className="mb-20">
          {projects.map(project => (
            <TouchableOpacity
              key={project.id}
              onPress={() => handleProjectPress(project)}
              className="mb-2 p-2 bg-gray-800/50 rounded"
            >
              <Text className="text-white">{project.address}</Text>
              <Text className="text-white">
                Inspector: {project.inspectorName}
              </Text>
              <Text className="text-white">Job Type: {project.jobType}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Add Project Button */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="absolute bottom-28 right-10 bg-[#2ecc71] rounded-full p-4"
        >
          <IconSymbol name="plus" size={30} color="white" />
        </TouchableOpacity>

        {/* Modal for Project Creation */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white rounded-lg p-6 w-4/5">
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-4"
                placeholder="Address"
                value={newProject.address}
                onChangeText={text =>
                  setNewProject({ ...newProject, address: text })
                }
              />
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-4"
                placeholder="Customer"
                value={newProject.customer}
                onChangeText={text =>
                  setNewProject({ ...newProject, customer: text })
                }
              />
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-4"
                placeholder="Inspector Name"
                value={newProject.inspectorName}
                onChangeText={text =>
                  setNewProject({ ...newProject, inspectorName: text })
                }
              />
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-4"
                placeholder="Reason for Inspection"
                value={newProject.reason}
                onChangeText={text =>
                  setNewProject({ ...newProject, reason: text })
                }
              />
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded p-2 mb-4"
                placeholder="Type of Job"
                value={newProject.jobType}
                onChangeText={text =>
                  setNewProject({ ...newProject, jobType: text })
                }
              />
              <TouchableOpacity
                onPress={handleCreateProject}
                className="bg-[#2C3E50] rounded p-3 mb-2"
              >
                <Text className="text-white text-center">Create Project</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="bg-[#f44336] rounded p-3"
              >
                <Text className="text-white text-center">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal for Project Options */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalOptionsVisible}
          onRequestClose={() => setModalOptionsVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white rounded-lg p-6 w-4/5">
              <TouchableOpacity
                onPress={() => {
                  openGoogleMaps(selectedProject.address)
                  setModalOptionsVisible(false)
                }}
                className="mb-2"
              >
                <Text className="text-center text-blue-500">Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleInspection} className="mb-2">
                <Text className="text-center text-blue-500">Inspection</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalOptionsVisible(false)}>
                <Text className="text-center text-gray-500">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  )
}

export default Index
