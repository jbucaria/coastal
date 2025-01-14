import React, { useState, useEffect } from 'react'
import { Alert } from 'react-native'
import InspectionForm from '@/components/InspectionForm'
import { handleGeneratePdf } from '@/utils/generatePdf'
import { useLocalSearchParams } from 'expo-router'
import { firestore } from '@/firebaseConfig'
import { onSnapshot, doc, updateDoc } from 'firebase/firestore'

export default function App() {
  const params = useLocalSearchParams()
  const { projectId } = params // Still using projectId from params for document lookup

  const [customer, setCustomer] = useState('')
  const [address, setAddress] = useState('')
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [reason, setReason] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [inspectorName, setInspectorName] = useState('')
  const [hours, setHours] = useState('')
  const [inspectionResults, setInspectionResults] = useState('')
  const [recommendedActions, setRecommendedActions] = useState('')
  const [photos, setPhotos] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [project, setProject] = useState({})
  // const [projectId, setProjectId] = useState('')

  useEffect(() => {
    if (projectId) {
      const unsubscribe = onSnapshot(
        doc(firestore, 'projects', projectId),
        docSnapshot => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data()
            setCustomer(data.customer || '')
            setAddress(data.address || '')

            // Parse the string date into a Date object
            if (data.date && typeof data.date === 'string') {
              const [month, day, year] = data.date.split('/').map(Number)
              setDate(new Date(year, month - 1, day)) // Month is 0-indexed in JS Date
            } else {
              setDate(new Date()) // Fallback if date is not in expected format
            }

            setReason(data.reason || '')
            setInspectorName(data.inspectorName || '')
            setContactName(data.contactName || '')
            setContactNumber(data.contactNumber || '')
            setHours(data.hours || '')
            setInspectionResults(data.inspectionResults || '')
            setRecommendedActions(data.recommendedActions || '')
            setPhotos(data.photos || [])
            setProject({ id: docSnapshot.id, ...data })
          } else {
            console.error('Project does not exist:', projectId)
            Alert.alert('Error', 'The project does not exist.')
          }
        },
        error => {
          console.error('Error listening for project updates:', error)
          Alert.alert(
            'Error',
            'Could not fetch project details. Please try again later.'
          )
        }
      )

      return () => unsubscribe()
    }
  }, [projectId])

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setDate(selectedDate)
    }
  }

  const validateForm = () => {
    const fields = {
      Customer: customer,
      Address: address,
      // 'Date of Inspection': date,
      'Reason for Inspection': reason,
      "Inspector's Name": inspectorName,
      'Hours to Complete Inspection': hours,
      'Contact Name': contactName,
      'Contact Number': contactNumber,
      'Inspection Results': inspectionResults,
      'Recommended Actions': recommendedActions,
    }

    const missingFields = Object.entries(fields)
      .filter(([_, value]) => !value)
      .map(([key]) => key)

    if (missingFields.length > 0) {
      Alert.alert(
        'Form Incomplete',
        'Please complete the following fields:\n' + missingFields.join('\n'),
        [{ text: 'OK', onPress: () => {} }]
      )
      return false
    }

    if (photos.length === 0) {
      return new Promise(resolve => {
        Alert.alert(
          'No Photos',
          'You have not added any photos to the report. Are you sure you want to continue without photos?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'OK',
              onPress: () => resolve(true),
            },
          ],
          { cancelable: false }
        )
      })
    }

    return true
  }

  const handleGeneratePdfLocal = async () => {
    try {
      const validationResult = await validateForm()
      if (!validationResult) return

      const formData = {
        projectId,
        customer,
        address,
        date: date.toLocaleDateString(),
        reason,
        inspectorName,
        contactName,
        contactNumber,
        hours,
        inspectionResults,
        recommendedActions,
        photos: photos,
        onSite: false,
      }
      await handleGeneratePdf(formData, setIsSaving)
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  return (
    <InspectionForm
      customer={customer}
      setCustomer={setCustomer}
      address={address}
      setAddress={setAddress}
      date={date}
      setDate={setDate}
      showDatePicker={showDatePicker}
      setShowDatePicker={setShowDatePicker}
      inspectorName={inspectorName}
      setInspectorName={setInspectorName}
      reason={reason}
      setReason={setReason}
      hours={hours}
      setHours={setHours}
      inspectionResults={inspectionResults}
      setInspectionResults={setInspectionResults}
      recommendedActions={recommendedActions}
      setRecommendedActions={setRecommendedActions}
      photos={photos}
      setPhotos={setPhotos}
      isSaving={isSaving}
      handleDateChange={handleDateChange}
      handleGeneratePdf={handleGeneratePdfLocal}
      contactName={contactName}
      setContactName={setContactName}
      setContactNumber={setContactNumber}
      contactNumber={contactNumber}
      project={project}
      setProject={setProject}
      projectId={projectId}
      firestore={firestore}
    />
  )
}
