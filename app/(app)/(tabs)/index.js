import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { getStorage, ref, deleteObject } from 'firebase/storage'
import { firestore } from '@/firebaseConfig'
import ProjectCard from '@/components/ProjectCard'
import AddProjectModal from '@/components/AddProjectModal'
import ProjectDetailsModal from '@/components/ProjectDetailsModal'
import PhotoModal from '@/components/PhotoModal'
import { KeyboardToolbar } from 'react-native-keyboard-controller'
import { IconSymbol } from '@/components/ui/IconSymbol'

const Index = () => {
  const [modalVisible, setModalVisible] = useState(false)
  const [modalOptionsVisible, setModalOptionsVisible] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [projects, setProjects] = useState([])
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filteredProjects, setFilteredProjects] = useState([])
  const storage = getStorage()

  // Helper function: convert a Firebase download URL into a Storage path.
  // This is necessary because deleteObject() requires a reference path
  // like 'projectPhotos/1688253006242_file.jpg', not the download URL.
  const getFirebasePathFromUrl = downloadURL => {
    try {
      // After the "/o/", we have the encoded path.
      // Example: ".../o/projectPhotos%2Fsomefile.jpg?alt=media..."
      const pathSegment = downloadURL.split('/o/')[1]
      // Remove query params, e.g. "?alt=media&token=..."
      const noQuery = pathSegment.split('?')[0]
      // Decode "%2F" back to "/"
      return decodeURIComponent(noQuery)
    } catch (error) {
      console.error('Error parsing Storage path from URL:', downloadURL, error)
      return null
    }
  }

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, 'projects'),
      snapshot => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Assuming 'date' is stored as a Firebase Timestamp
          date: doc.data().date ? new Date(doc.data().date) : null,
        }))
        setProjects(projectsData)
        filterProjectsByDate(projectsData)
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
  }, []) // Empty dependency array since we fetch all projects once

  const filterProjectsByDate = projectsList => {
    if (!selectedDate) return setFilteredProjects(projectsList)

    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0) // Start of the selected day

    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999) // End of the selected day

    const filtered = projectsList.filter(project => {
      if (!project.createdAt) return false // Skip projects without a creation date

      const projectDate = project.createdAt.toDate() // Convert Timestamp to JavaScript Date

      return projectDate >= startOfDay && projectDate <= endOfDay
    })

    setFilteredProjects(filtered)
  }

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (date) {
      setSelectedDate(date)
      filterProjectsByDate(projects)
    }
  }

  const handleProjectPress = project => {
    setSelectedProject(project)
    setModalOptionsVisible(true)
  }

  const handleCreateProject = async projectData => {
    try {
      const docRef = await addDoc(collection(firestore, 'projects'), {
        ...projectData,
        createdAt: new Date(),
      })

      await updateDoc(docRef, { projectId: docRef.id })

      setModalVisible(false)
      Alert.alert('Success', 'Project created successfully.')
    } catch (error) {
      console.error('Error creating project:', error)
      Alert.alert('Error', 'Failed to create the project. Please try again.')
    }
  }

  const updateProject = useCallback(async (projectId, field, value) => {
    try {
      await updateDoc(doc(firestore, 'projects', projectId), { [field]: value })
      console.log('Project updated successfully')
      // No need to manually update state; onSnapshot will handle it
    } catch (error) {
      console.error('Error updating project:', error)
      Alert.alert('Error', 'Failed to update the project. Please try again.')
    }
  }, [])

  const handleDeleteProject = async () => {
    if (!selectedProject) return

    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this project and all its photos?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            try {
              // 1) If photos exist, delete them first
              if (selectedProject.photos && selectedProject.photos.length > 0) {
                const deletePromises = selectedProject.photos.map(
                  async photoURL => {
                    try {
                      const path = getFirebasePathFromUrl(photoURL)
                      if (path) {
                        const fileRef = ref(storage, path)
                        await deleteObject(fileRef)
                        console.log('Photo deleted:', photoURL)
                      }
                    } catch (err) {
                      console.error('Error deleting photo from Storage:', err)
                    }
                  }
                )
                await Promise.all(deletePromises)
              }

              // 2) Then delete the Firestore document
              await deleteDoc(doc(firestore, 'projects', selectedProject.id))
              Alert.alert(
                'Success',
                'Project and its photos have been deleted.'
              )

              // Clean up local state/UI
              setModalOptionsVisible(false)
              setSelectedProject(null)
              // If you're using onSnapshot or a similar listener, it should auto-update the list
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to delete the project: ' + error.message
              )
              console.error('Deletion error:', error)
            }
          },
        },
      ],
      { cancelable: false }
    )
  }

  return (
    <ImageBackground
      source={require('../../../assets/images/logo.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.datePickerContainer}>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
          >
            <Text style={styles.dateButtonText}>
              {selectedDate ? selectedDate.toDateString() : 'Select Date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>
        <ScrollView style={styles.scrollView}>
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onPress={() => handleProjectPress(project)}
            />
          ))}
        </ScrollView>

        <View style={styles.floatingButtonContainer}>
          <AddProjectModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            onCreateProject={handleCreateProject}
          />
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.floatingButton}
          >
            <IconSymbol name="plus" size={30} color="white" />
          </TouchableOpacity>
        </View>

        <ProjectDetailsModal
          visible={modalOptionsVisible}
          project={selectedProject}
          onClose={() => setModalOptionsVisible(false)}
          onUpdateProject={updateProject}
          onDeleteProject={handleDeleteProject}
          setSelectedPhoto={setSelectedPhoto}
          setModalOptionsVisible={setModalOptionsVisible}
          setSelectedProject={setSelectedProject}
          setProject={setSelectedProject}
        />

        <PhotoModal
          visible={selectedPhoto !== null}
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          setModalOptionsVisible={setModalOptionsVisible}
        />

        <KeyboardToolbar />
      </SafeAreaView>
    </ImageBackground>
  )
}

export default Index

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 16, paddingVertical: 8 },
  scrollView: { marginBottom: 80 },
  floatingButtonContainer: { position: 'absolute', bottom: 90, right: 24 },
  floatingButton: {
    backgroundColor: '#F39C12',
    borderRadius: 30,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  datePickerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dateButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 8,
  },
  dateButtonText: {
    color: 'white',
    fontSize: 16,
  },
})
