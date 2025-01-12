import { generateReportHTML } from '../components/ReportTemplate'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, updateDoc } from 'firebase/firestore'
import { storage, firestore } from '@/firebaseConfig'
import { Alert } from 'react-native'
import { generatePDF } from './pdfGenerator' // Import the new PDF generation function

export const handleGeneratePdf = async (formData, setIsSaving) => {
  setIsSaving(true) // Start showing indicator

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

    // 6. Provide user feedback and sharing options.
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
            // Note: Sharing action might require the local PDF file path, which isn't available here.
            // You'll need to adjust this if you want to share directly from this function.
            Alert.alert('Share', 'Sharing functionality not implemented here.')
            setIsSaving(false)
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
