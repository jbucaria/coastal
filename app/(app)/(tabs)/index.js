import React, { useState, useEffect } from 'react'
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
} from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
} from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { router } from 'expo-router'

const Index = () => {
  const [modalVisible, setModalVisible] = useState(false)
  const [newProject, setNewProject] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    inspectorName: '',
    reason: '',
    customer: '',
    photos: [],
  })
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [modalOptionsVisible, setModalOptionsVisible] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, 'projects'),
      snapshot => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      },
      error => {
        console.error('Error fetching projects:', error)
      }
    )

    return () => unsubscribe()
  }, [])

  const openGoogleMaps = address => {
    // Google Maps opening logic remains the same
  }

  const handleCreateProject = async () => {
    const fullAddress = `${newProject.street}, ${newProject.city}, ${newProject.state} ${newProject.zip}`
    const projectData = { ...newProject, address: fullAddress }

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
        inspectorName: '',
        reason: '',
        photos: [],
      })
    } catch (error) {
      console.error('Error creating project:', error)
    }
  }

  const handleProjectPress = project => {
    setSelectedProject(project)
    setModalOptionsVisible(true)
  }

  const handleDeleteProject = async () => {
    if (!selectedProject) return

    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this project?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            try {
              await deleteDoc(doc(firestore, 'projects', selectedProject.id))
              setModalOptionsVisible(false)
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to delete the project: ' + error.message
              )
            }
          },
        },
      ],
      { cancelable: false }
    )
  }

  const handleInspection = () => {
    if (selectedProject) {
      router.push({
        pathname: '/inspection',
        params: {
          address: selectedProject.address,
          inspectorName: selectedProject.inspectorName,
          customer: selectedProject.customer || '',
          reason: selectedProject.reason || '',
        },
      })
      setModalOptionsVisible(false)
    }
  }

  return (
    <ImageBackground
      source={require('../../../assets/images/logo.png')}
      style={{ flex: 1, resizeMode: 'cover' }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            marginTop: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => router.push('/inspection')}
            style={styles.navButton}
          >
            <IconSymbol name="folder.badge.plus" size={24} color="white" />
            <Text style={styles.navButtonText}>Inspection</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/remediation')}
            style={styles.navButton}
          >
            <IconSymbol name="folder.badge.plus" size={24} color="white" />
            <Text style={styles.navButtonText}>Remediation</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          {projects.map(project => (
            <TouchableOpacity
              key={project.id}
              onPress={() => handleProjectPress(project)}
              style={styles.projectCard}
            >
              <Text style={styles.projectCardText}>{project.address}</Text>
              <Text style={styles.projectCardText}>
                Inspector: {project.inspectorName}
              </Text>
              <Text style={styles.projectCardText}>
                reason: {project.reason}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.fab}
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
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TextInput
                style={styles.input}
                placeholder="Street"
                value={newProject.street}
                onChangeText={text =>
                  setNewProject({ ...newProject, street: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="City"
                value={newProject.city}
                onChangeText={text =>
                  setNewProject({ ...newProject, city: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="State"
                value={newProject.state}
                onChangeText={text =>
                  setNewProject({ ...newProject, state: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Zip"
                value={newProject.zip}
                onChangeText={text =>
                  setNewProject({ ...newProject, zip: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Inspector Name"
                value={newProject.inspectorName}
                onChangeText={text =>
                  setNewProject({ ...newProject, inspectorName: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Type of Job"
                value={newProject.reason}
                onChangeText={text =>
                  setNewProject({ ...newProject, reason: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Customer"
                value={newProject.customer}
                onChangeText={text =>
                  setNewProject({ ...newProject, customer: text })
                }
              />
              {/* Photo upload logic would go here */}
              <TouchableOpacity
                onPress={handleCreateProject}
                style={styles.modalButton}
              >
                <Text style={styles.modalButtonText}>Create Project</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalButton, { backgroundColor: '#FF5722' }]}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
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
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {selectedProject && (
                <>
                  <Text style={styles.modalText}>Project Details:</Text>
                  <Text style={styles.modalText}>
                    Address: {selectedProject.address}
                  </Text>
                  <Text style={styles.modalText}>
                    Inspector: {selectedProject.inspectorName}
                  </Text>
                  <Text style={styles.modalText}>
                    Job Type: {selectedProject.reason}
                  </Text>
                  <Text style={styles.modalText}>
                    Customer: {selectedProject.customer}
                  </Text>
                  {/* Display photos if any */}
                  {selectedProject.photos &&
                    selectedProject.photos.length > 0 && (
                      <ScrollView
                        horizontal={true}
                        style={{ maxHeight: 100, marginBottom: 10 }}
                      >
                        {selectedProject.photos.map((photo, index) => (
                          <Image
                            key={index}
                            source={{ uri: photo }}
                            style={{ width: 80, height: 80, marginRight: 10 }}
                          />
                        ))}
                      </ScrollView>
                    )}
                </>
              )}
              <TouchableOpacity
                onPress={() => {
                  openGoogleMaps(selectedProject.address)
                  setModalOptionsVisible(false)
                }}
                style={styles.modalButton}
              >
                <Text style={styles.modalButtonText}>Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleInspection}
                style={styles.modalButton}
              >
                <Text style={styles.modalButtonText}>Inspection</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteProject}
                style={[styles.modalButton, { backgroundColor: '#F44336' }]}
              >
                <Text style={styles.modalButtonText}>Delete Project</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalOptionsVisible(false)}
                style={[styles.modalButton, { backgroundColor: '#757575' }]}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  )
}

const styles = {
  navButton: {
    padding: 10,
    backgroundColor: '#1A237E',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 16,
  },
  scrollView: {
    margin: 10,
  },
  projectCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  projectCardText: {
    color: 'white',
    marginBottom: 5,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 30,
    padding: 15,
    elevation: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    width: '100%',
    padding: 10,
    marginBottom: 10,
  },
  modalButton: {
    backgroundColor: '#1A237E',
    padding: 10,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 5,
  },
}

export default Index
