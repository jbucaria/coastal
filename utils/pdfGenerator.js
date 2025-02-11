// In pdfGenerator.js
import * as Print from 'expo-print'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { generatePdf } from '@/utils/ReportTemplate'

const storage = getStorage()

export const pdfGenerator = async formData => {
  const html = await generatePdf(formData)
  const sanitizedAddress = formData.address
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50)
  const fileName = sanitizedAddress
    ? `${sanitizedAddress}_Inspection_Report.pdf`
    : 'Inspection_Report.pdf'
  const { uri: pdfLocalUri } = await Print.printToFileAsync({ html })

  // Upload the generated PDF to Firebase Storage
  const pdfStorageRef = ref(
    storage,
    `projects/${formData.projectId}/pdfs/${fileName}`
  )
  const pdfResponse = await fetch(pdfLocalUri)
  const pdfBlob = await pdfResponse.blob()
  await uploadBytes(pdfStorageRef, pdfBlob)
  const pdfDownloadURL = await getDownloadURL(pdfStorageRef)

  return { pdfFileName: fileName, pdfDownloadURL } // Ensure this is returned
}
