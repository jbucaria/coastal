// screens/Index.js

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native'
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import ProjectCard from '@/components/ProjectCard'
import AddProjectModal from '@/components/AddProjectModal'
import ProjectDetailsModal from '@/components/ProjectDetailsModal'
import PhotoModal from '@/components/PhotoModal'
import { KeyboardToolbar } from 'react-native-keyboard-controller'
import { IconSymbol } from '@/components/ui/IconSymbol'
import useProjectStore from '@/store/projectStore' // Ensure correct path

const Index = () => {
  const [modalVisible, setModalVisible] = useState(false)
  const [modalOptionsVisible, setModalOptionsVisible] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  const projects = useProjectStore(state => state.projects)
  const setProjects = useProjectStore(state => state.setProjects)

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
  }, [setProjects])

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
      console.log('Project created with ID:', docRef.id)
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
              // TODO: Delete photos from Firebase Storage if necessary
              await deleteDoc(doc(firestore, 'projects', selectedProject.id))
              Alert.alert('Success', 'The project has been deleted.')
              setModalOptionsVisible(false)
              setSelectedProject(null)
              // onSnapshot will automatically update the projects list
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
        <ScrollView style={styles.scrollView}>
          {projects.map(project => (
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
})
