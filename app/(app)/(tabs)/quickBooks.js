'use client'

import React, { useState, useEffect } from 'react'
import * as Linking from 'expo-linking'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { firestore } from '@/firebaseConfig'
import { collection, setDoc, doc, getDocs } from 'firebase/firestore'
import * as AuthSession from 'expo-auth-session'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import AsyncStorage from '@react-native-async-storage/async-storage'
import useAuthStore from '@/store/useAuthStore'

const redirectUri = 'https://coastalrestorationservice.com/oauth/callback'

const discovery = {
  authorizationEndpoint: 'https://appcenter.intuit.com/connect/oauth2',
}

const QuickBooksManagementScreen = () => {
  const [activeTab, setActiveTab] = useState('customers')
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [items, setItems] = useState([])
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [loadingItems, setLoadingItems] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [isAuthLoaded, setIsAuthLoaded] = useState(false)

  // Local state for tokens
  const [accessToken, setAccessToken] = useState()
  const [refreshToken, setRefreshToken] = useState()
  const [tokenExpiresAt, setTokenExpiresAt] = useState()

  const router = useRouter()

  // Get credentials from useAuthStore
  const { clientId, clientSecret, quickBooksCompanyId } =
    useAuthStore.getState()

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId || '',
      scopes: ['com.intuit.quickbooks.accounting'],
      redirectUri,
      responseType: 'code',
      state: 'quickbooks_auth',
      prompt: 'login',
    },
    discovery
  )

  // Add redirect URL logging
  useEffect(() => {
    const subscription = Linking.addEventListener('url', event => {
      console.log('Received URL:', event.url)
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    console.log('AuthSession response:', response)
    // Rest of your code...
  }, [response, quickBooksCompanyId, clientId])

  // Function to save tokens to Firestore
  const saveTokensToFirestore = async tokens => {
    try {
      const companyRef = doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV')
      const updatedCredentials = {
        quickBooksCompanyId: quickBooksCompanyId || '',
        clientId: clientId || '',
        clientSecret: clientSecret || '',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.tokenExpiresAt,
        updatedAt: new Date().toISOString(),
      }
      await setDoc(companyRef, updatedCredentials, { merge: true })
      console.log('Tokens saved to Firestore:', updatedCredentials)
    } catch (error) {
      console.error('Error saving tokens to Firestore:', error)
      Alert.alert(
        'Error',
        'Failed to save tokens to Firestore: ' + error.message
      )
    }
  }

  // Refresh token function
  const refreshQuickBooksToken = async () => {
    if (!refreshToken) {
      console.error('No refresh token available:', { refreshToken })
      throw new Error('No refresh token available')
    }

    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId || '',
      client_secret: clientSecret || '',
    })

    const newResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    })
    const data = await newResponse.json()
    if (data.access_token) {
      setAccessToken(data.access_token)
      setRefreshToken(data.refresh_token)
      const expiresAt = Date.now() + data.expires_in * 1000
      setTokenExpiresAt(expiresAt)
      await saveTokensToFirestore({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiresAt: expiresAt,
      })
      console.log('Tokens refreshed:', {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiresAt: expiresAt,
      })
      return data.access_token
    } else {
      console.error('Failed to refresh token:', data)
      throw new Error('Failed to refresh token: ' + JSON.stringify(data))
    }
  }

  // Auth flow: using async/await for token exchange
  useEffect(() => {
    const loadAuth = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIsAuthLoaded(true)
    }
    loadAuth()

    if (!clientId || !clientSecret) {
      console.error('Missing QuickBooks credentials from store:', {
        clientId,
        clientSecret,
      })
      Alert.alert(
        'Error',
        'Missing QuickBooks credentials. Please check app configuration.'
      )
      return
    }

    if (response?.type === 'success') {
      ;(async () => {
        const { code } = response.params
        console.log('Starting token exchange with code:', code)
        const tokenUrl =
          'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
        const body = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        })
        try {
          const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
            },
            body: body.toString(),
          })
          const data = await tokenResponse.json()
          console.log('Token exchange response:', data)
          if (data.access_token) {
            setAccessToken(data.access_token)
            setRefreshToken(data.refresh_token)
            const expiresAt = Date.now() + data.expires_in * 1000
            setTokenExpiresAt(expiresAt)
            await saveTokensToFirestore({
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              tokenExpiresAt: expiresAt,
            })
            console.log('Tokens received:', {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              tokenExpiresAt: expiresAt,
            })
          } else {
            console.error('No access_token in response:', data)
            Alert.alert('Error', 'Failed to obtain access token.')
          }
        } catch (error) {
          console.error('Token exchange error:', error)
          Alert.alert('Error', 'Token exchange failed: ' + error.message)
        }
      })()
    } else if (response?.type === 'error') {
      console.error('OAuth error:', response)
      Alert.alert('Error', 'Authentication failed: ' + response.error)
    } else {
      console.log('OAuth response:', response)
    }
  }, [response, clientId, clientSecret])

  // Customers Functions
  const fetchCustomersFromFirestore = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestore, 'customers'))
      setCustomers(
        querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      )
    } catch (error) {
      console.error('Firestore fetch error:', error)
      Alert.alert('Error', 'Failed to fetch customers from Firestore.')
    }
  }

  const fetchCustomersFromQuickBooks = async () => {
    const now = Date.now()
    if (!quickBooksCompanyId || !accessToken) {
      console.error('Missing credentials:', {
        quickBooksCompanyId,
        accessToken,
      })
      Alert.alert('Error', 'Missing credentials')
      return
    }
    if (tokenExpiresAt && now > Number(tokenExpiresAt)) {
      Alert.alert(
        'Token Expired',
        'Please refresh your token.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Refresh Token',
            onPress: () => {
              promptAsync()
            },
          },
        ],
        { cancelable: true }
      )
      return
    }
    setLoadingCustomers(true)
    const url = `https://quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/query?query=${encodeURIComponent(
      'SELECT * FROM Customer STARTPOSITION 1 MAXRESULTS 100'
    )}&minorversion=4`
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    }

    try {
      let res = await fetch(url, { method: 'GET', headers })
      if (res.status === 401) {
        const newToken = await refreshQuickBooksToken()
        headers.Authorization = `Bearer ${newToken}`
        res = await fetch(url, { method: 'GET', headers })
      }
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const customersData =
        data.QueryResponse?.Customer?.map(customer => ({
          id: customer.Id,
          displayName: customer.DisplayName,
          email: customer.PrimaryEmailAddr?.Address || 'No email',
          givenName: customer.GivenName || '',
          familyName: customer.FamilyName || '',
          companyName: customer.CompanyName || '',
          phone: customer.PrimaryPhone?.FreeFormNumber || '',
          address: customer.BillAddr || {},
        })) || []
      console.log('Customer data:', customersData)
      await saveCustomersToFirestore(customersData)
      fetchCustomersFromFirestore()
      Alert.alert('Success', 'Customers synced')
    } catch (error) {
      console.error('QuickBooks fetch error:', error)
      Alert.alert('Error', error.message)
    } finally {
      setLoadingCustomers(false)
    }
  }

  const saveCustomersToFirestore = async customersData => {
    try {
      await Promise.all(
        customersData.map(customer =>
          setDoc(doc(firestore, 'customers', customer.id), customer)
        )
      )
    } catch (error) {
      console.error('Firestore save error:', error)
      Alert.alert('Error', 'Failed to save customers')
    }
  }

  const filteredCustomers = customers.filter(c =>
    [c.id, c.displayName, c.email].some(f =>
      f?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  // Items Functions
  const fetchItemsFromQB = async () => {
    const now = Date.now()
    if (!quickBooksCompanyId || !accessToken) {
      console.error('Missing credentials:', {
        quickBooksCompanyId,
        accessToken,
      })
      Alert.alert('Error', 'Missing credentials')
      return
    }
    if (tokenExpiresAt && now > Number(tokenExpiresAt)) {
      Alert.alert(
        'Token Expired',
        'Please refresh your token.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Refresh Token',
            onPress: () => {
              promptAsync()
            },
          },
        ],
        { cancelable: true }
      )
      return
    }
    setLoadingItems(true)
    const url = `https://quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/query?query=${encodeURIComponent(
      'SELECT * FROM Item STARTPOSITION 1 MAXRESULTS 100'
    )}&minorversion=4`
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    }
    try {
      let res = await fetch(url, { method: 'GET', headers })
      if (res.status === 401) {
        const newToken = await refreshQuickBooksToken()
        headers.Authorization = `Bearer ${newToken}`
        res = await fetch(url, { method: 'GET', headers })
      }
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const itemsData =
        data.QueryResponse?.Item?.map(item => ({
          id: item.Id,
          name: item.Name,
          description: item.Description || '',
          unitPrice: item.UnitPrice || 0,
          type: item.Type || '',
          qtyOnHand: item.QtyOnHand || 0,
          incomeAccount: item.IncomeAccountRef || {},
        })) || []
      console.log('Item data:', itemsData)
      await saveItemsToFirestore(itemsData)
      setItems(itemsData)
      Alert.alert('Success', 'Items synced')
    } catch (error) {
      console.error('QuickBooks fetch error:', error)
      Alert.alert('Error', error.message)
    } finally {
      setLoadingItems(false)
    }
  }

  const saveItemsToFirestore = async itemsData => {
    try {
      await Promise.all(
        itemsData.map(item => setDoc(doc(firestore, 'items', item.id), item))
      )
    } catch (error) {
      console.error('Firestore save error:', error)
      Alert.alert('Error', 'Failed to save items')
    }
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
  )

  // Options for the header menu
  const headerOptions = [
    {
      label: 'Refresh Token',
      onPress: () => {
        if (!isAuthLoaded) {
          Alert.alert('Error', 'Auth data not yet loaded. Please wait.')
          return
        }
        console.log('Refreshing token with:', quickBooksCompanyId)
        promptAsync()
      },
    },
    {
      label: 'Clear Credentials',
      onPress: () => {
        setAccessToken(undefined)
        setRefreshToken(undefined)
        setTokenExpiresAt(undefined)
        saveTokensToFirestore({
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
        })
        Alert.alert('Success', 'QuickBooks credentials cleared.')
      },
    },
  ]

  // UI Components
  const renderSegmentedControl = () => (
    <View style={styles.segmentedControl}>
      {['customers', 'items'].map(tab => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.segmentButton,
            activeTab === tab && styles.activeSegment,
          ]}
          onPress={() => setActiveTab(tab)}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === tab && styles.activeSegmentText,
            ]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderCustomersUI = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Manage Customers</Text>
      <TouchableOpacity
        onPress={fetchCustomersFromQuickBooks}
        style={styles.syncButton}
      >
        <Text style={styles.syncButtonText}>
          {loadingCustomers ? 'Syncing...' : 'Sync Customers'}
        </Text>
      </TouchableOpacity>
      <TextInput
        style={styles.searchInput}
        placeholder="Search customer by name..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <ScrollView style={styles.listContainer}>
        {filteredCustomers.map(customer => (
          <View key={customer.id} style={styles.listItem}>
            <Text style={styles.listItemText}>
              {customer.id} - {customer.displayName} ({customer.email})
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )

  const renderItemsUI = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Manage Items</Text>
      <TouchableOpacity onPress={fetchItemsFromQB} style={styles.syncButton}>
        <Text style={styles.syncButtonText}>
          {loadingItems ? 'Loading...' : 'Sync Items'}
        </Text>
      </TouchableOpacity>
      <TextInput
        style={styles.searchInput}
        placeholder="Search item by name..."
        value={itemSearchQuery}
        onChangeText={setItemSearchQuery}
      />
      <ScrollView style={styles.listContainer}>
        {filteredItems.map(item => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listItemText}>
              {item.id} - {item.name} - Price: {item.unitPrice}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )

  const renderTokensUI = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Manage Tokens</Text>
      <TouchableOpacity
        onPress={() => promptAsync()}
        style={styles.oauthButton}
      >
        <Text style={styles.buttonText}>Get Auth Token</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { margin: 5 }]}>
      <HeaderWithOptions
        title="QuickBooks Management"
        onBack={() => router.back()}
        options={headerOptions}
        showHome={false}
        onHeightChange={setHeaderHeight}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: headerHeight },
        ]}
      >
        {renderSegmentedControl()}
        {activeTab === 'customers'
          ? renderCustomersUI()
          : activeTab === 'tokens'
          ? renderTokensUI()
          : renderItemsUI()}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  scrollContainer: { alignItems: 'center', paddingBottom: 20 },
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
  activeSegment: { backgroundColor: '#3498DB' },
  segmentText: { fontSize: 16, color: '#2c3e50' },
  activeSegmentText: { color: '#FFF', fontWeight: 'bold' },
  sectionContainer: { width: '100%', marginBottom: 30 },
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
  syncButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
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
  listItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  listItemText: { fontSize: 16, color: '#2c3e50' },
  oauthButton: {
    width: '90%',
    backgroundColor: '#B9770E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
})

export default QuickBooksManagementScreen
