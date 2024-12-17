import { collection, addDoc } from 'firebase/firestore'
import { storage, firestore } from '../firebaseConfig'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
// import * as Permissions from 'expo-permissions'
import { Alert, Platform } from 'react-native'
import { generateReportHTML } from '../components/ReportTemplate' // Adjust path if necessary

export const handleGeneratePdf = async formData => {
  try {
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

    // Save PDF to device's document directory
    const documentDir = FileSystem.documentDirectory
    const savePath = `${documentDir}/${fileName}`

    // Move the file to the document directory
    await FileSystem.moveAsync({
      from: uri,
      to: savePath,
    })

    // Check and request permission to write to external storage for Android
    if (Platform.OS === 'android') {
      const { status } = await Permissions.askAsync(
        Permissions.MEDIA_LIBRARY_WRITE_ONLY
      )
      if (status !== 'granted') {
        alert('Sorry, we need storage permissions to save the file.')
        return
      }
    }

    // Save to Firestore
    const docRef = await addDoc(collection(firestore, 'inspectionReports'), {
      ...formData,
      timestamp: new Date(),
      pdfFileName: fileName,
      pdfUri: savePath, // Store the path where the PDF is saved
    })
    console.log('Document written with ID: ', docRef.id)

    // Ask user if they want to share the file
    Alert.alert(
      'File Saved',
      'Do you want to share the report?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Share',
          onPress: async () => {
            try {
              await Sharing.shareAsync(savePath, {
                dialogTitle: 'Share Inspection Report',
                mimeType: 'application/pdf',
                UTI: 'public.content',
              })
            } catch (error) {
              console.error('Error sharing file:', error)
              alert('Failed to share the report')
            }
          },
        },
      ],
      { cancelable: false }
    )
  } catch (err) {
    console.error('Error generating PDF or saving to Firestore:', err)
    alert('An error occurred while generating or saving the report')
  }
}
