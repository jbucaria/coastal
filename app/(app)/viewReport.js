// screens/ViewReport.js

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
import { collection, onSnapshot } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { useLocalSearchParams, router } from 'expo-router'

const ViewReport = () => {
  const params = useLocalSearchParams()
  const [projects, setProjects] = useState([])
  const projectId = params.projectId // Assuming the report ID is passed as projectId

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, 'projects'),
      snapshot => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        setProjects(projectsData)
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
  }, [setProjects])

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.reportTitle}>Inspection Report</Text>

        <Text style={styles.reportFieldLabel}>Address:</Text>
        <Text
          style={[styles.reportFieldValue, styles.clickableText]}
          onPress={() => openGoogleMaps(projects.address)}
        >
          {projects.address}
        </Text>

        <Text style={styles.reportFieldLabel}>Customer:</Text>
        <Text style={styles.reportFieldValue}>{projects.customer}</Text>

        <Text style={styles.reportFieldLabel}>Inspector:</Text>
        <Text style={styles.reportFieldValue}>{projects.inspectorName}</Text>

        <Text style={styles.reportFieldLabel}>Contact Name:</Text>
        <Text style={styles.reportFieldValue}>{projects.contactName}</Text>

        <Text style={styles.reportFieldLabel}>Contact Number:</Text>
        <Text style={styles.reportFieldValue}>{projects.contactNumber}</Text>

        <Text style={styles.reportFieldLabel}>Reason for Inspection:</Text>
        <Text style={styles.reportFieldValue}>{projects.reason}</Text>

        <Text style={styles.reportFieldLabel}>Inspection Results:</Text>
        <Text style={[styles.reportFieldValue, styles.multiLineText]}>
          {projects.inspectionResults}
        </Text>

        <Text style={styles.reportFieldLabel}>Recommended Actions:</Text>
        <Text style={[styles.reportFieldValue, styles.multiLineText]}>
          {projects.recommendedActions}
        </Text>

        {/* Photos */}
        {projects.photos && projects.photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.reportPhotos}
          >
            {projects.photos.map((photo, index) => (
              <Image
                key={index}
                source={{ uri: photo.uri }}
                style={styles.reportPhoto}
              />
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
      </ScrollView>
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
})

export default ViewReport
