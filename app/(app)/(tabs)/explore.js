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
  Text,
} from 'react-native'
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
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
  const textColor = useThemeColor({}, 'text')
  const [modalVisible, setModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [editedReport, setEditedReport] = useState(null)
  const [projects, setProjects] = useState([])
  const [filters, setFilters] = useState({
    remediationRequired: false,
    equipmentOnSite: false,
    siteComplete: false,
  })

  useEffect(() => {
    const projectsRef = collection(firestore, 'projects')
    let q = query(
      projectsRef,
      where('inspectionComplete', '==', true), // Always fetch completed inspections
      orderBy('createdAt', 'desc')
    )

    // Apply additional filters based on state
    Object.entries(filters).forEach(([field, value]) => {
      if (value) {
        q = query(q, where(field, '==', true))
      }
    })

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        setReports(projectsData) // No need for applyFilters since we apply in the query
      },
      error => {
        console.error('Error fetching projects:', error)
        Alert.alert(
          'Error',
          'Could not fetch projects. Please try again later.'
        )
      }
    )

    return () => unsubscribe()
  }, [filters])

  // New function to apply filters
  const applyFilters = projects => {
    return projects.filter(report => {
      if (filters.allSites) return true
      if (filters.remediationRequired && !report.remediationRequired)
        return false
      if (filters.equipmentOnSite && !report.equipmentOnSite) return false
      if (filters.siteComplete && !report.siteComplete) return false
      return true
    })
  }

  const handleReportPress = report => {
    setSelectedReport(report)
    setEditedReport({ ...report })
    setModalVisible(true)
  }

  const filteredReports = reports.filter(report =>
    report.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
              setIsDeleting(true)
              const storage = getStorage()
              const deletePromises = []

              // Delete photos if they exist
              if (selectedReport.photos && selectedReport.photos.length > 0) {
                for (let photo of selectedReport.photos) {
                  if (photo.uri) {
                    // Extract the storage path from the URI
                    let url = new URL(photo.uri)
                    let path = decodeURIComponent(
                      url.pathname.substring(url.pathname.indexOf('/o/') + 3)
                    )
                    path = path.split('?')[0] // Remove query parameters

                    const photoRef = ref(storage, path)
                    deletePromises.push(deleteObject(photoRef))
                  }
                }
              }

              // Delete the PDF if it exists
              if (selectedReport.pdfDownloadURL) {
                // Assuming pdfDownloadURL contains the full path to the file in storage
                const pdfUrl = new URL(selectedReport.pdfDownloadURL)
                let pdfPath = decodeURIComponent(
                  pdfUrl.pathname.substring(pdfUrl.pathname.indexOf('/o/') + 3)
                )
                pdfPath = pdfPath.split('?')[0] // Remove query parameters
                const pdfRef = ref(storage, pdfPath)
                deletePromises.push(deleteObject(pdfRef))
              }

              // Wait for all deletions to complete
              await Promise.all(deletePromises)
              console.log('All photos and PDF deleted successfully')

              // Delete the report document from Firestore
              const reportDocRef = doc(
                firestore,
                'projects',
                selectedReport.projectId
              )

              await deleteDoc(reportDocRef)
              console.log('Report document deleted successfully')

              Alert.alert(
                'Success',
                'The report and all associated files have been deleted.'
              )

              setModalVisible(false)
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to delete the report or its photos: ' + error.message
              )
              console.error('Deletion error:', error)
            } finally {
              setIsDeleting(false)
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
          {item.photos && item.photos.length ? (
            <>
              <Image
                source={{ uri: item.photos[0].uri }}
                style={styles.reportImage}
                resizeMode="cover"
                onError={error => console.error('Image load error:', error)}
                onLoad={() => console.log('Image loaded successfully')}
              />
            </>
          ) : (
            <IconSymbol name="house" size={100} color="green" />
          )}
          <ThemedView style={styles.reportInfo}>
            <ThemedText type="subtitle">{item.address}</ThemedText>
            <ThemedText style={styles.dateText}>{item.date}</ThemedText>
            <ThemedText style={styles.dateText}>{item.projectId}</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  )

  const handleViewReport = () => {
    if (!selectedReport) {
      Alert.alert('Error', 'No report selected to view.')
      return
    }
    router.push({
      pathname: '/viewReport', // Ensure this path matches your routes
      params: {
        projectId: selectedReport.id, // Assuming `id` is the correct field for report or project ID
      },
    })
    setModalVisible(false)
  }

  const handleEditReport = () => {
    if (!selectedReport) {
      Alert.alert('Error', 'No report selected to view.')
      return
    }
    router.push({
      pathname: '/editReportScreen', // Ensure this path matches your routes
      params: {
        projectId: selectedReport.id, // Assuming `id` is the correct field for report or project ID
      },
    })
    setModalVisible(false)
  }

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
        <View style={styles.filterContainer}>
          {['remediationRequired', 'equipmentOnSite', 'siteComplete'].map(
            filter => (
              <TouchableOpacity
                key={filter}
                onPress={() => {
                  setFilters(prev => ({
                    remediationRequired:
                      filter === 'remediationRequired'
                        ? !prev.remediationRequired
                        : false,
                    equipmentOnSite:
                      filter === 'equipmentOnSite'
                        ? !prev.equipmentOnSite
                        : false,
                    siteComplete:
                      filter === 'siteComplete' ? !prev.siteComplete : false,
                  }))
                }}
                style={[
                  styles.filterButton,
                  filters[filter] && styles.activeFilter,
                ]}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filters[filter] && styles.activeFilterText,
                  ]}
                >
                  {filter === 'remediationRequired'
                    ? 'Remediation'
                    : filter === 'equipmentOnSite'
                    ? 'Equipment'
                    : 'Completed'}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
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
                    onPress={handleViewReport}
                    style={styles.iconOption}
                  >
                    <IconSymbol name="eye" size={50} color="#2C3E50" />
                    <Text style={styles.iconLabel}>View Report</Text>
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
                    onPress={handleEditReport}
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
                    if (!isDeleting) {
                      setModalVisible(false)
                    } else {
                      Alert.alert(
                        'Action in Progress',
                        'Please wait until the deletion is complete.'
                      )
                    }
                  }}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <ThemedText style={styles.closeButtonText}>
                      Close
                    </ThemedText>
                  )}
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
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterButton: {
    padding: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  activeFilter: {
    backgroundColor: '#3498db',
  },
  filterButtonText: {
    color: '#333',
  },
  activeFilterText: {
    color: 'white',
  },
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
