// useAuthStore.js
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import AsyncStorage from '@react-native-async-storage/async-storage'

const useAuthStore = create(
  persist(
    (set, get) => ({
      quickBooksCompanyId: null,
      clientId: null,
      clientSecret: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      setCredentials: async newCredentials => {
        const current = get()
        const updatedCredentials = {
          quickBooksCompanyId:
            newCredentials.quickBooksCompanyId ?? current.quickBooksCompanyId,
          clientId: newCredentials.clientId ?? current.clientId,
          clientSecret: newCredentials.clientSecret ?? current.clientSecret,
          accessToken: newCredentials.accessToken ?? current.accessToken,
          refreshToken: newCredentials.refreshToken ?? current.refreshToken,
          tokenExpiresAt:
            newCredentials.tokenExpiresAt ?? current.tokenExpiresAt,
          updatedAt: new Date().toISOString(),
        }
        set(updatedCredentials)

        // Persist to Firestore (exclude functions)
        await setDoc(
          doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV'),
          updatedCredentials,
          { merge: true }
        )
      },
      clearCredentials: async () => {
        const clearedCredentials = {
          quickBooksCompanyId: '9130351967520606', // Preserve hardcoded value
          clientId: 'BBH3sQV8BaGA4ZxmDTFSXOF94ErNGHh2Iu82TC6eogpXwMlYTe', // Preserve initial value
          clientSecret: 'J68Jzvy0X5BfcV2do84ef5dPKBeq4SQ1xcJh6NzF', // Preserve initial value
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          updatedAt: new Date().toISOString(),
        }
        set(clearedCredentials)

        await setDoc(
          doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV'),
          clearedCredentials,
          { merge: true }
        )
      },
      initializeAuth: async () => {
        const companyRef = doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV')
        const companySnap = await getDoc(companyRef)
        if (companySnap.exists()) {
          const companyData = companySnap.data()

          set(state => {
            const updatedState = {
              quickBooksCompanyId:
                companyData.quickBooksCompanyId ?? state.quickBooksCompanyId,
              clientId: companyData.clientId ?? state.clientId,
              clientSecret: companyData.clientSecret ?? state.clientSecret,
              accessToken: companyData.accessToken ?? state.accessToken,
              refreshToken: companyData.refreshToken ?? state.refreshToken,
              tokenExpiresAt:
                companyData.tokenExpiresAt ?? state.tokenExpiresAt,
            }

            return updatedState
          })
        } else {
          const defaults = {
            quickBooksCompanyId: '9130351967520606',
            clientId: 'BBH3sQV8BaGA4ZxmDTFSXOF94ErNGHh2Iu82TC6eogpXwMlYTe',
            clientSecret: 'J68Jzvy0X5BfcV2do84ef5dPKBeq4SQ1xcJh6NzF',
            accessToken: null,
            refreshToken: null,
            tokenExpiresAt: null,
            updatedAt: new Date().toISOString(),
          }
          await setDoc(companyRef, defaults, { merge: true })
          set(defaults)
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        quickBooksCompanyId: state.quickBooksCompanyId,
        clientId: state.clientId,
        clientSecret: state.clientSecret,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tokenExpiresAt: state.tokenExpiresAt,
      }),
    }
  )
)

// Initialize store data on load
useAuthStore.getState().initializeAuth()

export default useAuthStore
