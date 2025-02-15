import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Dynamically require AsyncStorage only on the client.
// On the server, we provide a stub that does nothing.
let AsyncStorageForZustand
if (typeof window !== 'undefined') {
  AsyncStorageForZustand =
    require('@react-native-async-storage/async-storage').default
} else {
  AsyncStorageForZustand = {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  }
}

const useAuthStore = create(
  persist(
    set => ({
      quickBooksCompanyId: null,
      clientId: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null, // New field for the token's expiration timestamp

      // ✅ Set credentials after login (include tokenExpiresAt)
      setCredentials: ({
        quickBooksCompanyId,
        clientId,
        accessToken,
        refreshToken,
        tokenExpiresAt,
      }) =>
        set({
          quickBooksCompanyId,
          clientId,
          accessToken,
          refreshToken,
          tokenExpiresAt,
        }),

      // ✅ Clear credentials on logout
      clearCredentials: () =>
        set({
          quickBooksCompanyId: null,
          clientId: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
        }),
    }),
    {
      name: 'auth-storage',
      storage: {
        getItem: async key => {
          try {
            const value = await AsyncStorageForZustand.getItem(key)
            return value ? JSON.parse(value) : null // ✅ Parse JSON before returning
          } catch (error) {
            console.error(`Error getting ${key} from storage:`, error)
            return null
          }
        },
        setItem: async (key, value) => {
          try {
            await AsyncStorageForZustand.setItem(key, JSON.stringify(value)) // ✅ Stringify object before storing
          } catch (error) {
            console.error(`Error setting ${key} in storage:`, error)
          }
        },
        removeItem: async key => {
          try {
            await AsyncStorageForZustand.removeItem(key)
          } catch (error) {
            console.error(`Error removing ${key} from storage:`, error)
          }
        },
      },
    }
  )
)

export default useAuthStore
