import { storage, firestore } from '../firebaseConfig' // Import Firebase setup
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export const handleGeneratePdf = async () => {
  const formData = {
    customer,
    address,
    date: date.toLocaleDateString(),
    reason,
    inspectorName,
    hours,
    equipment: selectedEquipmentDisplay,
    inspectionResults,
    recommendedActions,
    photos,
  }

  try {
    // Generate the HTML for the PDF
    const html = await generateReportHTML(formData)

    const sanitizedAddress = address
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50)

    const fileName = sanitizedAddress
      ? `${sanitizedAddress}_Inspection_Report.pdf`
      : 'Inspection_Report.pdf'

    // Generate the PDF
    const { uri } = await Print.printToFileAsync({ html })

    // Read the file as a Blob
    const pdfBlob = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    })
    const pdfBuffer = new Uint8Array(Buffer.from(pdfBlob, 'base64'))

    // Upload the PDF to Firebase Storage
    const storageRef = ref(storage, `reports/${fileName}`)
    await uploadBytes(storageRef, pdfBuffer)

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef)

    // Save metadata to Firestore
    await addDoc(collection(firestore, 'inspectionReports'), {
      customer,
      address,
      date: formData.date,
      reason,
      inspectorName,
      hours,
      equipment: selectedEquipmentDisplay,
      inspectionResults,
      recommendedActions,
      photos: photos.map(photo => ({
        uri: photo.uri,
        label: photo.label,
      })), // Save photo metadata
      pdfUrl: downloadURL,
      createdAt: serverTimestamp(),
    })

    alert('Report successfully saved to Firebase!')
  } catch (err) {
    console.error('Error generating or saving PDF:', err)
    alert('An error occurred while saving the report.')
  }
}
