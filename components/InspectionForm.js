// components/InspectionForm.js

import React, { useState } from 'react'
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Image,
  Button,
  ActivityIndicator,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native'
import { updateDoc, doc } from 'firebase/firestore'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { IconSymbol } from '@/components/ui/IconSymbol'

const InspectionForm = ({
  customer,
  setCustomer,
  address,
  setAddress,
  inspectorName,
  setInspectorName,
  hours,
  setHours,
  inspectionResults,
  setInspectionResults,
  recommendedActions,
  setRecommendedActions,
  photos,
  setPhotos,
  isSaving,
  handleGeneratePdf,
  setContactName,
  contactName,
  setContactNumber,
  contactNumber,
  project,
  setProject,
  projectId,
  firestore, // Firestore instance
}) => {
  // isEditing controls whether full form fields are editable
  const [isEditing, setIsEditing] = useState(false)

  // For toggling the editing mode:
  const toggleEditMode = () => setIsEditing(prev => !prev)

  const onUpdateProject = async (projectId, field, value) => {
    try {
      await updateDoc(doc(firestore, 'projects', projectId), {
        [field]: value,
      })
      console.log(`Project field ${field} updated to ${value}`)
    } catch (error) {
      console.error('Error updating project:', error)
      Alert.alert('Error', 'Failed to update the project. Please try again.')
    }
  }

  const handleSwitchChange = (field, value) => {
    // Update local state for immediate feedback
    setProject(prev => ({ ...prev, [field]: value }))
    // Update Firestore if projectId is present
    if (projectId) {
      onUpdateProject(projectId, field, value)
    } else {
      console.error('Project ID is missing. Cannot update Firestore.')
    }
  }

  const handlePhotoLabelChange = (text, index) => {
    const updatedPhotos = [...photos]
    updatedPhotos[index].label = text
    setPhotos(updatedPhotos)
  }

  const handleRemovePhoto = index => {
    const updatedPhotos = [...photos]
    updatedPhotos.splice(index, 1)
    setPhotos(updatedPhotos)
  }

  const pickImageAsync = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Permission to access camera roll is required!'
        )
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.5,
      })
      if (!result.canceled) {
        const selectedAssets = await Promise.all(
          result.assets.map(async asset => {
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            })
            return { uri: asset.uri, label: '', base64 }
          })
        )
        setPhotos([...photos, ...selectedAssets])
      } else {
        Alert.alert('No Selection', 'You did not select any image.')
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick images.')
    }
  }

  // Helper function to conditionally render a field:
  const renderEditableField = (
    label,
    value,
    onChange,
    keyboardType = 'default'
  ) => {
    return (
      <>
        <ThemedText style={styles.label}>{label}:</ThemedText>
        {isEditing ? (
          <TextInput
            style={styles.input}
            placeholder={label}
            value={value}
            onChangeText={onChange}
            keyboardType={keyboardType}
          />
        ) : (
          <Text style={[styles.input, styles.readOnlyText]}>{value}</Text>
        )}
      </>
    )
  }

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Inspection Report</Text>

      {/* Edit Mode Toggle Button */}
      <TouchableOpacity
        style={styles.editToggleButton}
        onPress={toggleEditMode}
      >
        <Text style={styles.editToggleButtonText}>
          {isEditing ? 'Switch to Read-Only' : 'Switch to Edit Mode'}
        </Text>
      </TouchableOpacity>

      {/* Display Project ID */}
      {projectId && (
        <Text style={styles.projectIdText}>Project ID: {projectId}</Text>
      )}

      {/* Render conditional fields (only editable when in edit mode) */}
      {renderEditableField('Customer', customer, setCustomer)}
      {renderEditableField('Address', address, setAddress)}
      {renderEditableField("Inspector's Name", inspectorName, setInspectorName)}
      {renderEditableField('Contact Name', contactName, setContactName)}
      {renderEditableField(
        'Contact Number',
        contactNumber,
        setContactNumber,
        'phone-pad'
      )}

      {/* Other fields always editable for the inspection report */}
      <ThemedText style={styles.label}>
        Hours to Complete Inspection:
      </ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Enter hours"
        value={hours}
        onChangeText={setHours}
        keyboardType="numeric"
      />

      <ThemedText style={styles.label}>Inspection Results:</ThemedText>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Enter inspection results"
        value={inspectionResults}
        onChangeText={setInspectionResults}
        multiline
      />

      <ThemedText style={styles.label}>Recommended Actions:</ThemedText>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Enter recommended actions"
        value={recommendedActions}
        onChangeText={setRecommendedActions}
        multiline
      />

      {/* Switches for project-level fields (always interactable) */}
      <View style={styles.checkboxContainer}>
        <Switch
          value={project?.remediationRequired || false}
          onValueChange={value =>
            handleSwitchChange('remediationRequired', value)
          }
        />
        <Text style={styles.checkboxLabel}>Remediation Required</Text>
      </View>
      <View style={styles.checkboxContainer}>
        <Switch
          value={project?.equipmentOnSite || false}
          onValueChange={value => handleSwitchChange('equipmentOnSite', value)}
        />
        <Text style={styles.checkboxLabel}>Equipment On Site</Text>
      </View>
      <View style={styles.checkboxContainer}>
        <Switch
          value={project?.siteComplete || false}
          onValueChange={value => handleSwitchChange('siteComplete', value)}
        />
        <Text style={styles.checkboxLabel}>Site Complete</Text>
      </View>

      {/* Photos Section */}
      <ThemedView style={styles.photoSection}>
        <View style={styles.photosHeader}>
          <ThemedText style={styles.subtitle}>Photos</ThemedText>
          <TouchableOpacity onPress={pickImageAsync}>
            <IconSymbol name="photo.badge.plus" size={30} color="#008000" />
          </TouchableOpacity>
        </View>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoItem}>
            <Image source={{ uri: photo.uri }} style={styles.photoImage} />
            {isEditing ? (
              <TextInput
                style={styles.photoLabelInput}
                value={photo.label}
                onChangeText={text => handlePhotoLabelChange(text, index)}
                placeholder="Label this photo"
              />
            ) : (
              <Text style={[styles.photoLabelInput, styles.readOnlyText]}>
                {photo.label}
              </Text>
            )}
            <TouchableOpacity onPress={() => handleRemovePhoto(index)}>
              <ThemedText style={styles.removeText}>Remove</ThemedText>
            </TouchableOpacity>
          </View>
        ))}
      </ThemedView>

      {/* Button for generating PDF */}
      <ThemedView style={styles.buttonContainer}>
        {isSaving ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Button title="Save Report" onPress={handleGeneratePdf} />
        )}
      </ThemedView>
    </KeyboardAwareScrollView>
  )
}

export default InspectionForm

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 96,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  projectIdText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: 'white',
    fontSize: 16,
  },
  readOnlyText: {
    backgroundColor: '#eee',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  dateButtonText: {
    color: 'white',
    fontSize: 16,
  },
  selectedDateText: {
    fontSize: 16,
    marginBottom: 16,
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
  photoSection: {
    marginBottom: 16,
    padding: 5,
    borderRadius: 8,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  photoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 8,
  },
  photoLabelInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'white',
    fontSize: 14,
  },
  removeText: {
    color: 'red',
    marginLeft: 8,
    padding: 4,
  },
  buttonContainer: {
    marginTop: 16,
  },
  editToggleButton: {
    backgroundColor: '#2C3E50',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-end',
  },
  editToggleButtonText: {
    color: 'white',
    fontSize: 14,
  },
})
