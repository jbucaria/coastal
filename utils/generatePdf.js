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
  setDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { storage, firestore } from '@/firebaseConfig'

export const handleGeneratePdf = async (formData, setIsSaving) => {
  setIsSaving(true) // Start showing indicator

  try {
    const { projectId } = formData

    if (!projectId) {
      Alert.alert('Error', 'No project ID provided.')
      setIsSaving(false)
      return
    }

    // **1. Check for Duplicate Inspection Reports within the Same Project**
    const lowercaseAddress = formData.address.toLowerCase()
    const inspectionReportsRef = collection(
      firestore,
      'projects',
      projectId,
      'inspectionReports'
    )
    const addressQuery = query(
      inspectionReportsRef,
      where('lowercaseAddress', '==', lowercaseAddress)
    )
    const querySnapshot = await getDocs(addressQuery)

    if (!querySnapshot.empty) {
      Alert.alert(
        'Duplicate Address',
        'An inspection report with this address already exists for this project.',
        [{ text: 'OK', onPress: () => setIsSaving(false) }]
      )
      return
    }

    // **2. Create a New Inspection Report Document Reference**
    const newReportDocRef = doc(inspectionReportsRef) // Auto-generated ID
    const reportId = newReportDocRef.id

    // **3. Upload Photos to Firebase Storage**
    const photoUrls = await Promise.all(
      formData.photos.map(async (photo, index) => {
        const storageRef = ref(
          storage,
          `projects/${projectId}/inspectionReports/${reportId}/photos/${Date.now()}_${index}`
        )
        const img = await fetch(photo.uri)
        const blob = await img.blob()
        await uploadBytes(storageRef, blob)
        const downloadURL = await getDownloadURL(storageRef)
        return { uri: downloadURL, label: photo.label }
      })
    )

    // **4. Update Form Data with Photo URLs and Additional Fields**
    formData.photos = photoUrls
    formData.lowercaseAddress = lowercaseAddress
    formData.timestamp = new Date()

    // **5. Generate HTML and Convert to PDF**
    const html = await generateReportHTML(formData)

    const sanitizedAddress = formData.address
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50)

    const fileName = sanitizedAddress
      ? `${sanitizedAddress}_Inspection_Report.pdf`
      : 'Inspection_Report.pdf'

    const { uri } = await Print.printToFileAsync({ html })

    // **6. Upload PDF to Firebase Storage**
    const pdfStorageRef = ref(
      storage,
      `projects/${projectId}/inspectionReports/${reportId}/${fileName}`
    )
    const pdfResponse = await fetch(uri)
    const pdfBlob = await pdfResponse.blob()
    await uploadBytes(pdfStorageRef, pdfBlob)
    const pdfDownloadURL = await getDownloadURL(pdfStorageRef)

    // **7. Save Inspection Report Data to Firestore**
    const reportData = {
      ...formData,
      pdfFileName: fileName,
      pdfDownloadURL: pdfDownloadURL,
    }

    await setDoc(newReportDocRef, reportData) // Write data to Firestore

    console.log('Inspection Report created with ID:', reportId)

    // **8. Provide User Feedback and Sharing Options**
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
              await Sharing.shareAsync(uri, {
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
    setIsSaving(false) // Ensure loading stops in case of an error
  }
}
