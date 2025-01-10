import React from 'react'
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Image,
  SafeAreaView,
} from 'react-native'

const ProjectDetailsModal = ({
  visible,
  project,
  onClose,
  onUpdateProject,
  onDeleteProject,
  setSelectedPhoto,
  setModalOptionsVisible,
  setSelectedProject,
}) => {
  if (!project) return null
  const handleSwitchChange = (field, value) => {
    // Update local state first for immediate UI feedback
    setSelectedProject(prevProject => ({
      ...prevProject,
      [field]: value,
    }))

    // Then update Firestore
    onUpdateProject(project.id, field, value)
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

              {/* Display project fields */}
              <Text style={styles.projectFieldLabel}>Address:</Text>
              <Text style={styles.projectFieldValue}>{project.address}</Text>

              <Text style={styles.projectFieldLabel}>Customer:</Text>
              <Text style={styles.projectFieldValue}>
                {project.customer || 'N/A'}
              </Text>

              <Text style={styles.projectFieldLabel}>Contact Name:</Text>
              <Text style={styles.projectFieldValue}>
                {project.contactName || 'N/A'}
              </Text>

              <Text style={styles.projectFieldLabel}>Contact Number:</Text>
              <Text style={styles.projectFieldValue}>
                {project.contactNumber || 'N/A'}
              </Text>

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

              <Text style={styles.projectFieldLabel}>Job Type:</Text>
              <Text style={styles.projectFieldValue}>
                {project.jobType || 'N/A'}
              </Text>

              {/* ====== Remediation Required Checkbox ====== */}
              <View style={styles.checkboxContainer}>
                <Switch
                  value={project.remediationRequired || false}
                  onValueChange={value =>
                    handleSwitchChange('remediationRequired', value)
                  }
                />
                <Text style={styles.checkboxLabel}>Remediation Required</Text>
              </View>
              <View style={styles.checkboxContainer}>
                <Switch
                  value={project.equipmentOnSite || false}
                  onValueChange={value =>
                    handleSwitchChange('equipmentOnSite', value)
                  }
                />
                <Text style={styles.checkboxLabel}>Equipment On Site</Text>
              </View>
              <View style={styles.checkboxContainer}>
                <Switch
                  value={project.siteComplete || false}
                  onValueChange={value =>
                    handleSwitchChange('siteComplete', value)
                  }
                />
                <Text style={styles.checkboxLabel}>Site Complete</Text>
              </View>

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
                    // Open Google Maps functionality not included here
                    onClose()
                  }}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>Get Directions</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    // Handle Inspection functionality not included here
                    onClose()
                  }}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>Start Inspection</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onDeleteProject}
                  style={[styles.actionButton, styles.deleteButton]}
                >
                  <Text style={styles.actionButtonText}>Delete Project</Text>
                </TouchableOpacity>

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
    marginBottom: 12,
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
