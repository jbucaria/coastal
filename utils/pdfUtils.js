import storage from '@react-native-firebase/storage'
import firestore from '@react-native-firebase/firestore'
import * as Print from 'expo-print'

export const generateAndUploadPdf = async (formData, generateReportHTML) => {
  try {
    const html = await generateReportHTML(formData)

    const sanitizedAddress = formData.address
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50)
    const fileName = sanitizedAddress
      ? `${sanitizedAddress}_Inspection_Report.pdf`
      : 'Inspection_Report.pdf'

    // Generate the PDF
    const { uri } = await Print.printToFileAsync({ html })

    // Firebase Storage reference
    const storageRef = storage().ref(`inspection_reports/${fileName}`)
    const task = storageRef.putFile(uri)

    task.on('state_changed', taskSnapshot => {
      console.log(
        `${taskSnapshot.bytesTransferred} transferred out of ${taskSnapshot.totalBytes}`
      )
    })

    await task

    // Get the download URL
    const downloadURL = await storageRef.getDownloadURL()

    // Save metadata to Firestore
    await firestore()
      .collection('inspectionReports')
      .add({
        ...formData,
        pdfUrl: downloadURL,
        createdAt: firestore.FieldValue.serverTimestamp(),
      })

    return { success: true }
  } catch (error) {
    console.error('Error generating or saving PDF:', error)
    return { success: false, error }
  }
}
