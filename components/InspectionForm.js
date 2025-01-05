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
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
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
  setDate,
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
}) => {
  const [inspectorModalVisible, setInspectorModalVisible] = useState(false)
  const inspectors = ['John Bucaria', 'Dave Sprott', 'Bobby Blasewitz']

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
    <>
      <KeyboardAwareScrollView
        bottomOffset={62}
        contentContainerStyle={styles.container}
      >
        {/* Address Field */}
        <ThemedText style={styles.subtitle} type="subtitle">
          Address
        </ThemedText>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter property address"
        />

        {/* Customer Field */}
        <ThemedText style={styles.subtitle} type="subtitle">
          Customer
        </ThemedText>
        <TextInput
          style={styles.input}
          value={customer}
          onChangeText={setCustomer}
          placeholder="Enter customer name"
        />

        {/* Date of Inspection */}
        <ThemedText style={styles.subtitle} type="subtitle">
          Date of Inspection
        </ThemedText>
        <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text>{date ? date.toLocaleDateString() : 'Select Date'}</Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {/* Reason for Inspection */}
        <ThemedText style={styles.subtitle} type="subtitle">
          Reason for Inspection
        </ThemedText>
        <TextInput
          style={styles.input}
          value={reason}
          onChangeText={setReason}
          placeholder="Enter reason"
        />

        {/* Inspector's Name */}
        <ThemedText style={styles.subtitle} type="subtitle">
          Inspector's Name
        </ThemedText>
        <Pressable
          style={styles.input}
          onPress={() => setInspectorModalVisible(true)}
        >
          <Text>{inspectorName || 'Select Inspector'}</Text>
        </Pressable>

        {/* Modal for selecting inspector */}
        <Modal
          transparent={true}
          visible={inspectorModalVisible}
          animationType="slide"
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalContent}>
              <ThemedText style={styles.subtitle} type="subtitle">
                Select Inspector
              </ThemedText>
              {inspectors.map((inspector, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.inspectorOption}
                  onPress={() => {
                    setInspectorName(inspector)
                    setInspectorModalVisible(false)
                  }}
                >
                  <ThemedText>{inspector}</ThemedText>
                </TouchableOpacity>
              ))}
              <Button
                title="Done"
                onPress={() => setInspectorModalVisible(false)}
              />
            </View>
          </View>
        </Modal>

        {/* Hours to Complete Inspection */}
        <ThemedText style={styles.subtitle} type="subtitle">
          Hours to Complete Inspection
        </ThemedText>
        <TextInput
          style={styles.input}
          value={hours}
          onChangeText={setHours}
          placeholder="Enter hours"
          keyboardType="numeric"
        />

        {/* Inspection Results */}
        <ThemedText style={styles.subtitle} type="subtitle">
          Inspection Results
        </ThemedText>
        <TextInput
          style={[styles.input, styles.multiLineInput]}
          value={inspectionResults}
          onChangeText={setInspectionResults}
          placeholder="Enter inspection results"
          multiline
        />

        {/* Recommended Actions */}
        <ThemedText style={styles.subtitle} type="subtitle">
          Recommended Actions
        </ThemedText>
        <TextInput
          style={[styles.input, styles.multiLineInput]}
          value={recommendedActions}
          onChangeText={setRecommendedActions}
          placeholder="Enter recommended actions"
          multiline
        />

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
              <IconSymbol name="photo.badge.plus" size={70} color="#008000" />
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
      <KeyboardToolbar />
    </>
  )
}

export default InspectionForm

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 96, // Equivalent to pb-24 in NativeWind
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  multiLineInput: {
    height: 96, // Equivalent to h-24 in NativeWind
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 16,
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
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  inspectorOption: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
})
