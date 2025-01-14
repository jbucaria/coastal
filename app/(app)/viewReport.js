// ViewReport.js
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { useLocalSearchParams, router } from 'expo-router'
import { pdfGenerator } from '@/utils/pdfGenerator'
import { generateReportHTML } from '@/components/ReportTemplate'

const ViewReport = () => {
  const params = useLocalSearchParams()
  const projectId = params.projectId
  const [project, setProject] = useState(null)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [showFullImage, setShowFullImage] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [pdfDownloadURL, setPdfDownloadURL] = useState(null)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const projectRef = doc(firestore, 'projects', projectId)
        const projectSnap = await getDoc(projectRef)
        if (projectSnap.exists()) {
          setProject({ id: projectSnap.id, ...projectSnap.data() })
        } else {
          console.log('No such project!')
          Alert.alert('Error', 'Project not found')
        }
      } catch (error) {
        console.error('Error fetching project:', error)
        Alert.alert('Error', 'Could not fetch project. Please try again later.')
      }
    }
    fetchProject()
  }, [projectId])

  const handlePhotoPress = photo => {
    // photo.uri expected to hold the image URL
    setSelectedPhoto(photo.uri)
    setShowFullImage(true)
  }

  const generatePDF = async () => {
    if (!project) {
      Alert.alert('Error', 'Project data not loaded yet.')
      return
    }
    setIsGeneratingPDF(true)

    try {
      // Make sure pdfGenerator is imported from the correct file/path
      const result = await pdfGenerator(project)
      if (result && result.pdfFileName && result.pdfDownloadURL) {
        setPdfDownloadURL(result.pdfDownloadURL)
        Alert.alert('Success', `PDF Generated: ${result.pdfFileName}`, [
          { text: 'OK', onPress: () => console.log('PDF generated') },
        ])
      } else {
        console.error('PDF generation did not return expected result:', result)
        throw new Error('PDF generation failed')
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      Alert.alert('Error', 'Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const openGoogleMaps = address => {
    const url = Platform.select({
      ios: `comgooglemaps://?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
    })

    if (Platform.OS === 'ios') {
      Linking.canOpenURL('comgooglemaps://')
        .then(supported => {
          if (supported) {
            return Linking.openURL(url)
          } else {
            console.log('Google Maps not installed, opening in browser')
            return Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                address
              )}`
            )
          }
        })
        .catch(err => console.error('An error occurred', err))
    } else {
      Linking.openURL(url).catch(err => console.error('An error occurred', err))
    }
  }

  const handleCall = phoneNumber => {
    // Simple call or text logic
    let phoneUrl =
      Platform.OS === 'android'
        ? `tel:${phoneNumber}`
        : `telprompt:${phoneNumber}`
    Linking.canOpenURL(phoneUrl)
      .then(supported => {
        if (!supported) {
          Alert.alert('Phone number is not available')
        } else {
          return Linking.openURL(phoneUrl)
        }
      })
      .catch(err => console.error('An error occurred', err))
  }

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Title */}
        <Text style={styles.reportTitle}>Inspection Report</Text>

        {/* CARD: Address */}
        <View style={styles.card}>
          <Text style={styles.reportFieldLabel}>Address:</Text>
          <Text
            style={[styles.reportFieldValue, styles.clickableText]}
            onPress={() => openGoogleMaps(project.address)}
          >
            {project.address || 'N/A'}
          </Text>
        </View>

        {/* SECOND CARD - Contact Card */}
        <View style={styles.card}>
          {/* A Title at the top, similar to the first card’s style */}
          <Text style={styles.cardTitle}>Contact Info</Text>

          <View style={styles.contactRow}>
            {/* LEFT COLUMN: Customer/Company Contact Info */}
            <View style={styles.contactColumn}>
              <Text style={styles.projectFieldLabel}>Customer:</Text>
              <Text style={styles.projectFieldValue}>
                {project.customer || 'N/A'}
              </Text>

              <Text style={styles.projectFieldLabel}>Name:</Text>
              <Text style={styles.projectFieldValue}>
                {project.customerName || 'N/A'}
              </Text>

              <Text style={styles.projectFieldLabel}>Number:</Text>
              <TouchableOpacity
                onPress={() => handleCall(project.contactNumber)}
              >
                <Text style={[styles.projectFieldValue, styles.clickableText]}>
                  {project.customerNumber || 'N/A'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* RIGHT COLUMN: Homeowner Info (if available) */}
            <View style={styles.contactColumn}>
              <Text style={styles.projectFieldLabel}>Homeowner:</Text>
              <Text style={styles.projectFieldValue}></Text>

              <Text style={styles.projectFieldLabel}>Name:</Text>
              <Text style={styles.projectFieldValue}>
                {project.homeOwnerName || 'N/A'}
              </Text>

              <Text style={styles.projectFieldLabel}>Number:</Text>
              <TouchableOpacity
                onPress={() => handleCall(project.homeOwnerNumber)}
              >
                <Text style={[styles.projectFieldValue, styles.clickableText]}>
                  {project.homeOwnerNumber || 'N/A'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* CARD: Reason, Inspection Results, Recommended Actions */}
        <View style={styles.card}>
          <Text style={styles.reportFieldLabel}>Reason for Inspection:</Text>
          <Text style={[styles.reportFieldValue, styles.multiLineText]}>
            {project.reason || 'N/A'}
          </Text>

          <Text style={styles.reportFieldLabel}>Inspection Results:</Text>
          <Text style={[styles.reportFieldValue, styles.multiLineText]}>
            {project.inspectionResults || 'N/A'}
          </Text>

          <Text style={styles.reportFieldLabel}>Recommended Actions:</Text>
          <Text style={[styles.reportFieldValue, styles.multiLineText]}>
            {project.recommendedActions || 'N/A'}
          </Text>
        </View>

        {/* CARD: Photos */}
        <View style={styles.card}>
          <Text style={styles.reportFieldLabel}>Photos:</Text>
          {project.photos && project.photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.reportPhotos}
            >
              {project.photos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handlePhotoPress(photo)}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.reportPhoto}
                  />
                  {photo.label && (
                    <Text style={styles.photoLabel}>{photo.label}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noPhotosText}>No photos available</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={generatePDF}
            style={[styles.actionButton, { marginLeft: 8 }]} // Adjust styling if necessary
          >
            {isGeneratingPDF ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.actionButtonText}>Generate PDF</Text>
            )}
          </TouchableOpacity>
          {pdfDownloadURL && (
            <TouchableOpacity
              onPress={() => Linking.openURL(pdfDownloadURL)}
              style={[styles.actionButton, { marginLeft: 8 }]} // Adjust styling if necessary
            >
              <Text style={styles.actionButtonText}>Open PDF</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Full Image Preview */}
      {showFullImage && (
        <View style={styles.fullImageContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFullImage(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: selectedPhoto }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>
      )}
    </SafeAreaView>
  )
}

export default ViewReport

// -------------------
//      STYLES
// -------------------
const styles = StyleSheet.create({
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2C3E50',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactColumn: {
    flex: 1,
    marginHorizontal: 8,
  },

  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },

  // Title
  reportTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2C3E50',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Card Style
  card: {
    backgroundColor: '#f7f7f7',
    marginBottom: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },

  // Labels and Values
  reportFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  reportFieldValue: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 12,
  },
  multiLineText: {
    textAlignVertical: 'top',
  },
  clickableText: {
    color: '#3498DB',
    textDecorationLine: 'underline',
  },

  // Project Details
  projectFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  projectFieldValue: {
    fontSize: 14,
    color: '#4A4A4A',
  },

  // Photos
  reportPhotos: {
    marginTop: 15,
    marginBottom: 15,
  },
  reportPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  photoLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    color: '#555',
  },
  noPhotosText: {
    fontStyle: 'italic',
    color: '#888',
    marginTop: 8,
  },

  // Bottom Button
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginLeft: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
  },

  // Loading
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    color: '#2C3E50',
  },

  // Full-screen image preview
  fullImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '90%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 10,
    borderRadius: 50,
    borderColor: 'white',
    borderWidth: 1,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
})
