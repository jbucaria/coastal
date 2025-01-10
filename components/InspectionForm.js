// components/InspectionForm.js

import React, { useState } from 'react'
import {
  View,
  TextInput,
  Pressable,
  Text,
  Modal,
  Button,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Switch,
  StyleSheet,
} from 'react-native'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import DateTimePicker from '@react-native-community/datetimepicker'
import { IconSymbol } from '@/components/ui/IconSymbol'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import {
  KeyboardToolbar,
  KeyboardAwareScrollView,
} from 'react-native-keyboard-controller'

const InspectionForm = ({
  customer,
  setCustomer,
  address,
  setAddress,
  date,
  showDatePicker,
  setShowDatePicker,
  inspectorName,
  setInspectorName,
  reason,
  setReason,
  hours,
  setHours,
  inspectionResults,
  setInspectionResults,
  recommendedActions,
  setRecommendedActions,
  photos,
  setPhotos,
  isSaving,
  handleDateChange,
  handleGeneratePdf,
  setContactName,
  contactName,
  setContactNumber,
  contactNumber,
  project,
  setProject,
  projectId,
}) => {
  const [inspectorModalVisible, setInspectorModalVisible] = useState(false)
  const inspectors = ['John Bucaria', 'Dave Sprott', 'Bobby Blasewitz']

  const handleSwitchChange = (field, value) => {
    if (project) {
      setProject({ ...project, [field]: value })
    } else {
      console.error('Project is undefined, cannot update:', field)
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
        alert('Permission to access camera roll is required!')
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
            return {
              uri: asset.uri,
              label: '',
              base64,
            }
          })
        )
        setPhotos([...photos, ...selectedAssets])
      } else {
        alert('You did not select any image.')
      }
    } catch (error) {
      console.error('Error picking image:', error)
    }
  }

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Inspection Report</Text>

      {/* Display Project ID (optional) */}
      {projectId && (
        <Text style={styles.projectIdText}>Project ID: {projectId}</Text>
      )}

      {/* Customer Field */}
      <TextInput
        style={styles.input}
        placeholder="Customer"
        value={customer}
        onChangeText={text => setCustomer(text)}
      />

      {/* Address Field */}
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={address}
        onChangeText={text => setAddress(text)}
      />

      {/* Date Picker */}
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.dateButton}
      >
        <Text style={styles.dateButtonText}>Select Date</Text>
      </TouchableOpacity>
      <Text style={styles.selectedDateText}>
        Selected Date: {date.toLocaleDateString()}
      </Text>

      {/* Inspector Name */}
      <TextInput
        style={styles.input}
        placeholder="Inspector's Name"
        value={inspectorName}
        onChangeText={text => setInspectorName(text)}
      />

      {/* Reason for Inspection */}
      <TextInput
        style={styles.input}
        placeholder="Reason for Inspection"
        value={reason}
        onChangeText={text => setReason(text)}
      />

      {/* Hours to Complete Inspection */}
      <TextInput
        style={styles.input}
        placeholder="Hours to Complete Inspection"
        value={hours}
        onChangeText={text => setHours(text)}
        keyboardType="numeric"
      />

      {/* Contact Name */}
      <TextInput
        style={styles.input}
        placeholder="Contact Name"
        value={contactName}
        onChangeText={text => setContactName(text)}
      />

      {/* Contact Number */}
      <TextInput
        style={styles.input}
        placeholder="Contact Number"
        value={contactNumber}
        onChangeText={text => setContactNumber(text)}
        keyboardType="phone-pad"
      />

      {/* Inspection Results */}
      <TextInput
        style={styles.textArea}
        placeholder="Inspection Results"
        value={inspectionResults}
        onChangeText={text => setInspectionResults(text)}
        multiline
      />

      {/* Recommended Actions */}
      <TextInput
        style={styles.textArea}
        placeholder="Recommended Actions"
        value={recommendedActions}
        onChangeText={text => setRecommendedActions(text)}
        multiline
      />

      {/* Remediation Required Switch */}
      <View style={styles.checkboxContainer}>
        <Switch
          value={project.remediationRequired || false}
          onValueChange={value =>
            handleSwitchChange('remediationRequired', value)
          }
        />
        <Text style={styles.checkboxLabel}>Remediation Required</Text>
      </View>

      {/* Equipment On Site Switch */}
      <View style={styles.checkboxContainer}>
        <Switch
          value={project.equipmentOnSite || false}
          onValueChange={value => handleSwitchChange('equipmentOnSite', value)}
        />
        <Text style={styles.checkboxLabel}>Equipment On Site</Text>
      </View>

      {/* Site Complete Switch */}
      <View style={styles.checkboxContainer}>
        <Switch
          value={project.siteComplete || false}
          onValueChange={value => handleSwitchChange('siteComplete', value)}
        />
        <Text style={styles.checkboxLabel}>Site Complete</Text>
      </View>

      {/* Photos */}
      <ThemedView style={styles.photoSection}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <ThemedText style={styles.subtitle} type="subtitle">
            Photos
          </ThemedText>
          <Pressable onPress={pickImageAsync}>
            <IconSymbol name="photo.badge.plus" size={30} color="#008000" />
          </Pressable>
        </View>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoItem}>
            <Image source={{ uri: photo.uri }} style={styles.photoImage} />
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
        ))}
      </ThemedView>

      {/* Button for generating PDF */}
      <ThemedView style={styles.buttonContainer}>
        {isSaving ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Button title="Generate & Save PDF" onPress={handleGeneratePdf} />
        )}
      </ThemedView>
    </KeyboardAwareScrollView>
  )
}

export default InspectionForm

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 96, // Equivalent to pb-24 in NativeWind
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
    backgroundColor: 'white',
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
  photoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoImage: {
    width: 48, // Equivalent to w-12 in NativeWind
    height: 48, // Equivalent to h-12 in NativeWind
    marginRight: 8,
    borderRadius: 4,
  },
  photoLabelInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'white',
  },
  removeText: {
    color: 'red',
    marginLeft: 8,
    padding: 4,
  },
  buttonContainer: {
    marginTop: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
})
