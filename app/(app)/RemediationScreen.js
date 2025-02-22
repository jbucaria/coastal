'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Image,
  Animated,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Picker } from '@react-native-picker/picker'
import { v4 as uuidv4 } from 'uuid'
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { firestore, storage } from '@/firebaseConfig'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { FloatingButton } from '@/components/FloatingButton'

/** Predefined room types */
const ROOM_OPTIONS = ['Bedroom', 'Kitchen', 'Garage', 'Living Room', 'Bathroom']

const RemediationScreen = () => {
  const router = useRouter()
  const { projectId } = useLocalSearchParams()

  // Rooms (each has measurements and photos)
  const [rooms, setRooms] = useState([])

  // For the Items picker modal
  const [showItemsModal, setShowItemsModal] = useState(false)
  const [currentRoomId, setCurrentRoomId] = useState(null)
  const [currentMeasurementId, setCurrentMeasurementId] = useState(null)
  const [allItems, setAllItems] = useState([])
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [loadingItemsModal, setLoadingItemsModal] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState(null)

  // For the "Add Room" modal
  const [showAddRoomModal, setShowAddRoomModal] = useState(false)
  const [selectedRoomType, setSelectedRoomType] = useState('')
  const [customRoomName, setCustomRoomName] = useState('')

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
      measurements: [],
      photos: [],
    }
    setRooms(prev => [...prev, newRoom])
    setShowAddRoomModal(false)
  }

  const handleDeleteRoom = roomId => {
    setRooms(prev => prev.filter(room => room.id !== roomId))
  }

  // -------------------- Measurement Logic --------------------
  const handleCreateMeasurement = roomId => {
    const newMeasurementId = uuidv4()
    const newMeasurement = {
      id: newMeasurementId,
      name: '',
      description: '',
      quantity: 0,
      itemId: '',
      unitPrice: 0,
    }
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? { ...room, measurements: [...room.measurements, newMeasurement] }
          : room
      )
    )
    setCurrentRoomId(roomId)
    setCurrentMeasurementId(newMeasurementId)
    openItemsModal()
  }

  const handleDeleteMeasurement = (roomId, measurementId) => {
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? {
              ...room,
              measurements: room.measurements.filter(
                m => m.id !== measurementId
              ),
            }
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

  // -------------------- Item Picker Modal --------------------
  const fetchItemsFromFirestore = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestore, 'items'))
      const itemsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      setAllItems(itemsData)
    } catch (error) {
      console.error('Error fetching items:', error)
      Alert.alert('Error', 'Failed to load items from database.')
    }
  }

  const openItemsModal = () => {
    setShowItemsModal(true)
    if (allItems.length === 0) {
      setLoadingItemsModal(true)
      fetchItemsFromFirestore().finally(() => setLoadingItemsModal(false))
    }
  }

  const handleSelectItem = item => {
    setRooms(prev =>
      prev.map(room => {
        if (room.id !== currentRoomId) return room
        const updatedMeasurements = room.measurements.map(m =>
          m.id === currentMeasurementId
            ? {
                ...m,
                name: item.name, // sets measurement.name
                description: item.description,
                itemId: item.id,
                unitPrice: item.unitPrice,
              }
            : m
        )
        return { ...room, measurements: updatedMeasurements }
      })
    )
    setShowItemsModal(false)
    setItemSearchQuery('')
    setCurrentRoomId(null)
    setCurrentMeasurementId(null)
  }

  // -------------------- Photos Logic --------------------
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
          const storagePath = `remediationPhotos/${projectId}/${fileName}`
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

  // -------------------- Save Data to Firestore --------------------
  const handleSaveRemediationData = async () => {
    try {
      // For each room, add a roomName field to each measurement (if not already present)
      const updatedRooms = rooms.map(room => ({
        ...room,
        measurements: room.measurements.map(m => ({
          // Preserve existing measurement properties, and add roomName
          ...m,
          // Only add roomName if it isn’t already set (to avoid overwriting)
          roomName: m.roomName || room.roomTitle,
        })),
      }))

      const remediationData = {
        rooms: updatedRooms,
        updatedAt: new Date(),
      }

      await updateDoc(doc(firestore, 'tickets', projectId), {
        remediationData,
        remediationRequired: false,
        remediationComplete: true,
      })
      Alert.alert('Success', 'Remediation data saved successfully.')
      router.back()
    } catch (error) {
      console.error('Error saving remediation data:', error)
      Alert.alert('Error', 'Failed to save data. Please try again.')
    }
  }

  // -------------------- Render --------------------
  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithOptions title="Remediation" onBack={() => router.back()} />

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

                {/* Measurements */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Measurements</Text>
                  {room.measurements.map(measurement => (
                    <View key={measurement.id} style={styles.measurementRow}>
                      <TextInput
                        style={[styles.measurementInput, { flex: 1 }]}
                        placeholder="Item Name"
                        value={measurement.name}
                        onFocus={() => {
                          setCurrentRoomId(room.id)
                          setCurrentMeasurementId(measurement.id)
                          openItemsModal()
                        }}
                        editable={false}
                      />
                      <TextInput
                        style={[styles.measurementInput, { width: 70 }]}
                        placeholder="Qty"
                        keyboardType="numeric"
                        value={measurement.quantity.toString()}
                        onChangeText={val => {
                          const numericValue = parseFloat(val) || 0
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
                        <Text style={styles.deleteMeasurementButtonText}>
                          X
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={() => handleCreateMeasurement(room.id)}
                    style={styles.addMeasurementButton}
                  >
                    <Text style={styles.addMeasurementButtonText}>
                      + Measurement
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Photos */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Photos</Text>
                  {room.photos.length > 0 ? (
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

            {/* Save Button */}
            {rooms.length > 0 && (
              <TouchableOpacity
                onPress={handleSaveRemediationData}
                style={styles.saveButton}
              >
                <Text style={styles.saveButtonText}>Save Remediation</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Floating Button */}
      <View style={{ position: 'absolute', right: 25, bottom: 50 }}>
        <FloatingButton
          onPress={openAddRoomModal}
          title="Room"
          animatedOpacity={floatingOpacity}
        />
      </View>

      {/* Items Modal */}
      {showItemsModal && (
        <Modal
          visible={showItemsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowItemsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.itemsModalContainer}>
              <Text style={styles.modalTitle}>Select an Item</Text>
              <TextInput
                style={styles.itemSearchInput}
                placeholder="Search items..."
                value={itemSearchQuery}
                onChangeText={setItemSearchQuery}
              />
              {loadingItemsModal ? (
                <ActivityIndicator size="small" color="#1DA1F2" />
              ) : (
                <Picker
                  selectedValue={selectedItemId}
                  onValueChange={(itemId, itemIndex) =>
                    setSelectedItemId(itemId)
                  }
                >
                  {allItems
                    .filter(item =>
                      (item.name || '')
                        .toLowerCase()
                        .includes(itemSearchQuery.toLowerCase())
                    )
                    .map(item => (
                      <Picker.Item
                        key={item.id}
                        label={`${item.name} - $${item.unitPrice}`}
                        value={item.id}
                      />
                    ))}
                </Picker>
              )}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  onPress={() => {
                    const item = allItems.find(i => i.id === selectedItemId)
                    if (item) {
                      handleSelectItem(item)
                    } else {
                      Alert.alert(
                        'Select an item',
                        'Please select an item from the list.'
                      )
                    }
                  }}
                  style={styles.modalConfirmButton}
                >
                  <Text style={styles.modalConfirmButtonText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowItemsModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Add Room Modal */}
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
              {/* Room Options Row */}
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

export default RemediationScreen

const styles = StyleSheet.create({
  /** Base Container */
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background for a Twitter-like feel
  },
  // ---------- Top Bar (similar to Twitter) ----------
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DA1F2', // Twitter's brand color
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  // ---------- Scroll Container ----------
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },

  // ---------- Room Card ----------
  roomCard: {
    backgroundColor: '#F5F8FA', // Slightly off-white (similar to Twitter's timeline background)
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E1E8ED', // Light Twittery border
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
    color: '#14171A', // Twitter uses near-black for text
  },
  deleteRoomText: {
    color: '#E0245E', // Twitter's “like” color: pinkish/red
    fontWeight: '600',
  },
  // ---------- Sections (Measurements, Photos) ----------
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14171A',
    marginBottom: 8,
  },
  // ---------- Measurements ----------
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  measurementInput: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#14171A',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  deleteMeasurementButton: {
    backgroundColor: '#E0245E',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  deleteMeasurementButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addMeasurementButton: {
    backgroundColor: '#17BF63', // Twitter's "retweet" green
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  addMeasurementButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  selectItemButton: {
    backgroundColor: '#1DA1F2',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectItemButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // ---------- Photos ----------
  photoRow: {
    flexDirection: 'row',
  },
  noPhotoText: {
    color: '#657786', // A grey color from Twitter's palette
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
    backgroundColor: '#1DA1F2',
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
  // ---------- Save Button ----------
  saveButton: {
    backgroundColor: '#1DA1F2',
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
  // ---------- Floating "Add Room" Button ----------
  floatingAddRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DA1F2',
    borderRadius: 24,
    padding: 16,
  },
  floatingAddRoomButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // ---------- Modal Styles ----------
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsModalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 16,
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
    backgroundColor: '#17BF63',
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
  // ---------- Room Type Options (Add Room Modal) ----------
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
    backgroundColor: '#1DA1F2',
    borderColor: '#1DA1F2',
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
