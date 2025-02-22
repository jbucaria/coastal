'use client'

import React, { useState, useRef } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { v4 as uuidv4 } from 'uuid'
import { doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { firestore, storage } from '@/firebaseConfig'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { FloatingButton } from '@/components/FloatingButton'
import { rephraseText } from '@/utils/rephraseText'

// Predefined room types
const ROOM_OPTIONS = ['Bedroom', 'Kitchen', 'Garage', 'Living Room', 'Bathroom']

const InspectionScreen = () => {
  const router = useRouter()
  const { projectId } = useLocalSearchParams()

  // Rooms state – each room now has inspection fields and photos
  const [rooms, setRooms] = useState([])

  // Modal state for adding a room
  const [showAddRoomModal, setShowAddRoomModal] = useState(false)
  const [selectedRoomType, setSelectedRoomType] = useState('')
  const [customRoomName, setCustomRoomName] = useState('')

  // State for report generation
  const [generatingReport, setGeneratingReport] = useState(false)
  const [report, setReport] = useState('')

  const scrollY = useRef(new Animated.Value(0)).current
  const floatingOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  // -------------------- Add Room Logic --------------------
  const openAddRoomModal = () => {
    setSelectedRoomType('')
    setCustomRoomName('')
    setShowAddRoomModal(true)
  }

  const handleConfirmAddRoom = () => {
    let roomName = ''
    if (selectedRoomType) {
      roomName = selectedRoomType
    } else if (customRoomName.trim()) {
      roomName = customRoomName.trim()
    } else {
      roomName = `Room ${rooms.length + 1}`
    }
    const newRoom = {
      id: uuidv4(),
      roomTitle: roomName,
      reasonForInspection: '',
      inspectionFindings: '',
      photos: [],
    }
    setRooms(prev => [...prev, newRoom])
    setShowAddRoomModal(false)
  }

  const handleDeleteRoom = roomId => {
    setRooms(prev => prev.filter(room => room.id !== roomId))
  }

  const handleRoomFieldChange = (roomId, field, value) => {
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId ? { ...room, [field]: value } : room
      )
    )
  }

  // -------------------- Photo Upload Logic --------------------
  const handleAddPhoto = async (roomId, projectId) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Need camera roll permission.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        quality: 0.5,
      })
      if (result.canceled) return
      if (result.assets && result.assets.length > 0) {
        const uploadPromises = result.assets.map(async asset => {
          const response = await fetch(asset.uri)
          const blob = await response.blob()
          const fileName = asset.fileName || `${uuidv4()}.jpg`
          // Save to "inspectionPhotos" folder
          const storagePath = `inspectionPhotos/${projectId}/${fileName}`
          const storageRef = ref(storage, storagePath)
          await uploadBytes(storageRef, blob)
          const downloadURL = await getDownloadURL(storageRef)
          return { storagePath, downloadURL }
        })
        const photosArray = await Promise.all(uploadPromises)
        setRooms(prev =>
          prev.map(room =>
            room.id === roomId
              ? { ...room, photos: [...room.photos, ...photosArray] }
              : room
          )
        )
      }
    } catch (error) {
      console.error('Error uploading photos:', error)
      Alert.alert('Error', 'Could not upload photos. Please try again.')
    }
  }

  const handleDeletePhoto = (roomId, storagePath) => {
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? {
              ...room,
              photos: room.photos.filter(p => p.storagePath !== storagePath),
            }
          : room
      )
    )
  }

  // -------------------- Save Inspection Data --------------------
  const handleSaveInspectionData = async () => {
    try {
      const inspectionData = {
        rooms,
        updatedAt: new Date(),
      }
      await updateDoc(doc(firestore, 'tickets', projectId), {
        inspectionData,
        inspectionComplete: true,
      })
      Alert.alert('Success', 'Inspection data saved successfully.')
      router.back()
    } catch (error) {
      console.error('Error saving inspection data:', error)
      Alert.alert('Error', 'Failed to save data. Please try again.')
    }
  }

  // -------------------- Generate Report Logic --------------------
  const handleGenerateReport = async () => {
    setGeneratingReport(true)
    try {
      // Aggregate text from each room
      const aggregatedText = rooms
        .map(
          room =>
            `Room: ${room.roomTitle}\nReason for Inspection: ${room.reasonForInspection}\nInspection Findings: ${room.inspectionFindings}`
        )
        .join('\n\n')
      // Call OpenAI endpoint via rephraseText
      const generatedReport = await rephraseText(aggregatedText)
      setReport(generatedReport)
      Alert.alert('Generated Report', generatedReport)
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report. Please try again.')
    }
    setGeneratingReport(false)
  }

  // -------------------- Render --------------------
  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithOptions title="Inspection" onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={40}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            {rooms.map(room => (
              <View key={room.id} style={styles.roomCard}>
                {/* Room Header */}
                <View style={styles.roomHeader}>
                  <Text style={styles.roomName}>{room.roomTitle}</Text>
                  <TouchableOpacity onPress={() => handleDeleteRoom(room.id)}>
                    <Text style={styles.deleteRoomText}>Delete</Text>
                  </TouchableOpacity>
                </View>
                {/* Inspection Input Fields */}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Inspection Findings</Text>
                  <TextInput
                    style={[styles.inspectionInput, { height: 100 }]}
                    placeholder="Enter inspection findings"
                    value={room.inspectionFindings}
                    onChangeText={text =>
                      handleRoomFieldChange(room.id, 'inspectionFindings', text)
                    }
                    multiline
                  />
                </View>
                {/* Photos Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Photos</Text>
                  {room.photos && room.photos.length > 0 ? (
                    <ScrollView horizontal style={styles.photoRow}>
                      {room.photos.map(photo => (
                        <View key={photo.storagePath} style={styles.photoItem}>
                          <Image
                            source={{ uri: photo.downloadURL }}
                            style={styles.photoImage}
                          />
                          <TouchableOpacity
                            onPress={() =>
                              handleDeletePhoto(room.id, photo.storagePath)
                            }
                            style={styles.deletePhotoButton}
                          >
                            <Text style={styles.deletePhotoButtonText}>
                              Remove
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.noPhotoText}>No photos added.</Text>
                  )}
                  <TouchableOpacity
                    onPress={() => handleAddPhoto(room.id, projectId)}
                    style={styles.addPhotoButton}
                  >
                    <Text style={styles.addPhotoButtonText}>+ Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {rooms.length > 0 && (
              <>
                <TouchableOpacity
                  onPress={handleSaveInspectionData}
                  style={styles.saveButton}
                >
                  <Text style={styles.saveButtonText}>Save Inspection</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleGenerateReport}
                  style={[
                    styles.saveButton,
                    { backgroundColor: '#F36C21', marginTop: 12 },
                  ]}
                  disabled={generatingReport}
                >
                  {generatingReport ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Generate Report</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <View style={{ position: 'absolute', right: 25, bottom: 50 }}>
        <FloatingButton
          onPress={openAddRoomModal}
          title="Add Room"
          animatedOpacity={floatingOpacity}
        />
      </View>
      {showAddRoomModal && (
        <Modal
          visible={showAddRoomModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddRoomModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.addRoomModalContainer}>
              <Text style={styles.modalTitle}>Add Room</Text>
              <ScrollView horizontal style={styles.roomOptionsRow}>
                {ROOM_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.roomTypeOption,
                      selectedRoomType === option &&
                        styles.roomTypeOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedRoomType(option)
                      setCustomRoomName('')
                    }}
                  >
                    <Text
                      style={[
                        styles.roomTypeOptionText,
                        selectedRoomType === option && { color: '#FFF' },
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.modalSubtitle}>Or type custom name:</Text>
              <TextInput
                style={styles.itemSearchInput}
                placeholder="e.g. Office, Studio"
                value={customRoomName}
                onChangeText={val => {
                  setCustomRoomName(val)
                  if (selectedRoomType) setSelectedRoomType('')
                }}
              />
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  onPress={handleConfirmAddRoom}
                  style={styles.modalConfirmButton}
                >
                  <Text style={styles.modalConfirmButtonText}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowAddRoomModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  )
}

export default InspectionScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  roomCard: {
    backgroundColor: '#F5F8FA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#14171A',
  },
  deleteRoomText: {
    color: '#E0245E',
    fontWeight: '600',
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14171A',
    marginBottom: 8,
  },
  inspectionInput: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#14171A',
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  photoRow: {
    flexDirection: 'row',
  },
  noPhotoText: {
    color: '#657786',
    fontSize: 14,
    marginBottom: 4,
  },
  photoItem: {
    marginRight: 10,
    position: 'relative',
  },
  photoImage: {
    width: 70,
    height: 70,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deletePhotoButtonText: {
    color: '#fff',
    fontSize: 10,
  },
  addPhotoButton: {
    backgroundColor: '#0073BC',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  addPhotoButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#0073BC',
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
    alignSelf: 'center',
    width: '60%',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addRoomModalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#14171A',
  },
  itemSearchInput: {
    backgroundColor: '#F5F8FA',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    color: '#14171A',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalConfirmButton: {
    backgroundColor: '#0073BC',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalConfirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalCloseButton: {
    backgroundColor: '#ECECEC',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalCloseButtonText: {
    color: '#14171A',
    fontWeight: '600',
    fontSize: 14,
  },
  roomOptionsRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  roomTypeOption: {
    backgroundColor: '#F5F8FA',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  roomTypeOptionSelected: {
    backgroundColor: '#0073BC',
    borderColor: '#0073BC',
  },
  roomTypeOptionText: {
    fontSize: 14,
    color: '#14171A',
  },
  modalSubtitle: {
    fontWeight: '600',
    marginVertical: 8,
    color: '#14171A',
    textAlign: 'center',
  },
})
