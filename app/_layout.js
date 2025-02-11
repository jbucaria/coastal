import React, { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useRouter, useSegments, Slot } from 'expo-router'
import { ThemeProvider, DefaultTheme } from '@react-navigation/native'

import { auth, firestore } from '@/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { useUserStore } from '@/store/useUserStore'
import useAuthStore from '@/store/useAuthStore' // Import Zustand store

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const router = useRouter()
  const segments = useSegments()
  const { setUser, user } = useUserStore()
  const { setCredentials } = useAuthStore()

  useEffect(() => {
    if (auth.currentUser) {
      const unsub = onSnapshot(
        doc(firestore, 'users', auth.currentUser.uid),
        snapshot => {
          if (snapshot.exists()) {
            setUser({ ...auth.currentUser, ...snapshot.data() })
          }
        }
      )
      return () => unsub()
    }
  }, [auth.currentUser])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser) {
        try {
          // Fetch user profile
          const userDocRef = doc(firestore, 'users', firebaseUser.uid)
          const userDocSnap = await getDoc(userDocRef)
          const profileData = userDocSnap.exists() ? userDocSnap.data() : {}
          const userData = { ...firebaseUser, ...profileData }
          setUser(userData)

          // 🔥 Fetch QuickBooks credentials from Firestore
          const companyRef = doc(
            firestore,
            'companyInfo',
            'Vj0FigLyhZCyprQ8iGGV'
          )
          const companySnap = await getDoc(companyRef)

          if (companySnap.exists()) {
            const companyData = companySnap.data()

            // ✅ Store QuickBooks credentials in Zustand
            setCredentials({
              quickBooksCompanyId: companyData.quickBooksCompanyId,
              clientId: companyData.clientId,
              accessToken: companyData.accessToken,
            })

            console.log('QuickBooks credentials stored in Zustand')
          } else {
            console.error('Company info not found in Firestore')
          }
        } catch (error) {
          console.error(
            'Error fetching user profile or QuickBooks credentials:',
            error
          )
        }
      } else {
        setUser(null)
      }
      setProfileLoaded(true)
      if (initializing) setInitializing(false)
    })
    return unsubscribe
  }, [initializing, setUser, setCredentials])

  useEffect(() => {
    if (initializing || !profileLoaded) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!auth.currentUser && !inAuthGroup) {
      router.replace('/login')
      return
    }

    if (auth.currentUser) {
      if (!user || !user.onboarded) {
        router.replace('/onboarding')
        return
      }
      if (user.onboarded && inAuthGroup) {
        router.replace('/(tabs)')
      }
    }
  }, [initializing, profileLoaded, segments, router, user])

  if (initializing || !profileLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    )
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Slot />
    </ThemeProvider>
  )
}
