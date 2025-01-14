import { generateReportHTML } from '../components/ReportTemplate'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, updateDoc } from 'firebase/firestore'
import { storage, firestore } from '@/firebaseConfig'
import { Alert } from 'react-native'
import { router } from 'expo-router'
import { generatePDF } from './pdfGenerator' // Import the new PDF generation function

export const handleGeneratePdf = async (formData, setIsSaving) => {
  setIsSaving(true) // Start showing indicator
  const onReportComplete = async (projectId, field, value) => {
    try {
      await updateDoc(doc(firestore, 'projects', projectId), {
        [field]: value,
      })
      console.log(`Project field ${field} updated to ${value}`)
    } catch (error) {
      console.error('Error updating project:', error)
      Alert.alert('Error', 'Failed to update the project. Please try again.')
    }
  }

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
        const storageRef = ref(
          storage,
          `projects/${projectId}/photos/${Date.now()}_${index}`
        )
        const img = await fetch(photo.uri)
        const blob = await img.blob()
        await uploadBytes(storageRef, blob)
        const downloadURL = await getDownloadURL(storageRef)
        return { uri: downloadURL, label: photo.label }
      })
    )

    // 2. Update formData with processed photo URLs, a lowercase version of the address, and a timestamp
    formData.photos = photoUrls
    formData.lowercaseAddress = formData.address.toLowerCase()
    formData.timestamp = new Date()

    // 3. Generate PDF
    // const { pdfFileName, pdfDownloadURL } = await generatePDF(formData)

    // 4. Prepare the updated inspection report data.
    // const updatedReportData = {
    //   ...formData,
    //   pdfFileName,
    //   pdfDownloadURL,
    // }

    // 5. Update the parent project document with the inspection report data.
    const projectRef = doc(firestore, 'projects', projectId)
    await updateDoc(projectRef, formData)
    console.log('Project (with inspection report info) updated successfully.')

    if (projectId) {
      await onReportComplete(projectId, 'inspectionComplete', true)
    } else {
      console.error(
        'Project ID is missing. Cannot mark inspection as complete.'
      )
    }

    // 6. Provide user feedback and sharing options.
    Alert.alert(
      'File Saved',
      'The report has been saved.',
      router.push('(tabs)'),
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
