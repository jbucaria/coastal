import React, { useState, useEffect, useCallback } from 'react'
import {
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  Image,
  Modal,
  View,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore'
import { storage, firestore } from '@/firebaseConfig'
import { getStorage, ref, deleteObject } from 'firebase/storage'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as Linking from 'expo-linking'
import * as MediaLibrary from 'expo-media-library'
import { router } from 'expo-router'

import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { useThemeColor } from '@/hooks/useThemeColor'
import { IconSymbol } from '@/components/ui/IconSymbol'

const ReportsPage = () => {
  const [reports, setReports] = useState([])
  const backgroundColor = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')
  const [modalVisible, setModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)

  // We removed isEditing here since we’re pushing to another screen for editing
  const [editedReport, setEditedReport] = useState({})
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // 2) State for download progress modal
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, 'inspectionReports'),
      snapshot => {
        const allReports = []
        snapshot.forEach(doc => {
          allReports.push({ id: doc.id, ...doc.data() })
        })
        setReports(allReports)
      },
      error => {
        console.error('Error fetching reports:', error)
        Alert.alert('Error', 'Could not fetch reports')
      }
    )
    return () => unsubscribe()
  }, [])

  const handleReportPress = report => {
    setSelectedReport(report)
    setEditedReport({ ...report })
    setModalVisible(true)
  }

  const filteredReports = reports.filter(report =>
    report.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleViewReport = async () => {
    if (!selectedReport || !selectedReport.pdfDownloadURL) {
      Alert.alert('Error', 'No PDF URL available for this report')
      return
    }
    try {
      await Linking.openURL(selectedReport.pdfDownloadURL)
    } catch (error) {
      console.error('Error opening report:', error)
      Alert.alert('Error', `Failed to open the report: ${error.message}`)
    }
  }

  const handleDownloadReport = async () => {
    if (!selectedReport || !selectedReport.pdfDownloadURL) return
    try {
      const fileUri = `${FileSystem.documentDirectory}${selectedReport.pdfFileName}`
      await FileSystem.downloadAsync(selectedReport.pdfDownloadURL, fileUri)
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Report',
      })
    } catch (error) {
      console.error('Error downloading report:', error)
      Alert.alert('Error', 'Failed to download the report')
    }
  }

  const extractStoragePath = downloadURL => {
    try {
      const url = new URL(downloadURL)
      let path = decodeURIComponent(
        url.pathname.substring(url.pathname.indexOf('/o/') + 3)
      )
      path = path.split('?')[0] // Remove query parameters
      return path
    } catch (error) {
      console.error('Error extracting path:', error, 'URL:', downloadURL)
      return null
    }
  }

  const handleDeleteReport = async () => {
    if (!selectedReport) return

    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this report and all its photos?',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Deletion cancelled'),
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            try {
              const storage = getStorage()
              const deletePromises = []

              // Correctly handling the photos array of objects
              if (selectedReport.photos && selectedReport.photos.length > 0) {
                for (let photo of selectedReport.photos) {
                  if (photo.uri) {
                    let url = new URL(photo.uri)
                    let path = decodeURIComponent(
                      url.pathname.substring(url.pathname.indexOf('/o/') + 3)
                    )
                    path = path.split('?')[0] // Remove query parameters

                    const photoRef = ref(storage, path)
                    deletePromises.push(deleteObject(photoRef))
                  } else {
                    console.warn('Photo object has no URI:', photo)
                  }
                }

                // Construct filename
                const pdfFileName = selectedReport.pdfFileName
                const pdfPath = `inspectionReports/${pdfFileName}`
                console.log('PDF Path:', pdfPath)
                // Delete the PDF file
                const pdfRef = ref(storage, pdfPath)
                deletePromises.push(deleteObject(pdfRef))

                // Wait for all deletions to complete
                await Promise.all(deletePromises)
                console.log('All photos deleted successfully')
              }

              // Delete the report document from Firestore
              await deleteDoc(
                doc(firestore, 'inspectionReports', selectedReport.id)
              )
              setModalVisible(false) // Changed from setModalOptionsVisible to setModalVisible
              console.log('Report deleted successfully')
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to delete the report or its photos: ' + error.message
              )
              console.error('Deletion error:', error)
            }
          },
        },
      ],
      { cancelable: false }
    )
  }
  // 3) This function saves photos to the iOS Photo Library
  const requestMediaLibraryPermissions = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'App needs photo library permission to save images.'
      )
      return false
    }
    return true
  }

  const handleDownloadPhotos = useCallback(async () => {
    if (
      !selectedReport ||
      !selectedReport.photos ||
      selectedReport.photos.length === 0
    ) {
      Alert.alert('Error', 'No photos available for this report')
      return
    }

    const hasPermission = await requestMediaLibraryPermissions()
    if (!hasPermission) return

    setIsDownloading(true)
    setDownloadProgress(0)

    try {
      let downloadedPhotos = 0
      const updateProgress = setInterval(() => {
        setDownloadProgress(prevProgress => {
          // Prevent progress from exceeding 100%
          return Math.min(
            100,
            (downloadedPhotos / selectedReport.photos.length) * 100 +
              Math.random() * 10
          ) // Add some randomness for smoother transition
        })
      }, 500) // Update every half second for smoother progress

      for (let i = 0; i < selectedReport.photos.length; i++) {
        const photo = selectedReport.photos[i]
        const localFileName = `${photo.label || 'photo'}_${i}.jpg`
        const localUri = FileSystem.documentDirectory + localFileName

        const downloadResult = await FileSystem.downloadAsync(
          photo.uri,
          localUri
        )
        console.log('Downloaded photo:', downloadResult.uri)

        await MediaLibrary.createAssetAsync(downloadResult.uri)
        downloadedPhotos++ // Increment after each successful download

        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay to ensure visibility
      }

      clearInterval(updateProgress) // Stop updating progress after all photos are downloaded
      setDownloadProgress(100) // Ensure progress shows 100%

      Alert.alert(
        'Saved to Library',
        `All ${selectedReport.photos.length} photo(s) have been saved to your photo library.`,
        [{ text: 'OK' }]
      )
    } catch (error) {
      console.error('Error saving photos:', error)
      Alert.alert('Error', 'Failed to save photos. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }, [selectedReport, requestMediaLibraryPermissions])
  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleReportPress(item)}
      style={styles.reportContainer}
    >
      <ThemedView style={styles.cardShadow}>
        <ThemedView style={styles.card}>
          {item.photos && item.photos.length > 0 && (
            <Image
              source={{ uri: item.photos[0].uri }}
              style={styles.reportImage}
              resizeMode="cover"
            />
          )}
          <ThemedView style={styles.reportInfo}>
            <ThemedText type="subtitle">{item.address}</ThemedText>
            <ThemedText style={styles.dateText}>{item.date}</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        <TextInput
          style={styles.searchBar}
          onChangeText={setSearchQuery}
          value={searchQuery}
          placeholder="Search by address..."
          placeholderTextColor={textColor}
        />
        <FlatList
          data={filteredReports}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />

        {/* ====== MAIN MODAL for Options ====== */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(!modalVisible)
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <View style={styles.optionContainer}>
                <View style={styles.iconRow}>
                  <TouchableOpacity
                    style={styles.iconOption}
                    onPress={handleViewReport}
                  >
                    <IconSymbol name="doc.text" size={50} color="#2C3E50" />
                    <ThemedText style={styles.iconLabel}>View</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconOption}
                    onPress={handleDownloadReport}
                  >
                    <IconSymbol
                      name="arrow.down.doc"
                      size={50}
                      color="#2C3E50"
                    />
                    <ThemedText style={styles.iconLabel}>Download</ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={styles.iconRow}>
                  <TouchableOpacity
                    style={styles.iconOption}
                    onPress={() => {
                      // Navigate to Edit page in expo-router
                      // Or you could do setIsEditing(true) if you wanted an internal editor
                      router.push(`/editReportScreen?id=${selectedReport.id}`)
                      setModalVisible(false)
                    }}
                  >
                    <IconSymbol name="pencil" size={50} color="#2C3E50" />
                    <ThemedText style={styles.iconLabel}>Edit</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconOption}
                    onPress={handleDeleteReport}
                  >
                    <IconSymbol name="trash" size={50} color="#2C3E50" />
                    <ThemedText style={styles.iconLabel}>Delete</ThemedText>
                  </TouchableOpacity>
                </View>

                {/* New Row for "Download Photos" */}
                <View style={styles.iconRow}>
                  <TouchableOpacity
                    style={styles.iconOption}
                    onPress={handleDownloadPhotos}
                  >
                    <IconSymbol name="photo" size={50} color="#2C3E50" />
                    <ThemedText style={styles.iconLabel}>
                      Save Photos
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setModalVisible(false)
                  }}
                >
                  <ThemedText style={styles.closeButtonText}>Close</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ====== SECOND MODAL for Download Progress ====== */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={isDownloading}
          onRequestClose={() => setIsDownloading(false)}
        >
          <View style={styles.progressModalContainer}>
            <View style={styles.progressModalContent}>
              <ThemedText style={styles.downloadingText}>
                Saving Photos...
              </ThemedText>
              <ThemedText style={styles.downloadingSubtext}>
                {downloadProgress.toFixed(0)}%
              </ThemedText>

              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${downloadProgress}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  )
}

export default ReportsPage

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0', // Light gray background
  },
  list: {
    paddingBottom: 20,
  },
  reportContainer: {
    marginBottom: 20,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  reportImage: {
    width: 100,
    height: 100,
  },
  reportInfo: {
    flex: 1,
    padding: 15,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    marginBottom: 5,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end', // so the modalView appears at the bottom
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    // position: 'absolute',
    // bottom: 0,
    // left: 0,
    // right: 0,
    // height: '50%', // you can adjust this or remove if you want it auto-sized
  },
  optionContainer: {
    padding: 20,
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  iconOption: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    marginTop: 8,
    color: '#2C3E50',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 3,
    marginTop: 10,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchBar: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
  },

  // Progress Modal Styles
  progressModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // semi-transparent overlay
  },
  progressModalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  downloadingText: {
    fontSize: 18,
    marginBottom: 10,
    color: '#2C3E50',
  },
  downloadingSubtext: {
    fontSize: 16,
    marginBottom: 20,
    color: '#2C3E50',
  },
  progressBarContainer: {
    width: '100%',
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2C3E50',
  },
})
