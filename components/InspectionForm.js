// components/InspectionForm.js

import React, { useState, useCallback } from 'react'
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
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { router } from 'expo-router'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { rephraseText } from '@/utils/rephraseText' // Import the function that calls OpenAI
import { SafeAreaView } from 'react-native-safe-area-context'

const InspectionForm = ({
  address,
  setAddress,
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
  project,
  setProject,
  projectId,
}) => {
  // Handler for rephrasing inspection results using OpenAI’s API
  const handleRephraseInspectionResults = async () => {
    try {
      const newText = await rephraseText(inspectionResults)
      setInspectionResults(newText)
    } catch (error) {
      Alert.alert('Error', 'Failed to rephrase inspection results.')
    }
  }

  // Handler for rephrasing recommended actions using OpenAI’s API
  const handleRephraseRecommendedActions = async () => {
    try {
      const newText = await rephraseText(recommendedActions)
      setRecommendedActions(newText)
    } catch (error) {
      Alert.alert('Error', 'Failed to rephrase recommended actions.')
    }
  }
  const updateProject = useCallback(async (projectId, field, value) => {
    try {
      await updateDoc(doc(firestore, 'projects', projectId), { [field]: value })
      console.log('Project updated successfully')
      // No need to manually update state; onSnapshot will handle it if you're using real-time listeners
    } catch (error) {
      console.error('Error updating project:', error)
      Alert.alert('Error', 'Failed to update the project. Please try again.')
    }
  }, [])

  const handleSwitchChange = async (field, value) => {
    if (project && setProject && project.id) {
      // Update local state for immediate UI feedback
      setProject(prev => ({ ...prev, [field]: value }))

      // Update Firestore using the local updateProject function
      try {
        await updateProject(project.id, field, value)
        console.log(`Firestore updated: ${field} set to ${value}`)
      } catch (error) {
        console.error('Error updating project in Firestore:', error)
        Alert.alert('Error', 'Failed to update the project. Please try again.')
        // Roll back state if the update fails
        setProject(prev => ({ ...prev, [field]: !value }))
      }
    } else {
      console.error(
        'setProject function or project.id is undefined. Make sure it is passed from the parent.'
      )
      Alert.alert(
        'Error',
        'Project or project data is incomplete. Cannot update.'
      )
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        {/* This is fixed at the top and does NOT scroll */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeIconContainer}
        >
          <IconSymbol name="xmark" size={24} color="#fff" />
        </TouchableOpacity>
        <KeyboardAwareScrollView contentContainerStyle={styles.container}>
          <View style={styles.topFormSection}>
            <Text style={styles.title}>Create Inspection Report</Text>

            <Text style={styles.addressText}>{address}</Text>
          </View>
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
          <TouchableOpacity
            style={styles.rephraseButton}
            onPress={handleRephraseInspectionResults}
          >
            <Text style={styles.rephraseButtonText}>
              Rephrase Inspection Results
            </Text>
          </TouchableOpacity>

          <ThemedText style={styles.label}>Recommended Actions:</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter recommended actions"
            value={recommendedActions}
            onChangeText={setRecommendedActions}
            multiline
          />
          <TouchableOpacity
            style={styles.rephraseButton}
            onPress={handleRephraseRecommendedActions}
          >
            <Text style={styles.rephraseButtonText}>
              Rephrase Recommended Actions
            </Text>
          </TouchableOpacity>

          {/* Project-level Switches */}
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
              onValueChange={value =>
                handleSwitchChange('equipmentOnSite', value)
              }
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

          <ThemedView style={styles.photoSection}>
            <View style={styles.photosHeader}>
              <ThemedText style={styles.subtitle} type="subtitle">
                Photos
              </ThemedText>
              <TouchableOpacity onPress={pickImageAsync}>
                <IconSymbol name="photo.badge.plus" size={30} color="#008000" />
              </TouchableOpacity>
            </View>

            {photos.length === 0 ? (
              /* Show a "no photos" message or an empty state */
              <ThemedText style={{ color: '#888' }}>
                No photos have been added yet.
              </ThemedText>
            ) : (
              /* Map over the existing photos */
              photos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoImage}
                  />
                  <TextInput
                    style={styles.photoLabelInput}
                    value={photo.label}
                    onChangeText={text => handlePhotoLabelChange(text, index)}
                    placeholder="Label this photo"
                  />
                  <TouchableOpacity onPress={() => handleRemovePhoto(index)}>
                    <ThemedText style={styles.removeText}>Remove</ThemedText>
                  </TouchableOpacity>
                </View>
              ))
            )}
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
      </View>
    </SafeAreaView>
  )
}

export default InspectionForm

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f7', // or any background you prefer
  },
  root: {
    flex: 1,
  },
  closeIconContainer: {
    position: 'absolute',
    top: 10,
    right: 11,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  container: {
    padding: 20,
    paddingBottom: 96,
  },
  topFormSection: {
    backgroundColor: '#f7f7f7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    // Optional shadow for iOS / elevation for Android
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#2C3E50',
  },
  /* If you want a slightly distinct style for the address */
  addressText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 12,
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
  title: {
    fontSize: 20,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  rephraseButton: {
    backgroundColor: '#95a5a6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  rephraseButtonText: {
    color: 'white',
    fontSize: 14,
  },
})
