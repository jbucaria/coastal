import { create } from 'zustand'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'

const useAuthStore = create(set => {
  const loadAuthData = async () => {
    try {
      const authDocRef = doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV')
      const authDoc = await getDoc(authDocRef)
      if (authDoc.exists()) {
        const data = authDoc.data()
        set({
          quickBooksCompanyId: data.quickBooksCompanyId || null,
          clientId: data.clientId || null,
          clientSecret: data.clientSecret || null,
          accessToken: data.accessToken || null,
          refreshToken: data.refreshToken || null,
          tokenExpiresAt: data.tokenExpiresAt || null,
        })
        console.log('Loaded auth data from Firestore:', data)
      } else {
        console.error('Company info not found in Firestore')
      }
    } catch (error) {
      console.error('Failed to load auth data from Firestore:', error)
    }
  }

  // Load auth data on store initialization
  loadAuthData()

  return {
    quickBooksCompanyId: null,
    clientId: null,
    clientSecret: null,
    accessToken: null,
    refreshToken: null,
    tokenExpiresAt: null,
    setCredentials: ({
      quickBooksCompanyId,
      clientId,
      accessToken,
      refreshToken,
      tokenExpiresAt,
    }) => {
      set({
        quickBooksCompanyId,
        clientId,
        accessToken,
        refreshToken,
        tokenExpiresAt,
      })
      // Prepare data for Firestore, excluding undefined values
      const dataToSave = {
        quickBooksCompanyId,
        clientId,
        clientSecret: useAuthStore.getState().clientSecret,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        updatedAt: new Date().toISOString(),
      }
      // Filter out undefined values
      const filteredData = Object.fromEntries(
        Object.entries(dataToSave).filter(([_, value]) => value !== undefined)
      )
      // Save to Firestore
      const authDocRef = doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV')
      setDoc(authDocRef, filteredData, { merge: true }).catch(error => {
        console.error('Failed to save auth data to Firestore:', error)
      })
    },
    clearCredentials: () => {
      set({
        quickBooksCompanyId: null,
        clientId: null,
        clientSecret: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
      })
      // Clear in Firestore
      const authDocRef = doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV')
      setDoc(
        authDocRef,
        {
          quickBooksCompanyId: null,
          clientId: null,
          clientSecret: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(error => {
        console.error('Failed to clear auth data in Firestore:', error)
      })
    },
  }
})

export default useAuthStore
