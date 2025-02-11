import { Alert } from 'react-native'
import { router } from 'expo-router'
import {
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  increment,
} from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, firestore } from '@/firebaseConfig'

// Create Ticket Function
export const createTicket = async (
  ticketData,
  resetForm,
  setIsSubmitting,
  user,
  newNote
) => {
  try {
    const docRef = await addDoc(collection(firestore, 'tickets'), {
      createdAt: new Date(),
      ...ticketData,
    })

    const docId = docRef.id
    const lastSix = docId.slice(-6)
    const ticketNumber = `CR-${lastSix}`
    await updateDoc(docRef, {
      projectId: docId,
      ticketNumber,
    })

    if (newNote.trim()) {
      await addDoc(collection(firestore, 'ticketNotes'), {
        projectId: docRef.id,
        userId: auth.currentUser.uid,
        userName: user?.displayName || auth.currentUser.email,
        message: newNote,
        timestamp: serverTimestamp(),
      })
      await updateDoc(docRef, { messageCount: increment(1) })
    }

    Alert.alert('Success', 'Ticket created successfully.')
    router.push('/(tabs)')
    resetForm()
  } catch (error) {
    console.error('Error creating ticket:', error)
    Alert.alert('Error', 'Failed to create the ticket. Please try again.')
  } finally {
    setIsSubmitting(false)
  }
}

export const handleCreateTicket = async (
  newTicket,
  selectedDate,
  startTime,
  endTime,
  resetForm,
  setIsSubmitting,
  isSubmitting,
  newNote,
  user
) => {
  if (isSubmitting) return
  setIsSubmitting(true)

  try {
    if (
      !newTicket.street ||
      !newTicket.city ||
      !newTicket.state ||
      !newTicket.zip ||
      !newTicket.customer
    ) {
      Alert.alert('Validation Error', 'Please fill out all required fields.')
      setIsSubmitting(false)
      return
    }

    const composedAddress = `${newTicket.street}${
      newTicket.apt ? ' Apt ' + newTicket.apt : ''
    }, ${newTicket.city}, ${newTicket.state} ${newTicket.zip}`

    const ticketData = {
      ...newTicket,

      address: composedAddress,
      startDate: selectedDate,
      startTime: startTime,
      endTime: endTime,
      createdAt: new Date(),
    }

    // Upload photos to Firebase before creating the ticket
    const storage = getStorage()
    const uploadPromises = newTicket.ticketPhotos.map(async uri => {
      const response = await fetch(uri)
      const blob = await response.blob()
      const fileRef = ref(
        storage,
        `ticketPhotos/${Date.now()}_${uri.split('/').pop()}`
      )
      await uploadBytes(fileRef, blob)
      return getDownloadURL(fileRef)
    })

    const photoURLs = await Promise.all(uploadPromises)
    ticketData.ticketPhotos = photoURLs // Attach the URLs of the uploaded photos

    // Call the createTicket function
    await createTicket(ticketData, resetForm, setIsSubmitting, user, newNote)
  } catch (error) {
    console.error('Error creating the ticket:', error)
    Alert.alert('Error', 'Failed to create the ticket. Please try again.')
  } finally {
    setIsSubmitting(false)
  }
}
