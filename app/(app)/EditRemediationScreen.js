'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  TextInput,
  Animated,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { v4 as uuidv4 } from 'uuid'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { firestore, storage } from '@/firebaseConfig'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { FloatingButton } from '@/components/FloatingButton'
import { IconSymbol } from '@/components/ui/IconSymbol'

export default function EditRemediationScreen() {
  const router = useRouter()
  const { projectId } = useLocalSearchParams()

  // Local state for remediation data
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  // Quick room options
  const ROOM_OPTIONS = [
    'Bedroom',
    'Kitchen',
    'Garage',
    'Living Room',
    'Bathroom',
  ]

  // -------------------- Additional States --------------------
  // Photo modal state
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoModalVisible, setPhotoModalVisible] = useState(false)
  // "Add Room" modal state
  const [showAddRoomModal, setShowAddRoomModal] = useState(false)
  const [selectedRoomType, setSelectedRoomType] = useState('')
  const [customRoomName, setCustomRoomName] = useState('')
  // Item picker modal state (if needed)
  const [showItemsModal, setShowItemsModal] = useState(false)
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [loadingItemsModal, setLoadingItemsModal] = useState(false)

  // For FloatingButton animation
  const scrollY = useRef(new Animated.Value(0)).current
  const floatingOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  // -------------------- Modal & Room Functions --------------------
  const openAddRoomModal = () => {
    setSelectedRoomType('')
    setCustomRoomName('')
    setShowAddRoomModal(true)
  }

  const handleAddRoom = (roomName = '') => {
    const newRoom = {
      id: uuidv4(),
      name: roomName.trim() || `Room ${rooms.length + 1}`,
      measurements: [],
      photos: [],
    }
    setRooms([...rooms, newRoom])
  }

  const handleDeleteRoom = roomId => {
    setRooms(rooms.filter(room => room.id !== roomId))
  }

  const handleAddMeasurement = roomId => {
    const newMeasurement = { id: uuidv4(), description: '', quantity: '' }
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? { ...room, measurements: [...room.measurements, newMeasurement] }
          : room
      )
    )
  }

  const handleMeasurementChange = (roomId, measurementId, field, value) => {
    setRooms(prev =>
      prev.map(room => {
        if (room.id !== roomId) return room
        const updatedMeasurements = room.measurements.map(m =>
          m.id === measurementId ? { ...m, [field]: value } : m
        )
        return { ...room, measurements: updatedMeasurements }
      })
    )
  }

  const handleDeleteMeasurement = (roomId, measurementId) => {
    setRooms(prev =>
      prev.map(room => {
        if (room.id !== roomId) return room
        return {
          ...room,
          measurements: room.measurements.filter(m => m.id !== measurementId),
        }
      })
    )
  }

  const handleAddPhoto = async roomId => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Camera roll permission is required to select photos.'
        )
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
      })

      if (result.canceled) return
      if (result.assets && result.assets.length > 0) {
        const uploadPromises = result.assets.map(async asset => {
          const response = await fetch(asset.uri)
          const blob = await response.blob()
          const fileName = asset.fileName || `${uuidv4()}.jpg`
          const storagePath = `remediationPhotos/${projectId}/${fileName}`
          const storageRef = ref(storage, storagePath)
          await uploadBytes(storageRef, blob)
          const downloadURL = await getDownloadURL(storageRef)
          return { storagePath, downloadURL }
        })

        const photosArray = await Promise.all(uploadPromises)

        setRooms(prevRooms =>
          prevRooms.map(room => {
            if (room.id === roomId) {
              return {
                ...room,
                photos: room.photos
                  ? [...room.photos, ...photosArray]
                  : photosArray,
              }
            }
            return room
          })
        )
      }
    } catch (error) {
      console.error('Error selecting/uploading images:', error)
      Alert.alert(
        'Error',
        'Could not select or upload photos. Please try again.'
      )
    }
  }

  const handleDeletePhoto = (roomId, photoUri) => {
    setRooms(prev =>
      prev.map(room => {
        if (room.id !== roomId) return room
        return {
          ...room,
          photos: room.photos.filter(photo => {
            let uri = ''
            if (typeof photo === 'string') {
              uri = photo
            } else if (photo && photo.downloadURL) {
              uri = photo.downloadURL
            }
            return uri !== photoUri
          }),
        }
      })
    )
  }

  // -------------------- Fetch Remediation Data --------------------
  useEffect(() => {
    const fetchRemediationData = async () => {
      try {
        const docRef = doc(firestore, 'tickets', projectId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          const remediation = data.remediationData
            ? data.remediationData
            : { rooms: [] }
          setRooms(remediation.rooms || [])
        } else {
          Alert.alert('Error', 'No remediation data found.')
        }
      } catch (error) {
        console.error('Error loading remediation data:', error)
        Alert.alert('Error', 'Failed to load data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchRemediationData()
  }, [projectId])

  // -------------------- Save Remediation Data --------------------
  const handleSaveRemediationData = async complete => {
    try {
      const remediationData = { rooms, updatedAt: new Date() }
      await updateDoc(doc(firestore, 'tickets', projectId), {
        remediationData,
        remediationRequired: false,
        remediationComplete: complete, // true for complete, false for continue later
      })
      Alert.alert(
        'Success',
        complete
          ? 'Remediation complete and updated successfully.'
          : 'Remediation updated. You can continue editing later.'
      )
      if (complete) {
        router.push('/(tabs)')
      }
    } catch (error) {
      console.error('Error saving remediation data:', error)
      Alert.alert('Error', 'Failed to update data. Please try again.')
    }
  }

  // -------------------- Header Options --------------------
  const headerOptions = [
    {
      label: 'Save & Complete',
      onPress: () => handleSaveRemediationData(true),
    },
    {
      label: 'Save & Continue',
      onPress: () => handleSaveRemediationData(false),
    },
  ]

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithOptions
        title="Edit Remediation"
        onBack={() => router.back()}
        options={headerOptions}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            key={projectId}
          >
            {/* List of Rooms */}
            {rooms.map(room => (
              <View key={room.id} style={styles.roomContainer}>
                <View style={styles.roomHeader}>
                  <TextInput
                    style={[styles.roomTitle, { flex: 1 }]}
                    value={room.name}
                    onChangeText={text =>
                      setRooms(prev =>
                        prev.map(r =>
                          r.id === room.id ? { ...r, name: text } : r
                        )
                      )
                    }
                  />
                  <TouchableOpacity onPress={() => handleDeleteRoom(room.id)}>
                    <Text style={styles.deleteRoomText}>Delete Room</Text>
                  </TouchableOpacity>
                </View>

                {/* Render Measurements */}
                {room.measurements.map(measurement => (
                  <View key={measurement.id} style={styles.measurementRow}>
                    <TextInput
                      style={[styles.measurementInput, { flex: 1 }]}
                      placeholder="Description (select item)"
                      value={measurement.description || ''}
                      onChangeText={val =>
                        handleMeasurementChange(
                          room.id,
                          measurement.id,
                          'description',
                          val
                        )
                      }
                    />
                    <TextInput
                      style={[
                        styles.measurementInput,
                        { width: 100, marginLeft: 8 },
                      ]}
                      placeholder="Qty (e.g. 30)"
                      value={
                        measurement.quantity
                          ? measurement.quantity.toString()
                          : ''
                      }
                      keyboardType="numeric"
                      onChangeText={val => {
                        const numericValue = parseFloat(val) || ''
                        handleMeasurementChange(
                          room.id,
                          measurement.id,
                          'quantity',
                          numericValue
                        )
                      }}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        handleDeleteMeasurement(room.id, measurement.id)
                      }
                      style={styles.deleteMeasurementButton}
                    >
                      <Text style={styles.deleteMeasurementButtonText}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Button to add a new measurement */}
                <TouchableOpacity
                  onPress={() => handleAddMeasurement(room.id)}
                  style={styles.addMeasurementButton}
                >
                  <Text style={styles.addMeasurementButtonText}>
                    + Add Measurement
                  </Text>
                </TouchableOpacity>

                {/* Render Photos */}
                {room.photos &&
                  Array.isArray(room.photos) &&
                  room.photos.length > 0 && (
                    <ScrollView horizontal style={styles.photoRow}>
                      {room.photos.map((photo, index) => {
                        let photoUri = ''
                        if (typeof photo === 'string') {
                          photoUri = photo
                        } else if (photo && photo.downloadURL) {
                          photoUri = photo.downloadURL
                        }
                        if (!photoUri) return null
                        return (
                          <View key={photoUri + index} style={styles.photoItem}>
                            <Image
                              source={{ uri: photoUri }}
                              style={styles.photoImage}
                            />
                            <TouchableOpacity
                              onPress={() =>
                                handleDeletePhoto(room.id, photoUri)
                              }
                              style={styles.deletePhotoButton}
                            >
                              <Text style={styles.deletePhotoButtonText}>
                                Remove
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )
                      })}
                    </ScrollView>
                  )}

                {/* Button to add photos */}
                <TouchableOpacity
                  onPress={() => handleAddPhoto(room.id)}
                  style={styles.addPhotoButton}
                >
                  <Text style={styles.addPhotoButtonText}>+ Add Photo</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <View style={{ position: 'absolute', right: 25, bottom: 50 }}>
        <FloatingButton
          onPress={openAddRoomModal}
          title="Room"
          animatedOpacity={floatingOpacity}
          iconName="plus.circle"
          size={30}
        />
      </View>

      {/* Photo Modal */}
      {photoModalVisible && (
        <Modal
          visible={photoModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPhotoModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Image
                source={{ uri: selectedPhoto }}
                style={styles.modalImage}
              />
              <TouchableOpacity
                onPress={() => setPhotoModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F7',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#2C3E50',
  },
  quickRoomsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickRoomButton: {
    backgroundColor: '#3498DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 4,
  },
  quickRoomButtonText: {
    color: '#FFF',
    fontSize: 14,
  },
  addGenericRoomButton: {
    backgroundColor: '#95A5A6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
    alignSelf: 'flex-start',
  },
  addGenericRoomButtonText: {
    color: '#FFF',
    fontSize: 14,
  },
  roomContainer: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  deleteRoomText: {
    color: 'red',
    fontWeight: '600',
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  measurementInput: {
    backgroundColor: '#f2f2f2',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: '#2C3E50',
  },
  deleteMeasurementButton: {
    backgroundColor: '#e74c3c',
    marginLeft: 8,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteMeasurementButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addMeasurementButton: {
    marginTop: 8,
    backgroundColor: '#27ae60',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  addMeasurementButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  photoRow: {
    marginTop: 10,
  },
  photoItem: {
    marginRight: 8,
    position: 'relative',
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deletePhotoButtonText: {
    color: '#FFF',
    fontSize: 10,
  },
  addPhotoButton: {
    marginTop: 8,
    backgroundColor: '#2980B9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  addPhotoButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalImage: {
    width: 300,
    height: 300,
    borderRadius: 8,
  },
  modalCloseButton: {
    marginTop: 12,
    backgroundColor: '#2C3E50',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalCloseButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    fontSize: 16,
    marginTop: 20,
  },
})
