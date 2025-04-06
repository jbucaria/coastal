'use client'

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  View,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native'
import { useRouter, useSegments, Slot } from 'expo-router'
import { ThemeProvider, DefaultTheme } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { auth, firestore } from '@/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { useUserStore } from '@/store/useUserStore'
import useAuthStore from '@/store/useAuthStore'
import * as NavigationBar from 'expo-navigation-bar'
import 'react-native-get-random-values'

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const router = useRouter()
  const segments = useSegments()
  const { setUser, user } = useUserStore()
  const { setCredentials } = useAuthStore()

  // Set status bar style and translucent behavior
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true)
      StatusBar.setBackgroundColor('transparent')
      StatusBar.setBarStyle('dark-content')
    } else if (Platform.OS === 'ios') {
      StatusBar.setBarStyle('dark-content')
    }
  }, [])

  // Configure the Android navigation bar to keep icons dark
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync('dark')
      NavigationBar.setBackgroundColorAsync('#ffffff')
    }
  }, [])

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
          const userDocRef = doc(firestore, 'users', firebaseUser.uid)
          const userDocSnap = await getDoc(userDocRef)
          const profileData = userDocSnap.exists() ? userDocSnap.data() : {}
          const userData = { ...firebaseUser, ...profileData }
          setUser(userData)

          const companyRef = doc(
            firestore,
            'companyInfo',
            'Vj0FigLyhZCyprQ8iGGV'
          )
          const companySnap = await getDoc(companyRef)

          if (companySnap.exists()) {
            const companyData = companySnap.data()
            setCredentials({
              quickBooksCompanyId: companyData.quickBooksCompanyId,
              clientId: companyData.clientId,
              accessToken: companyData.accessToken,
              tokenExpiresAt: companyData.tokenExpiresAt,
            })
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
        router.replace('/(app)')
      }
    }
  }, [initializing, profileLoaded, segments, router, user])

  if (initializing || !profileLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <View style={styles.fullScreenContainer}>
          <Slot />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
})
