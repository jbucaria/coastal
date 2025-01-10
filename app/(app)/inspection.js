// App.js

import { router } from 'expo-router'
import React, { useState, useEffect } from 'react'
import { Alert } from 'react-native'
import InspectionForm from '@/components/InspectionForm'
import { handleGeneratePdf } from '@/utils/generatePdf'
import { useLocalSearchParams } from 'expo-router'
import { auth } from '@/firebaseConfig'

export default function App() {
  const params = useLocalSearchParams()
  const { projectId } = params // Extract projectId from params

  const [customer, setCustomer] = useState(params.customer || '')
  const [address, setAddress] = useState(params.address || '')
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [reason, setReason] = useState(params.reason || '')
  const [contactName, setContactName] = useState(params.contactName || '')
  const [contactNumber, setContactNumber] = useState(params.contactNumber || '')
  const [inspectorName, setInspectorName] = useState(params.inspectorName || '')
  const [hours, setHours] = useState('')
  const [inspectionResults, setInspectionResults] = useState('')
  const [recommendedActions, setRecommendedActions] = useState('')
  const [photos, setPhotos] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [project, setProject] = useState({
    remediationRequired: params.remediationRequired === 'true' || false,
    equipmentOnSite: params.equipmentOnSite === 'true' || false,
    siteComplete: params.siteComplete === 'true' || false,
  })

  useEffect(() => {
    // Fetch inspector name from Firebase Auth if not provided in params

    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setInspectorName(user.displayName || user.email || 'Unknown') // Adjust based on your Firebase user object structure
      }
    })
    return () => unsubscribe() // Clean up subscription on unmount
  }, [])

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
      'Date of Inspection': date,
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
        projectId, // Now projectId is defined and passed from params
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
      projectId={projectId} // Pass projectId to InspectionForm if needed
    />
  )
}
