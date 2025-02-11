import * as FileSystem from 'expo-file-system'

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, updateDoc } from 'firebase/firestore'
import { storage, firestore } from '@/firebaseConfig'
import { Alert } from 'react-native'
import { router } from 'expo-router'

// Helper function to mark a report as complete in Firestore
async function onReportComplete(projectId, field, value) {
  try {
    const projectDocRef = doc(firestore, 'tickets', projectId)
    await updateDoc(projectDocRef, { [field]: value })
    console.log(`Ticket field ${field} updated to ${value}`)
  } catch (error) {
    console.error('Error updating ticket:', error)
    Alert.alert('Error', 'Failed to update the ticket. Please try again.')
  }
}

export const handleGenerateReport = async (formData, setIsSaving) => {
  try {
    const { projectId } = formData
    if (!projectId) {
      Alert.alert('Error', 'No project ID provided.')
      setIsSaving(false)
      return
    }

    // 1. Upload Photos to Firebase Storage
    const photoUrls = await Promise.all(
      formData.photos.map(async (photo, index) => {
        const response = await fetch(photo.uri)
        const blob = await response.blob()
        const storageRef = ref(
          storage,
          `reportPhotos/${projectId}/${Date.now()}_${photo.fileName || index}`
        )
        await uploadBytes(storageRef, blob)
        return await getDownloadURL(storageRef) // Return only the URL
      })
    )

    // 2. Prepare reportPhotos as an array of simple objects
    const reportPhotos = photoUrls.map(url => ({
      uri: url,
      label: (formData.photos.find(p => p.uri === url)?.label || '').toString(),
    }))

    // 3. Update formData with the new structure but remove any existing 'photos' field
    const { photos, ...restOfFormData } = formData // Destructure to remove 'photos'
    const updatedFormData = {
      ...restOfFormData,
      reportPhotos: reportPhotos,
      lowercaseAddress: formData.address.toLowerCase(),
      timestamp: new Date(),
    }

    // 4. Update the project document in Firestore
    const projectRef = doc(firestore, 'tickets', projectId)
    await updateDoc(projectRef, updatedFormData)
    console.log('Ticket (with report info) updated successfully.')

    // 5. Mark the inspection as complete.
    await onReportComplete(projectId, 'inspectionComplete', true)

    router.push('/(tabs)') // Navigate to the home screen

    // 6. Provide user feedback and navigate
    Alert.alert(
      'File Saved',
      'The report has been saved.',
      [
        {
          text: 'OK',
        },
      ],
      { cancelable: false }
    )
  } catch (err) {
    console.error('Error generating PDF or saving to Firestore:', err)
    Alert.alert(
      'Error',
      'An error occurred while generating or saving the report'
    )
    setIsSaving(false)
  }
}
