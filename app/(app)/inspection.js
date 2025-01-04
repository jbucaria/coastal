// App.js

import React, { useState } from 'react'
import {
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native'
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

  const handleGeneratePdfLocal = async () => {
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
  }

  return (
    <SafeAreaView className="flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
