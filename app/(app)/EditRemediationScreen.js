import React, { useState, useEffect } from 'react'
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
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { v4 as uuidv4 } from 'uuid'
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { firestore, storage } from '@/firebaseConfig'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export default function EditRemediationScreen() {
  const router = useRouter()
  const { projectId } = useLocalSearchParams()

  // Local state for remediation data (rooms, measurements, photos)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  // Example room shortcuts.
  const ROOM_OPTIONS = [
    'Bedroom',
    'Kitchen',
    'Garage',
    'Living Room',
    'Bathroom',
  ]

  // -------------------- Photo Modal State --------------------
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoModalVisible, setPhotoModalVisible] = useState(false)

  // -------------------- Room / Measurement Functions --------------------
  // Add a new room.
  const handleAddRoom = (roomName = '') => {
    const newRoom = {
      id: uuidv4(),
      name: roomName.trim() || `Room ${rooms.length + 1}`,
      measurements: [],
      photos: [],
    }
    setRooms([...rooms, newRoom])
  }

  // Delete a room.
  const handleDeleteRoom = roomId => {
    setRooms(rooms.filter(room => room.id !== roomId))
  }

  // Add a new measurement to a given room.
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

  // Update measurement values.
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

  // Delete a measurement.
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

  // -------------------- Photo Functions --------------------
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

  // Delete a photo from a room.
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

  // -------------------- Items Search Modal Functions --------------------

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
  const handleSaveRemediationData = async () => {
    try {
      const remediationData = { rooms, updatedAt: new Date() }
      await updateDoc(doc(firestore, 'tickets', projectId), {
        remediationData,
        remediationRequired: false,
      })
      Alert.alert('Success', 'Remediation data updated successfully.')
      router.push('/(tabs)')
    } catch (error) {
      console.error('Error saving remediation data:', error)
      Alert.alert('Error', 'Failed to update data. Please try again.')
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
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
            <Text style={styles.title}>Edit Remediation Measurements</Text>

            {/* Quick Buttons for common room names */}
            <View style={styles.quickRoomsRow}>
              {ROOM_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option}
                  style={styles.quickRoomButton}
                  onPress={() => handleAddRoom(option)}
                >
                  <Text style={styles.quickRoomButtonText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Button to add a generic room */}
            <TouchableOpacity
              onPress={() => handleAddRoom()}
              style={styles.addGenericRoomButton}
            >
              <Text style={styles.addGenericRoomButtonText}>
                + Add Generic Room
              </Text>
            </TouchableOpacity>

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
                      value={measurement.name || ''}
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

            {/* Save Button */}
            {rooms.length > 0 && (
              <TouchableOpacity
                onPress={handleSaveRemediationData}
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>
                  Save Remediation Report
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Photo Modal */}
      {photoModalVisible && (
        <PhotoModal
          visible={photoModalVisible}
          photo={selectedPhoto}
          onClose={() => setPhotoModalVisible(false)}
        />
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
  saveButton: {
    marginTop: 20,
    backgroundColor: '#2C3E50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  exportButton: {
    marginTop: 20,
    backgroundColor: '#2980B9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    fontSize: 16,
    marginTop: 20,
  },
})
