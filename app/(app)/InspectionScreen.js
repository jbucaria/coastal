'use client'

import React, { useState, useRef, useEffect } from 'react'
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
import { v4 as uuidv4 } from 'uuid'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore, storage } from '@/firebaseConfig'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { FloatingButton } from '@/components/FloatingButton'
import { rephraseText } from '@/utils/rephraseText'
import { pickAndUploadPhotos } from '@/utils/photoUpload'
import AddRoomModal from '@/components/AddRoomModal'
import PhotoGallery from '@/components/PhotoGallery'
import useProjectStore from '@/store/useProjectStore'

const InspectionScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const projectIdFromParams = params.projectId
  const { projectId: storeProjectId } = useProjectStore()
  const ticketData = params.ticketData ? JSON.parse(params.ticketData) : null

  // Use the local param if available; otherwise, fall back to the global store.
  const projectId = projectIdFromParams ?? storeProjectId

  // Rooms state – each room now has inspection fields and photos
  const [rooms, setRooms] = useState(ticketData?.inspectionData?.rooms || [])
  const HEADER_HEIGHT = 80
  // Modal state for adding a room
  const [showAddRoomModal, setShowAddRoomModal] = useState(false)
  const [selectedRoomType, setSelectedRoomType] = useState('')
  const [customRoomName, setCustomRoomName] = useState('')

  // State for report generation
  const [generatingReport, setGeneratingReport] = useState(false)
  const [report, setReport] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)

  const scrollY = useRef(new Animated.Value(0)).current
  const floatingOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  useEffect(() => {
    console.log('Project ID in inspectionscreen:', projectId)
    // ...rest of fetchTicket code
  }, [projectId])

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

  const handleAddPhoto = async (roomId, projectId) => {
    const folder = `inspectionPhotos/${projectId}`
    const photosArray = await pickAndUploadPhotos({ folder, quality: 0.5 })
    if (photosArray.length > 0) {
      setRooms(prev =>
        prev.map(room =>
          room.id === roomId
            ? { ...room, photos: [...room.photos, ...photosArray] }
            : room
        )
      )
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

  // -------------------- Generate Report (Rephrase) Logic --------------------
  const handleGenerateReport = async () => {
    setGeneratingReport(true)
    try {
      // Aggregate text from each room including room name, reason, and findings
      const aggregatedText = rooms
        .map(
          room =>
            `Room: ${room.roomTitle}\nReason for Inspection: ${room.reasonForInspection}\nInspection Findings: ${room.inspectionFindings}`
        )
        .join('\n\n')
      // Construct a prompt that gives context to the rephraseText function
      const prompt = `You are a professional mold remediation consultant. Please rephrase the following inspection findings into a clear, detailed, and organized report:\n\n${aggregatedText}\n\nRephrased Report:`
      const generatedReport = await rephraseText(prompt)
      setReport(generatedReport)
      setShowReportModal(true)
    } catch (error) {
      console.error('Error generating report:', error)
      Alert.alert('Error', 'Failed to generate report. Please try again.')
    }
    setGeneratingReport(false)
  }

  // Handler to approve and save the generated report to Firestore
  const handleApproveReport = async () => {
    try {
      await updateDoc(doc(firestore, 'tickets', projectId), {
        generatedReport: report,
      })
      Alert.alert('Success', 'Report saved successfully.')
      setShowReportModal(false)
    } catch (error) {
      console.error('Error saving generated report:', error)
      Alert.alert('Error', 'Failed to save the generated report.')
    }
  }

  // -------------------- Render --------------------
  // Update header options to include "Generate Report"
  const headerOptions = [
    { label: 'Generate Report', onPress: handleGenerateReport },
    { label: 'Save Inspection', onPress: handleSaveInspectionData },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithOptions
        title="Inspection"
        onBack={() => router.back()}
        options={headerOptions}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={40}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContainer,
              { paddingTop: HEADER_HEIGHT },
            ]}
          >
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
                    <PhotoGallery
                      photos={room.photos.map(photo => photo.downloadURL)}
                      onRemovePhoto={index => {
                        const photoToRemove = room.photos[index]
                        handleDeletePhoto(room.id, photoToRemove.storagePath)
                      }}
                    />
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

            {generatingReport && (
              <ActivityIndicator
                size="large"
                color="#1DA1F2"
                style={styles.loadingIndicator}
              />
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <View style={{ position: 'absolute', right: 25, bottom: 50 }}>
        <FloatingButton
          onPress={openAddRoomModal}
          title="Add Room"
          animatedOpacity={floatingOpacity}
          iconName="plus.circle"
          size={28}
        />
      </View>
      {showAddRoomModal && (
        <AddRoomModal
          visible={showAddRoomModal}
          onClose={() => setShowAddRoomModal(false)}
          selectedRoomType={selectedRoomType}
          setSelectedRoomType={setSelectedRoomType}
          customRoomName={customRoomName}
          setCustomRoomName={setCustomRoomName}
          onConfirm={handleConfirmAddRoom}
        />
      )}
      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reportModalContainer}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.generatedText}>{report}</Text>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={handleApproveReport}
                style={styles.approveButton}
              >
                <Text style={styles.buttonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowReportModal(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingIndicator: {
    marginTop: 20,
  },
  reportModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  generatedText: {
    fontSize: 16,
    color: '#14171A',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  approveButton: {
    backgroundColor: '#0073BC',
    padding: 12,
    borderRadius: 6,
    width: '40%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0245E',
    padding: 12,
    borderRadius: 6,
    width: '40%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
})
