// BuilderModal.js
import React, { useState, useEffect } from 'react'
import {
  View,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { collection, addDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { createCustomerInQuickBooks } from '@/utils/quickbooksApi'
import useAuthStore from '@/store/useAuthStore'

const BuilderModal = ({ visible, onClose, onSelectCustomer, allCustomers }) => {
  const { accessToken, quickBooksCompanyId } = useAuthStore()

  const [isAddingNew, setIsAddingNew] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])

  // For new customer mode
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyAddress, setNewCompanyAddress] = useState('')
  const [loading, setLoading] = useState(false)

  // Filter suggestions from allCustomers based on searchQuery
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      return
    }
    const queryLower = searchQuery.toLowerCase()
    const filtered = allCustomers.filter(
      cust =>
        cust.displayName && cust.displayName.toLowerCase().includes(queryLower)
    )
    setSuggestions(filtered)
  }, [searchQuery, allCustomers])

  // Handler for selecting an existing customer
  const handleSelectCustomer = customer => {
    onSelectCustomer(customer)
    onClose()
  }

  // Handler for saving a new customer
  const handleSaveNewCustomer = async () => {
    // if (!newName.trim() || !newEmail.trim()) {
    //   alert('Name and Email are required.')
    //   return
    // }
    setLoading(true)
    try {
      const newCustomer = {
        displayName: newName || '',
        email: newEmail || '',
        phone: newPhone || '',
        companyName: newCompanyName || '',
        companyAddress: newCompanyAddress || '',
      }

      // Send the new customer to QuickBooks using your helper function.
      // This function should use the access token and return the new QuickBooks customer id.

      const qbCustomerId = await createCustomerInQuickBooks(
        newCustomer,
        quickBooksCompanyId,
        accessToken
      )

      // Add the QuickBooks customer id to the new customer object.
      newCustomer.id = qbCustomerId

      // Save the new customer to Firestore.
      await addDoc(collection(firestore, 'customers'), newCustomer)

      // Pass the new customer back to the parent.
      onSelectCustomer(newCustomer)

      // Reset the form fields.
      setNewName('')
      setNewEmail('')
      setNewPhone('')
      setNewCompanyName('')
      setNewCompanyAddress('')
      setIsAddingNew(false)
      onClose()
    } catch (error) {
      console.error('Error saving new customer:', error)
      alert('Failed to save new customer.')
    } finally {
      setLoading(false)
    }
  }

  const renderSearchMode = () => (
    <View>
      <TextInput
        style={styles.modalInput}
        placeholder="Search builder by name..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <ScrollView style={styles.modalList}>
        {suggestions.map(cust => (
          <TouchableOpacity
            key={cust.id}
            onPress={() => handleSelectCustomer(cust)}
            style={styles.modalItem}
          >
            <Text style={styles.modalItemText}>{cust.displayName}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity onPress={() => setIsAddingNew(true)}>
        <Text style={styles.addNewText}>+ Add New Customer</Text>
      </TouchableOpacity>
    </View>
  )

  const renderAddNewMode = () => (
    <View>
      <TextInput
        style={styles.modalInput}
        placeholder="Name"
        value={newName}
        onChangeText={setNewName}
      />
      <TextInput
        style={styles.modalInput}
        placeholder="Email"
        value={newEmail}
        onChangeText={setNewEmail}
      />
      <TextInput
        style={styles.modalInput}
        placeholder="Phone Number"
        value={newPhone}
        onChangeText={setNewPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.modalInput}
        placeholder="Company Name"
        value={newCompanyName}
        onChangeText={setNewCompanyName}
      />
      <TextInput
        style={styles.modalInput}
        placeholder="Company Address"
        value={newCompanyAddress}
        onChangeText={setNewCompanyAddress}
      />
      {loading ? (
        <ActivityIndicator size="small" color="#2980b9" />
      ) : (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveNewCustomer}
        >
          <Text style={styles.saveButtonText}>Save Customer</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => setIsAddingNew(false)}>
        <Text style={styles.modalClose}>Back to Search</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Builder</Text>
          {isAddingNew ? renderAddNewMode() : renderSearchMode()}
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default BuilderModal

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  modalInput: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  modalList: {
    maxHeight: 200,
    marginBottom: 10,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalItemText: {
    fontSize: 16,
    color: '#555',
  },
  addNewText: {
    fontSize: 16,
    color: '#2980b9',
    textAlign: 'center',
    marginVertical: 10,
  },
  saveButton: {
    backgroundColor: '#2980b9',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalClose: {
    color: '#2980b9',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
  },
})
