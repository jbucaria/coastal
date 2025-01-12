// utils/handleGeneratePdf.js

import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as Print from 'expo-print'
import * as Linking from 'expo-linking'
import { Alert } from 'react-native'
import { generateReportHTML } from '../components/ReportTemplate'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { storage, firestore } from '@/firebaseConfig'

/**
 * handleGeneratePdf
 *
 * Revised Option B: Instead of storing the inspection report in a subcollection,
 * this function saves/updates all inspection report data in the same project document.
 *
 * Expected formData fields include:
 * - projectId (ID of the parent project document)
 * - address (and possibly other inspection report fields such as hours, inspectionResults, recommendedActions, photos, etc.)
 *
 * Photos are uploaded to Storage under a path containing the projectId,
 * and the generated PDF is uploaded under `projects/{projectId}/pdfs/`.
 *
 * Finally, the parent project document is updated with the inspection report data.
 */
export const handleGeneratePdf = async (formData, setIsSaving) => {
  setIsSaving(true) // Start showing indicator

  try {
    const { projectId } = formData

    if (!projectId) {
      Alert.alert('Error', 'No project ID provided.')
      setIsSaving(false)
      return
    }

    // 1. (Optional) Check for duplicate inspection report info.
    // For example, if you want to check that an inspection report has not been generated already,
    // you could query a specific field in the project document.
    // (This example does not include a duplicate check.)

    // 2. Upload Photos to Firebase Storage
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

    // 3. Update formData with processed photo URLs, a lowercase version of the address, and a timestamp
    formData.photos = photoUrls
    formData.lowercaseAddress = formData.address.toLowerCase()
    formData.timestamp = new Date()

    // 4. Generate HTML and Convert to PDF
    const html = await generateReportHTML(formData)
    const sanitizedAddress = formData.address
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50)
    const fileName = sanitizedAddress
      ? `${sanitizedAddress}_Inspection_Report.pdf`
      : 'Inspection_Report.pdf'
    const { uri: pdfLocalUri } = await Print.printToFileAsync({ html })

    // 5. Upload the generated PDF to Firebase Storage
    // Save PDF in a folder under this project, e.g., "pdfs"
    const pdfStorageRef = ref(storage, `projects/${projectId}/pdfs/${fileName}`)
    const pdfResponse = await fetch(pdfLocalUri)
    const pdfBlob = await pdfResponse.blob()
    await uploadBytes(pdfStorageRef, pdfBlob)
    const pdfDownloadURL = await getDownloadURL(pdfStorageRef)

    // 6. Prepare the updated inspection report data.
    // (This includes all fields from formData plus the PDF info.)
    const updatedReportData = {
      ...formData,
      pdfFileName: fileName,
      pdfDownloadURL: pdfDownloadURL,
    }

    // 7. Update the parent project document with the inspection report data.
    // This updates the project document at 'projects/{projectId}'
    const projectRef = doc(firestore, 'projects', projectId)
    await updateDoc(projectRef, updatedReportData)
    console.log('Project (with inspection report info) updated successfully.')

    // 8. Provide user feedback and sharing options.
    Alert.alert(
      'File Saved',
      'The report has been saved and shared. What would you like to do?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setIsSaving(false),
        },
        {
          text: 'View',
          onPress: async () => {
            try {
              await Linking.openURL(pdfDownloadURL)
            } catch (error) {
              console.error('Error opening PDF:', error)
              Alert.alert('Error', 'Failed to open the PDF. Please try again.')
            } finally {
              setIsSaving(false)
            }
          },
        },
        {
          text: 'Share',
          onPress: async () => {
            try {
              await Sharing.shareAsync(pdfLocalUri, {
                dialogTitle: 'Share Inspection Report',
                mimeType: 'application/pdf',
                UTI: 'public.content',
              })
            } catch (error) {
              console.error('Error sharing file:', error)
              Alert.alert('Error', 'Failed to share the report')
            } finally {
              setIsSaving(false)
            }
          },
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
