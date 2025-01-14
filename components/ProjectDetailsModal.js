// components/ProjectDetailsModal.js
import React from 'react'
import { router } from 'expo-router'
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
  Platform,
  Linking,
  Switch,
} from 'react-native'
import { getTravelTime } from '@/utils/getTravelTime'

const ProjectDetailsModal = ({
  visible,
  project,
  setProject,
  onClose,
  onUpdateProject, // Function passed from parent to update Firestore
  onDeleteProject,
  setSelectedPhoto,
  setModalOptionsVisible,
  setSelectedProject,
}) => {
  if (!project) return null

  const openGoogleMapsWithETA = async address => {
    try {
      // Retrieve travel time info using user's current location as the origin
      const travelInfo = await getTravelTime(address)

      // Display the travel time (ETA) to the user
      Alert.alert(
        'Estimated Travel Time',
        `Approximately ${travelInfo.durationText} to reach your destination.`
      )

      // Construct the URL for the maps application
      const url = Platform.select({
        ios: `comgooglemaps://?q=${encodeURIComponent(address)}`,
        android: `geo:0,0?q=${encodeURIComponent(address)}`,
      })

      // Try to open the maps app
      if (Platform.OS === 'ios') {
        const supported = await Linking.canOpenURL('comgooglemaps://')
        if (supported) {
          await Linking.openURL(url)
        } else {
          await Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              address
            )}`
          )
        }
      } else {
        await Linking.openURL(url)
      }
    } catch (error) {
      console.error('Error opening maps with ETA:', error)
      Alert.alert('Error', 'Failed to retrieve travel time information.')
    }
  }

  const handleCall = phoneNumber => {
    const phoneUrl =
      Platform.OS === 'android'
        ? `tel:${phoneNumber}`
        : `telprompt:${phoneNumber}`
    Linking.canOpenURL(phoneUrl)
      .then(supported => {
        if (!supported) {
          Alert.alert('Phone number is not available')
        } else {
          return Linking.openURL(phoneUrl)
        }
      })
      .catch(err => console.error('An error occurred', err))
  }

  const handleInspection = () => {
    if (!project) {
      Alert.alert('Error', 'No project selected for inspection or viewing.')
      return
    }
    const route = project.inspectionComplete ? '/viewReport' : '/inspection'
    router.push({
      pathname: route,
      params: {
        projectId: project.id,
      },
    })
    onClose()
  }

  const handleSwitchChange = async (field, value) => {
    if (project && setProject) {
      // Update local state for immediate UI feedback
      setProject(prev => ({ ...prev, [field]: value }))
      console.log('Local project updated:', field, value)
      // Optionally update Firestore here if onUpdateProject is provided.
      if (onUpdateProject) {
        try {
          await onUpdateProject(project.id, field, value)
          console.log(`Firestore updated: ${field} set to ${value}`)
        } catch (error) {
          console.error('Error updating project in Firestore:', error)
          Alert.alert(
            'Error',
            'Failed to update the project. Please try again.'
          )
          // Optionally, roll back the state if the update fails:
          setProject(prev => ({ ...prev, [field]: !value }))
        }
      }
    } else {
      console.error(
        'setProject function is undefined. Make sure it is passed from the parent.'
      )
      Alert.alert('Error', 'Project is undefined. Cannot update.')
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
              <Text style={styles.projectModalTitle}>Project Details</Text>

              {project.projectId && (
                <Text style={styles.projectFieldValue}>
                  Project ID: {project.projectId}
                </Text>
              )}

              <Text style={styles.projectFieldLabel}>Address:</Text>

              <Text style={styles.projectFieldValue}>
                {project.address || 'N/A'}
              </Text>

              <Text style={styles.projectFieldLabel}>Customer:</Text>
              <Text style={styles.projectFieldValue}>
                {project.customer || 'N/A'}
              </Text>

              <Text style={styles.projectFieldLabel}>Contact Name:</Text>
              <Text style={styles.projectFieldValue}>
                {project.contactName || 'N/A'}
              </Text>

              <Text style={styles.projectFieldLabel}>Contact Number:</Text>
              <TouchableOpacity
                onPress={() => handleCall(project.contactNumber)}
              >
                <Text style={[styles.projectFieldValue, styles.clickableText]}>
                  {project.contactNumber || 'N/A'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.projectFieldLabel}>Inspector:</Text>
              <View style={styles.inspectorRowModal}>
                <Text style={styles.projectFieldValue}>
                  {project.inspectorName || 'N/A'}
                </Text>
                {project.remediationRequired && (
                  <Text style={styles.remediationIndicatorModal}> R</Text>
                )}
              </View>

              <Text style={styles.projectFieldLabel}>Reason:</Text>
              <Text style={styles.projectFieldValue}>
                {project.reason || 'N/A'}
              </Text>

              {/* New On Site Switch */}
              {!project.inspectionComplete && (
                <View style={styles.checkboxContainer}>
                  <Switch
                    value={project.onSite || false}
                    onValueChange={value => handleSwitchChange('onSite', value)}
                  />
                  <Text style={styles.checkboxLabel}>On Site</Text>
                </View>
              )}

              {/* Photos */}
              {project.photos && project.photos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.projectPhotos}
                >
                  {project.photos.map((uri, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setSelectedPhoto(uri)
                        setModalOptionsVisible(false)
                      }}
                    >
                      <Image source={{ uri }} style={styles.projectPhoto} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noPhotosText}>No photos available</Text>
              )}

              {/* Actions */}
              <View style={styles.projectActionsContainer}>
                <TouchableOpacity
                  onPress={() => {
                    if (project.address) {
                      openGoogleMapsWithETA(project.address)
                      onClose()
                    } else {
                      Alert.alert(
                        'Error',
                        'No address available for directions.'
                      )
                    }
                  }}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>Get Directions</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleInspection}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>
                    {project.inspectionComplete
                      ? 'View Report'
                      : 'Start Inspection'}
                  </Text>
                </TouchableOpacity>

                {!project.inspectionComplete && (
                  <TouchableOpacity
                    onPress={onDeleteProject}
                    style={[styles.actionButton, styles.deleteButton]}
                  >
                    <Text style={styles.actionButtonText}>Delete Project</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.actionButton, styles.closeButton]}
                >
                  <Text style={styles.actionButtonText}>Close</Text>
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
  clickableText: {
    color: 'blue',
    textDecorationLine: 'underline',
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
  projectModalTitle: {
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2C3E50',
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

export default ProjectDetailsModal
