import React, { useState, useEffect } from 'react'
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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { useThemeColor } from '@/hooks/useThemeColor'
import * as Linking from 'expo-linking'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage, firestore } from '@/firebaseConfig'
import { generateReportHTML } from '@/components/ReportTemplate'
import * as Print from 'expo-print'
import { IconSymbol } from '@/components/ui/IconSymbol'

const ReportsPage = () => {
  const [reports, setReports] = useState([])
  const backgroundColor = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')
  const [modalVisible, setModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedReport, setEditedReport] = useState({})
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

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
    setEditedReport({ ...report }) // Initialize editedReport with current report data
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

  const handleFieldChange = (field, value) => {
    setEditedReport(prev => ({ ...prev, [field]: value }))
  }

  const handleDeleteReport = async () => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this report?',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Deletion cancelled'),
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              if (!selectedReport) return
              await deleteDoc(
                doc(firestore, 'inspectionReports', selectedReport.id)
              )
              Alert.alert('Success', 'Report has been deleted')
              setModalVisible(false)
            } catch (error) {
              console.error('Error deleting report:', error)
              Alert.alert('Error', 'Failed to delete the report')
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    )
  }

  const handleEditReport = () => {
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    setIsSaving(true) // Start showing loading indicator
    setUploadProgress(0) // Reset progress
    try {
      const reportRef = doc(firestore, 'inspectionReports', selectedReport.id)

      // Update Firestore
      await updateDoc(reportRef, editedReport)

      // Generate new PDF with updated data
      const newHtml = await generateReportHTML(editedReport)
      const sanitizedAddress = editedReport.address
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 50)
      const fileName = sanitizedAddress
        ? `${sanitizedAddress}_Inspection_Report.pdf`
        : 'Inspection_Report.pdf'
      const { uri: newUri } = await Print.printToFileAsync({ html: newHtml })

      // Upload new PDF to Firebase Storage with progress tracking
      const pdfStorageRef = ref(storage, `inspectionReports/${fileName}`)
      const response = await fetch(newUri)
      const blob = await response.blob()

      await uploadBytes(pdfStorageRef, blob, {
        onUploadProgress: snapshot => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setUploadProgress(progress)
        },
      })

      const newPdfDownloadURL = await getDownloadURL(pdfStorageRef)

      // Update Firestore with new PDF URL
      await updateDoc(reportRef, {
        pdfFileName: fileName,
        pdfDownloadURL: newPdfDownloadURL,
      })

      Alert.alert('Success', 'Report and PDF have been updated')
      setIsEditing(false) // Close editing mode
    } catch (error) {
      console.error('Error updating report and PDF:', error)
      Alert.alert('Error', 'Failed to update the report or regenerate the PDF')
    } finally {
      setIsSaving(false) // Stop showing loading indicator regardless of success or failure
      setUploadProgress(0) // Reset progress bar
    }
  }

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
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(!modalVisible)
          }}
          // presentationStyle="pageSheet"
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              {isEditing ? (
                <KeyboardAvoidingView
                  style={{ flex: 1, width: '100%' }}
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                >
                  <ScrollView
                    style={styles.modalContent}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={isEditing ? styles.editContent : {}}
                  >
                    <ThemedText type="title" style={styles.modalTitle}>
                      Edit Report
                    </ThemedText>

                    {/* Customer */}
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                      Customer
                    </ThemedText>
                    <TextInput
                      value={editedReport.customer}
                      onChangeText={text => handleFieldChange('customer', text)}
                      placeholder="Customer"
                      style={styles.editInput}
                    />

                    {/* Address */}
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                      Address
                    </ThemedText>
                    <TextInput
                      value={editedReport.address}
                      onChangeText={text => handleFieldChange('address', text)}
                      placeholder="Address"
                      style={styles.editInput}
                    />

                    {/* Date */}
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                      Date of Inspection
                    </ThemedText>
                    <TextInput
                      value={editedReport.date}
                      onChangeText={text => handleFieldChange('date', text)}
                      placeholder="Date"
                      style={styles.editInput}
                    />

                    {/* Reason for Inspection */}
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                      Reason for Inspection
                    </ThemedText>
                    <TextInput
                      value={editedReport.reason}
                      onChangeText={text => handleFieldChange('reason', text)}
                      placeholder="Reason"
                      style={styles.editInput}
                      multiline
                    />

                    {/* Inspector's Name */}
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                      Inspector's Name
                    </ThemedText>
                    <TextInput
                      value={editedReport.inspectorName}
                      onChangeText={text =>
                        handleFieldChange('inspectorName', text)
                      }
                      placeholder="Inspector's Name"
                      style={styles.editInput}
                    />

                    {/* Hours to Complete Inspection */}
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                      Hours to Complete Inspection
                    </ThemedText>
                    <TextInput
                      value={editedReport.hours}
                      onChangeText={text => handleFieldChange('hours', text)}
                      placeholder="Hours"
                      style={styles.editInput}
                      keyboardType="numeric"
                    />

                    {/* Inspection Results */}
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                      Inspection Results
                    </ThemedText>
                    <TextInput
                      value={editedReport.inspectionResults}
                      onChangeText={text =>
                        handleFieldChange('inspectionResults', text)
                      }
                      placeholder="Inspection Results"
                      style={[styles.editInput, styles.multilineInput]}
                      multiline
                    />

                    {/* Recommended Actions */}
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                      Recommended Actions
                    </ThemedText>
                    <TextInput
                      value={editedReport.recommendedActions}
                      onChangeText={text =>
                        handleFieldChange('recommendedActions', text)
                      }
                      placeholder="Recommended Actions"
                      style={[styles.editInput, styles.multilineInput]}
                      multiline
                    />

                    {isSaving && (
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[
                            styles.progressBar,
                            { width: `${uploadProgress}%` },
                          ]}
                        />
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleSaveEdit}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <ThemedText>Save Changes</ThemedText>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={() => {
                        setIsEditing(false)
                        setModalVisible(false)
                      }}
                    >
                      <ThemedText>Close</ThemedText>
                    </TouchableOpacity>
                  </ScrollView>
                </KeyboardAvoidingView>
              ) : (
                // Non-editing view content with icons
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
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setIsEditing(false)
                      setModalVisible(false)
                    }}
                  >
                    <ThemedText style={styles.closeButtonText}>
                      Close
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0', // Light gray background
  },
  title: {
    marginBottom: 20,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  modalContent: {
    flex: 1,
    width: '100%',
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 20,
    color: '#2C3E50', // Dark blue title color
  },
  sectionTitle: {
    marginBottom: 5,
    width: '100%',
    color: '#2C3E50', // Dark blue for section titles
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    width: '100%',
    backgroundColor: 'white',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#2C3E50', // Dark blue background for buttons
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    height: 20,
    backgroundColor: '#e0e0e0',
    width: '100%',
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2C3E50', // Dark blue for progress bar
  },
  searchBar: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  editContent: {
    paddingBottom: 20,
  },
  optionContainer: {
    padding: 20,
    width: '100%',
    backgroundColor: '#f0f0f0', // Light gray background for better contrast
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
    marginTop: 5,
    color: '#2C3E50', // Dark blue text
  },
  closeButton: {
    backgroundColor: '#2C3E50', // Dark blue for close button
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 30,
    elevation: 2,
    marginTop: 20,
    alignSelf: 'center', // Center the button
    width: '90%', // Ensure it fits well on screen
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
})

export default ReportsPage
