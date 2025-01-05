// App.js

import React, { useState } from 'react'
import { Alert } from 'react-native'
import InspectionForm from '@/components/InspectionForm'
import { handleGeneratePdf } from '@/utils/generatePdf'

export default function App() {
  const [customer, setCustomer] = useState('')
  const [address, setAddress] = useState('')
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [reason, setReason] = useState('')
  const [inspectorName, setInspectorName] = useState('')
  const [hours, setHours] = useState('')
  const [inspectionResults, setInspectionResults] = useState('')
  const [recommendedActions, setRecommendedActions] = useState('')
  const [photos, setPhotos] = useState([])
  const [isSaving, setIsSaving] = useState(false)

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
        customer,
        address,
        date: date.toLocaleDateString(),
        reason,
        inspectorName,
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
    />
  )
}
