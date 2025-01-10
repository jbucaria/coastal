// handleGeneratePdf.js or wherever the function resides

import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as Print from 'expo-print'
import * as Linking from 'expo-linking'
import { Alert } from 'react-native'
import { generateReportHTML } from '../components/ReportTemplate'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { storage, firestore } from '@/firebaseConfig'
import useInspectionStore from '../store/inspectionStore' // Adjust the path as needed

export const handleGeneratePdf = async (formData, setIsSaving) => {
  setIsSaving(true) // Start showing indicator

  try {
    // Check for unique address (case-insensitive)
    const lowercaseAddress = formData.address.toLowerCase()
    const addressQuery = query(
      collection(firestore, 'inspectionReports'),
      where('lowercaseAddress', '==', lowercaseAddress)
    )
    const querySnapshot = await getDocs(addressQuery)

    if (!querySnapshot.empty) {
      Alert.alert(
        'Duplicate Address',
        'An inspection report with this address already exists.',
        [{ text: 'OK', onPress: () => setIsSaving(false) }]
      )
      return
    }

    // Upload photos to Cloud Storage
    const photoUrls = await Promise.all(
      formData.photos.map(async (photo, index) => {
        const storageRef = ref(
          storage,
          `inspectionPhotos/${Date.now()}_${index}`
        )
        const img = await fetch(photo.uri)
        const blob = await img.blob()
        const snapshot = await uploadBytes(storageRef, blob)
        const downloadURL = await getDownloadURL(snapshot.ref)
        return { uri: downloadURL, label: photo.label }
      })
    )

    formData.photos = photoUrls
    formData.lowercaseAddress = lowercaseAddress

    // Generate HTML and PDF
    const html = await generateReportHTML(formData)

    const sanitizedAddress = formData.address
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50)

    const fileName = sanitizedAddress
      ? `${sanitizedAddress}_Inspection_Report.pdf`
      : 'Inspection_Report.pdf'

    const { uri } = await Print.printToFileAsync({ html })

    // Upload PDF to Firebase Storage
    const pdfStorageRef = ref(storage, `inspectionReports/${fileName}`)
    const response = await fetch(uri)
    const blob = await response.blob()
    const pdfSnapshot = await uploadBytes(pdfStorageRef, blob)
    const pdfDownloadURL = await getDownloadURL(pdfSnapshot.ref)

    // Add report data to Firestore
    const docRef = await addDoc(collection(firestore, 'inspectionReports'), {
      ...formData,
      timestamp: new Date(),
      pdfFileName: fileName,
      pdfDownloadURL: pdfDownloadURL,
    })
    console.log('Document written with ID: ', docRef.id)

    // Send notification here
    // await sendNotification(formData, docRef.id)

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
