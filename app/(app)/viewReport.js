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
} from 'react-native'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { useLocalSearchParams, router } from 'expo-router'

const ViewReport = () => {
  const params = useLocalSearchParams()
  const projectId = params.projectId
  const [project, setProject] = useState(null)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [showFullImage, setShowFullImage] = useState(false)

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
    setSelectedPhoto(photo.uri) // Assuming 'uri' is the field where the photo URL is stored
    setShowFullImage(true)
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {project ? (
          <>
            <Text style={styles.reportTitle}>Inspection Report</Text>
            <Text style={styles.reportFieldLabel}>Address:</Text>
            <Text
              style={[styles.reportFieldValue, styles.clickableText]}
              onPress={() => openGoogleMaps(project.address)}
            >
              {project.address}
            </Text>
            <Text style={styles.reportFieldLabel}>Customer:</Text>
            <Text style={styles.reportFieldValue}>{project.customer}</Text>
            <Text style={styles.reportFieldLabel}>Inspector:</Text>
            <Text style={styles.reportFieldValue}>{project.inspectorName}</Text>
            <Text style={styles.reportFieldLabel}>Contact Name:</Text>
            <Text style={styles.reportFieldValue}>{project.contactName}</Text>
            <Text style={styles.reportFieldLabel}>Contact Number:</Text>
            <TouchableOpacity onPress={() => handleCall(project.contactNumber)}>
              <Text style={[styles.reportFieldValue, styles.clickableText]}>
                {project.contactNumber}
              </Text>
            </TouchableOpacity>
            <Text style={styles.reportFieldLabel}>Reason for Inspection:</Text>
            <Text style={styles.reportFieldValue}>{project.reason}</Text>
            <Text style={styles.reportFieldLabel}>Inspection Results:</Text>
            <Text style={[styles.reportFieldValue, styles.multiLineText]}>
              {project.inspectionResults}
            </Text>
            <Text style={styles.reportFieldLabel}>Recommended Actions:</Text>
            <Text style={[styles.reportFieldValue, styles.multiLineText]}>
              {project.recommendedActions}
            </Text>
            {/* Photos */}
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
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>Back</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={styles.loadingText}>Loading...</Text>
        )}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    padding: 20,
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2C3E50',
  },
  reportFieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 10,
  },
  reportFieldValue: {
    fontSize: 16,
    color: '#34495E',
    marginBottom: 5,
  },
  multiLineText: {
    textAlignVertical: 'top',
  },
  clickableText: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
  reportPhotos: {
    marginTop: 15,
    marginBottom: 15,
  },
  reportPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  noPhotosText: {
    fontStyle: 'italic',
    color: '#888',
    marginTop: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#2C3E50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    color: '#2C3E50',
  },
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
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 10,
    borderRadius: 50,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
})

export default ViewReport
