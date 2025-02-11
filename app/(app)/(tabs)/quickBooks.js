import React, { useState, useEffect } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  StyleSheet,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { firestore } from '@/firebaseConfig'
import { collection, setDoc, doc, getDocs } from 'firebase/firestore'
import * as AuthSession from 'expo-auth-session'
import useAuthStore from '@/store/useAuthStore'

const redirectUri = 'https://coastalrestorationservice.com/oauth/callback'
const discovery = {
  authorizationEndpoint: 'https://appcenter.intuit.com/connect/oauth2',
}

const QuickBooksManagementScreen = () => {
  // Active tab state: "customers" or "items"
  const [activeTab, setActiveTab] = useState('customers')

  // State for customers
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingCustomers, setLoadingCustomers] = useState(false)

  // State for items
  const [items, setItems] = useState([])
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [loadingItems, setLoadingItems] = useState(false)

  // Get QuickBooks auth values
  const { quickBooksCompanyId, clientId, accessToken } = useAuthStore()

  // OAuth request for token management
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: ['com.intuit.quickbooks.accounting'],
      redirectUri,
      responseType: 'code',
      state: 'quickbooks_auth',
    },
    discovery
  )

  useEffect(() => {
    if (response?.type === 'success') {
      console.log('OAuth process completed successfully.')
    }
  }, [response])

  // --------------------------
  // Customers Functions
  // --------------------------
  const fetchCustomersFromFirestore = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestore, 'customers'))
      const customersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      setCustomers(customersData)
    } catch (error) {
      console.error('Error fetching customers from Firestore:', error)
      Alert.alert('Error', 'Failed to fetch customers from Firestore.')
    }
  }

  const fetchCustomersFromQuickBooks = async () => {
    if (!quickBooksCompanyId || !accessToken) {
      Alert.alert('Error', 'QuickBooks credentials are missing.')
      return
    }
    setLoadingCustomers(true)
    const url = `https://quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/query?query=${encodeURIComponent(
      'SELECT * FROM Customer'
    )}`
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
    try {
      const response = await fetch(url, { method: 'GET', headers })
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP Error ${response.status}: ${errorText}`)
        throw new Error(`HTTP Error ${response.status}: ${errorText}`)
      }
      const data = await response.json()
      if (!data.QueryResponse || !data.QueryResponse.Customer) {
        console.error('Unexpected response structure:', data)
        throw new Error(
          'Unexpected response structure: ' + JSON.stringify(data, null, 2)
        )
      }
      const customersData = data.QueryResponse.Customer.map(customer => ({
        id: customer.Id,
        displayName: customer.DisplayName,
        email: customer.PrimaryEmailAddr
          ? customer.PrimaryEmailAddr.Address
          : 'No email',
      }))
      await saveCustomersToFirestore(customersData)
      Alert.alert('Success', 'Customers synced successfully.')
      fetchCustomersFromFirestore()
    } catch (error) {
      console.error('Error fetching QuickBooks customers:', error)
      Alert.alert(
        'Error',
        error.message || 'Failed to fetch customers from QuickBooks.'
      )
    } finally {
      setLoadingCustomers(false)
    }
  }

  const saveCustomersToFirestore = async customersData => {
    try {
      const batch = customersData.map(customer =>
        setDoc(doc(firestore, 'customers', customer.id), customer)
      )
      await Promise.all(batch)
    } catch (error) {
      console.error('Error saving customers to Firestore:', error)
      Alert.alert('Error', 'Failed to save customers to database.')
    }
  }

  // Filter customers by search query
  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase()
    return (
      customer.id.toLowerCase().includes(query) ||
      (customer.displayName &&
        customer.displayName.toLowerCase().includes(query)) ||
      (customer.email && customer.email.toLowerCase().includes(query))
    )
  })

  // --------------------------
  // Items Functions
  // --------------------------
  const fetchItemsFromQB = async () => {
    if (!quickBooksCompanyId || !accessToken) {
      Alert.alert('Error', 'Missing QuickBooks credentials.')
      return
    }
    setLoadingItems(true)
    const query = encodeURIComponent('SELECT * FROM Item')
    // You can adjust minorversion and URL (sandbox vs production) as needed.
    const url = `https://quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/query?query=${query}&minorversion=4`
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'text/plain',
    }
    try {
      const response = await fetch(url, { method: 'GET', headers })
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP Error ${response.status}: ${errorText}`)
        throw new Error(`HTTP Error ${response.status}: ${errorText}`)
      }
      const data = await response.json()
      if (!data.QueryResponse || !data.QueryResponse.Item) {
        console.error('Unexpected response structure:', data)
        throw new Error(
          'Unexpected response structure: ' + JSON.stringify(data, null, 2)
        )
      }
      const itemsData = data.QueryResponse.Item.map(item => ({
        id: item.Id,
        name: item.Name,
        description: item.Description || '',
        unitPrice: item.UnitPrice,
      }))
      await saveItemsToFirestore(itemsData)
      setItems(itemsData)
      Alert.alert('Success', 'Items retrieved and saved successfully.')
    } catch (error) {
      console.error('Error fetching items from QB:', error)
      Alert.alert(
        'Error',
        error.message || 'Failed to retrieve items from QuickBooks.'
      )
    } finally {
      setLoadingItems(false)
    }
  }

  const saveItemsToFirestore = async itemsData => {
    try {
      const batch = itemsData.map(item =>
        setDoc(doc(firestore, 'items', item.id), item)
      )
      await Promise.all(batch)
    } catch (error) {
      console.error('Error saving items to Firestore:', error)
      Alert.alert('Error', 'Failed to save items to database.')
    }
  }

  // --------------------------
  // UI: Segmented Control
  // --------------------------
  const renderSegmentedControl = () => {
    return (
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === 'customers' && styles.activeSegment,
          ]}
          onPress={() => setActiveTab('customers')}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'customers' && styles.activeSegmentText,
            ]}
          >
            Customers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === 'items' && styles.activeSegment,
          ]}
          onPress={() => setActiveTab('items')}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'items' && styles.activeSegmentText,
            ]}
          >
            Items
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  // --------------------------
  // Render: Customers Management UI
  // --------------------------
  const renderCustomersUI = () => {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Manage Customers</Text>
        <TouchableOpacity
          onPress={fetchCustomersFromQuickBooks}
          style={styles.syncButton}
        >
          <Text style={styles.syncButtonText}>
            {loadingCustomers ? 'Syncing Customers...' : 'Sync Customers'}
          </Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search customer by name..."
          value={searchQuery}
          onChangeText={text => {
            setSearchQuery(text)
          }}
        />
        <ScrollView style={styles.listContainer}>
          {filteredCustomers.map(customer => (
            <View key={customer.id} style={styles.listItem}>
              <Text style={styles.listItemText}>
                {customer.id} - {customer.displayName} ({customer.email})
              </Text>
              {/* You can add edit and delete buttons here */}
            </View>
          ))}
        </ScrollView>
      </View>
    )
  }

  // --------------------------
  // Render: Items Management UI
  // --------------------------
  const renderItemsUI = () => {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Manage Items</Text>
        <TouchableOpacity onPress={fetchItemsFromQB} style={styles.syncButton}>
          <Text style={styles.syncButtonText}>
            {loadingItems ? 'Loading Items...' : 'Sync Items'}
          </Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search item by name..."
          value={itemSearchQuery}
          onChangeText={text => setItemSearchQuery(text)}
        />
        <ScrollView style={styles.listContainer}>
          {items
            .filter(item =>
              item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
            )
            .map(item => (
              <View key={item.id} style={styles.listItem}>
                <Text style={styles.listItemText}>
                  {item.id} - {item.name} - Price: {item.unitPrice}
                </Text>
                {/* You can add edit and delete buttons here */}
              </View>
            ))}
        </ScrollView>
      </View>
    )
  }

  // --------------------------
  // Render
  // --------------------------
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>QuickBooks Management</Text>
        {renderSegmentedControl()}
        {activeTab === 'customers' ? renderCustomersUI() : renderItemsUI()}
        {/* Token Management Section */}
        <Text style={styles.title}>Token Management</Text>
        <View style={styles.oauthContainer}>
          <TouchableOpacity
            onPress={() => promptAsync()}
            style={styles.oauthButton}
          >
            <Text style={styles.buttonText}>Get Auth Token</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default QuickBooksManagementScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
  },
  activeSegment: {
    backgroundColor: '#3498DB',
  },
  segmentText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  activeSegmentText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  sectionContainer: {
    width: '100%',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2C3E50',
  },
  syncButton: {
    backgroundColor: '#27AE60',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: 'white',
  },
  listContainer: {
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  listItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listItemText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  oauthContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  oauthButton: {
    width: '90%',
    backgroundColor: '#B9770E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
})
